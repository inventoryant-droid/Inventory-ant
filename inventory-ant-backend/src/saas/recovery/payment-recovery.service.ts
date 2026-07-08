import { Injectable, Inject, Logger } from '@nestjs/common';
import { PaymentRepository } from '../../payment/payment.repository';
import { SaasConfigService } from '../config/saas-config.service';
import { SubscriptionLifecycleService } from '../../subscription/subscription-lifecycle.service';
import { PlanService } from '../../subscription/plan.service';
import { PAYMENT_STATUS } from '../../payment/payment.constants';

@Injectable()
export class PaymentRecoveryService {
  private readonly logger = new Logger(PaymentRecoveryService.name);

  constructor(
    private readonly repository: PaymentRepository,
    @Inject('PaymentProvider') private readonly provider: any,
    private readonly config: SaasConfigService,
    private readonly lifecycleService: SubscriptionLifecycleService,
    private readonly planService: PlanService,
  ) {}

  // Part 2: Expire unpaid orders older than 30 minutes
  async expirePendingOrders(): Promise<void> {
    const timeoutThreshold = Date.now() - this.config.paymentTimeoutMs;

    // Find legacy pending payments older than the timeout
    const pendingPayments = await this.repository.prisma.payment.findMany({
      where: {
        status: 'pending',
        timestamp: { lte: timeoutThreshold },
      },
    });

    for (const payment of pendingPayments) {
      try {
        await this.repository.updatePayment(payment.id, {
          status: 'failed',
        });

        await this.repository.createAuditEvent({
          userId: null,
          action: 'Payment Expired',
          details: `Razorpay Order ${payment.id} expired after timeout of ${this.config.paymentTimeoutMs / 60000} minutes`,
          performedBy: 'system',
        });

        this.logger.log(`Expired pending payment: ${payment.id}`);
      } catch (error) {
        this.logger.error(`Failed to expire payment ${payment.id}. Error: ${error.message}`);
      }
    }
  }

  // Part 1: Interrupted Payment Recovery
  async recoverInterruptedPayments(): Promise<void> {
    const pendingPayments = await this.repository.prisma.payment.findMany({
      where: {
        status: { in: ['pending', 'authorized'] },
      },
    });

    for (const payment of pendingPayments) {
      try {
        // Query Razorpay payments associated with this order ID (payment.id stores the Order ID)
        const orderId = payment.id;
        const pspPayments = await this.provider.razorpay.orders.fetchPayments(orderId);
        
        if (pspPayments && pspPayments.items && pspPayments.items.length > 0) {
          // Find the successful transaction if any
          const successfulTx = pspPayments.items.find(
            (p: any) => p.status === 'captured' || p.status === 'confirmed',
          );

          if (successfulTx) {
            this.logger.log(`Recovering successful payment for order: ${orderId}`);
            
            // Re-run the completion block (same as webhook captured logic)
            const plan = await this.planService.getPlanBySlug(payment.plan);
            if (!plan) continue;

            const owner = await this.repository.prisma.user.findFirst({
              where: { email: payment.userId },
            });
            if (!owner) continue;

            // 1. Update Payment status
            await this.repository.updatePayment(payment.id, {
              status: 'success',
            });

            // 2. Trigger subscription activation
            const activeSub = await this.lifecycleService.changePlan(
              owner.id,
              plan.slug,
              'monthly', // fallback default
            );

            // 3. Generate Invoice
            const invoiceNumber = `INV-REC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            const gstRate = 0.18;
            const tax = payment.amount * (gstRate / (1 + gstRate));
            const baseAmount = payment.amount - tax;

            const invoice = await this.repository.createInvoice({
              userId: owner.id,
              amount: baseAmount,
              tax,
              total: payment.amount,
              status: 'paid',
              subscriptionId: activeSub.id,
              paymentId: payment.id,
              invoiceNumber,
            });

            await this.repository.updatePayment(payment.id, {
              invoiceId: invoice.id,
            });

            // 4. Auditing
            await this.repository.createAuditEvent({
              userId: owner.id,
              action: 'Payment Recovery',
              details: `Interrupted payment recovered for Order: ${orderId} (Transaction ID: ${successfulTx.id})`,
              performedBy: 'system',
            });
          }
        }
      } catch (error) {
        this.logger.error(`Error recovering payment ${payment.id}: ${error.message}`);
      }
    }
  }
}
