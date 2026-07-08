import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Payment, Invoice, PaymentWebhookLog, AuditEvent } from '@prisma/client';

@Injectable()
export class PaymentRepository {
  constructor(public readonly prisma: PrismaService) {}

  async createPayment(data: {
    id: string;
    userId: string;
    businessName: string;
    amount: number;
    plan: string;
    status: string;
    invoiceId: string;
  }): Promise<Payment> {
    return this.prisma.payment.create({
      data: {
        id: data.id,
        userId: data.userId,
        businessName: data.businessName,
        amount: data.amount,
        plan: data.plan,
        status: data.status,
        timestamp: Date.now(),
        invoiceId: data.invoiceId,
      },
    });
  }

  async findPaymentById(id: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { id },
      include: { invoice: true },
    });
  }

  async updatePayment(id: string, data: any): Promise<Payment> {
    return this.prisma.payment.update({
      where: { id },
      data,
    });
  }

  async createInvoice(data: {
    userId: string;
    amount: number;
    tax: number;
    total: number;
    status: string;
    subscriptionId: string;
    paymentId: string;
    invoiceNumber: string;
  }): Promise<Invoice> {
    return this.prisma.invoice.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        tax: data.tax,
        total: data.total,
        status: data.status,
        subscriptionId: data.subscriptionId,
        paymentId: data.paymentId,
        invoiceNumber: data.invoiceNumber,
      },
    });
  }

  async createWebhookLog(data: {
    gateway: string;
    gatewayEventId: string;
    eventType: string;
    payload: any;
    signature: string;
    verified: boolean;
    status: string;
    error?: string;
  }): Promise<PaymentWebhookLog> {
    return this.prisma.paymentWebhookLog.create({
      data: {
        gateway: data.gateway,
        gatewayEventId: data.gatewayEventId,
        eventType: data.eventType,
        payload: data.payload,
        signature: data.signature,
        verified: data.verified,
        status: data.status,
        error: data.error || null,
        processedAt: new Date(),
      },
    });
  }

  async findWebhookLogByEventId(gatewayEventId: string): Promise<PaymentWebhookLog | null> {
    return this.prisma.paymentWebhookLog.findUnique({
      where: { gatewayEventId },
    });
  }

  async createAuditEvent(data: {
    userId: string | null;
    action: string;
    details: string | null;
    performedBy: string;
  }): Promise<AuditEvent> {
    return this.prisma.auditEvent.create({
      data: {
        userId: data.userId,
        action: data.action,
        details: data.details,
        performedBy: data.performedBy,
        timestamp: new Date(),
      },
    });
  }
}
