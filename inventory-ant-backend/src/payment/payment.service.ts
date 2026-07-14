import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from './payment.repository';
import { PaymentProvider } from './providers/payment-provider.interface';
import { PriceCalculationService } from '../subscription/price-calculation.service';
import { SubscriptionLifecycleService } from '../subscription/subscription-lifecycle.service';
import { PlanService } from '../subscription/plan.service';
import { CreatePaymentOrderDto } from './payment.dto';
import { PAYMENT_STATUS } from './payment.constants';
import { EmailService } from '../saas/email/email.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly repository: PaymentRepository,
    @Inject('PaymentProvider') private readonly provider: any,
    private readonly priceService: PriceCalculationService,
    private readonly planService: PlanService,
    private readonly lifecycleService: SubscriptionLifecycleService,
    private readonly emailService: EmailService,
  ) {}

  async createOrder(userId: string, dto: CreatePaymentOrderDto) {
    const plan = await this.planService.getPlanById(dto.planId);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const owner = await this.repository.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!owner) {
      throw new NotFoundException('Owner account not found');
    }

    const businessName = owner.businessName || 'Warehouse';
    const ownerEmail = owner.email;

    // 1. Calculate pricing breakdown (base, discount, tax, finalAmount)
    const pricing = await this.priceService.calculatePricing(
      dto.planId,
      dto.billingCycle,
      dto.couponCode,
    );

    const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 10)}`;
    const mockOrderId = `order_mock_${Math.random().toString(36).substring(2, 10)}`;
    const amountInMinor = Math.round(pricing.finalAmount * 100);

    // 2. Save order record in Payment table with success status immediately (Razorpay bypassed)
    const updatedPayment = await this.repository.createPayment({
      id: mockOrderId,
      userId: ownerEmail,
      businessName,
      amount: pricing.finalAmount,
      plan: plan.slug,
      status: 'success',
      invoiceId: `INV_${mockPaymentId}`,
    });

    // 3. Trigger subscription change/activation
    const activeSub = await this.lifecycleService.changePlan(
      owner.id,
      plan.slug,
      dto.billingCycle || 'monthly',
    );

    // 4. Generate Invoice
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const gstRate = 0.18;
    const tax = pricing.finalAmount * (gstRate / (1 + gstRate));
    const baseAmount = pricing.finalAmount - tax;

    const invoice = await this.repository.createInvoice({
      userId: owner.id,
      amount: baseAmount,
      tax,
      total: pricing.finalAmount,
      status: 'paid',
      subscriptionId: activeSub.id,
      paymentId: updatedPayment.id,
      invoiceNumber,
    });

    // Link Invoice back to Payment
    await this.repository.updatePayment(updatedPayment.id, {
      invoiceId: invoice.id,
    });

    // 5. Log AuditEvents
    await this.repository.createAuditEvent({
      userId: owner.id,
      action: 'Payment Success',
      details: `Payment successful (Mock ID: ${mockPaymentId}) for plan ${plan.name} (Razorpay bypassed)`,
      performedBy: owner.email,
    });

    await this.repository.createAuditEvent({
      userId: owner.id,
      action: 'Subscription Activation',
      details: `Subscription activated for plan ${plan.name} (Sub ID: ${activeSub.id})`,
      performedBy: owner.email,
    });

    // 6. Send emails!
    try {
      await this.emailService.sendPaymentSuccess(ownerEmail, mockOrderId, pricing.finalAmount, plan.name);
      await this.emailService.sendSubscriptionActivated(ownerEmail, plan.name, activeSub.expiryDate);
      await this.emailService.sendInvoice(ownerEmail, invoiceNumber, baseAmount, tax, pricing.finalAmount);
    } catch (mailErr) {
      console.error('Failed to send activation emails:', mailErr);
    }

    return {
      orderId: mockOrderId,
      currency: pricing.currency || 'INR',
      amount: amountInMinor,
      keyId: 'mock_key_id',
      alreadyCaptured: true, // Tell frontend to bypass Razorpay Modal
    };
  }

  async verifyWebhookSignature(payloadRaw: string, signature: string): Promise<boolean> {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret';
    return this.provider.verifySignature(payloadRaw, signature, secret);
  }

  async processWebhookEvent(body: any) {
    const eventType = body.event;
    const gatewayEventId = body.id;

    // Idempotency: Check if webhook log was already processed successfully
    const existingLog = await this.repository.findWebhookLogByEventId(gatewayEventId);
    if (existingLog && existingLog.status === 'processed') {
      await this.repository.createAuditEvent({
        userId: null,
        action: 'Webhook Ignored',
        details: `Duplicate webhook delivery detected: ${gatewayEventId}`,
        performedBy: 'system',
      });
      return { success: true, message: 'Webhook already processed' };
    }

    const payload = body.payload;

    try {
      if (eventType === 'payment.authorized') {
        const paymentEntity = payload.payment.entity;
        const orderId = paymentEntity.order_id;
        const paymentRecord = await this.repository.findPaymentById(orderId);
        if (paymentRecord && paymentRecord.status === 'pending') {
          await this.repository.updatePayment(paymentRecord.id, {
            status: 'authorized',
          });
        }
      } else if (eventType === 'payment.captured') {
        const paymentEntity = payload.payment.entity;
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;

        const paymentRecord = await this.repository.findPaymentById(orderId);
        if (!paymentRecord) {
          throw new NotFoundException(`Payment record not found for order reference: ${orderId}`);
        }

        if (paymentRecord.status === 'success') {
          return { success: true };
        }

        const notes = paymentEntity.notes || {};
        const userId = notes.userId;
        const planId = notes.planId;
        const billingCycle = notes.billingCycle || 'monthly';

        // Retrieve user details from owner database using notes ID or resolve from email
        const owner = await this.repository.prisma.user.findFirst({
          where: { OR: [{ id: userId }, { email: paymentRecord.userId }] },
        });

        if (!owner) {
          throw new NotFoundException(`Owner account not found for payment`);
        }

        const plan = await this.planService.getPlanById(planId);
        if (!plan) {
          throw new NotFoundException(`Plan with ID ${planId} not found`);
        }

        // 1. Update Payment status to SUCCESS
        const updatedPayment = await this.repository.updatePayment(paymentRecord.id, {
          status: 'success',
        });

        // 2. Trigger subscription change/activation
        const activeSub = await this.lifecycleService.changePlan(
          owner.id,
          plan.slug,
          billingCycle,
        );

        // 3. Generate Invoice
        const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const gstRate = 0.18;
        const tax = paymentRecord.amount * (gstRate / (1 + gstRate));
        const baseAmount = paymentRecord.amount - tax;

        const invoice = await this.repository.createInvoice({
          userId: owner.id,
          amount: baseAmount,
          tax,
          total: paymentRecord.amount,
          status: 'paid',
          subscriptionId: activeSub.id,
          paymentId: updatedPayment.id,
          invoiceNumber,
        });

        // Link Invoice back to Payment
        await this.repository.updatePayment(paymentRecord.id, {
          invoiceId: invoice.id,
        });

        // 4. Log AuditEvents
        await this.repository.createAuditEvent({
          userId: owner.id,
          action: 'Payment Success',
          details: `Payment successful (ID: ${paymentId}) for plan ${plan.name}`,
          performedBy: owner.email,
        });

        await this.repository.createAuditEvent({
          userId: owner.id,
          action: 'Subscription Activation',
          details: `Subscription activated for plan ${plan.name} (Sub ID: ${activeSub.id})`,
          performedBy: owner.email,
        });
      } else if (eventType === 'payment.failed') {
        const paymentEntity = payload.payment.entity;
        const orderId = paymentEntity.order_id;
        const paymentRecord = await this.repository.findPaymentById(orderId);
        if (paymentRecord) {
          await this.repository.updatePayment(paymentRecord.id, {
            status: 'failed',
          });

          await this.repository.createAuditEvent({
            userId: null,
            action: 'Payment Failure',
            details: `Razorpay payment failed for order: ${orderId}`,
            performedBy: paymentRecord.userId,
          });
        }
      } else if (eventType === 'refund.processed') {
        const paymentEntity = payload.payment.entity;
        const paymentId = paymentEntity.payment_id;
        const paymentRecord = await this.repository.findPaymentById(paymentId);
        if (paymentRecord) {
          await this.repository.updatePayment(paymentRecord.id, {
            status: 'refunded',
          });

          await this.repository.createAuditEvent({
            userId: null,
            action: 'Refund',
            details: `Payment refund processed for Transaction: ${paymentId}`,
            performedBy: 'system',
          });
        }
      }

      // Log successful webhook event delivery
      await this.repository.createWebhookLog({
        gateway: 'razorpay',
        gatewayEventId,
        eventType,
        payload: body,
        signature: 'verified',
        verified: true,
        status: 'processed',
      });

      return { success: true };
    } catch (error) {
      console.error('Webhook processing failure:', error);

      await this.repository.createWebhookLog({
        gateway: 'razorpay',
        gatewayEventId,
        eventType,
        payload: body,
        signature: 'verified',
        verified: true,
        status: 'failed',
        error: error.message,
      });

      throw error;
    }
  }
}
