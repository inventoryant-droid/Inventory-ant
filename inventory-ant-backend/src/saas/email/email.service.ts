import { Injectable, Inject } from '@nestjs/common';
import { EmailProvider } from './email-provider.interface';
import { EmailTemplateEngine } from './email-template.engine';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class EmailService {
  constructor(
    @Inject('EmailProvider') private readonly provider: any,
    private readonly templateEngine: EmailTemplateEngine,
    private readonly prisma: PrismaService,
  ) {}

  private async sendMail(to: string, subject: string, html: string) {
    try {
      await this.provider.send({ to, subject, html });

      // Log success audit
      await this.prisma.auditEvent.create({
        data: {
          userId: null,
          action: 'Email Sent',
          details: `Email sent successfully to ${to} (Subject: ${subject})`,
          performedBy: 'system',
          timestamp: new Date(),
        },
      });
    } catch (error) {
      // Log failure audit
      await this.prisma.auditEvent.create({
        data: {
          userId: null,
          action: 'Email Failed',
          details: `Email delivery failed to ${to} (Subject: ${subject}). Error: ${error.message}`,
          performedBy: 'system',
          timestamp: new Date(),
        },
      });
      throw error;
    }
  }

  async sendWelcome(to: string, name: string) {
    const html = this.templateEngine.generateWelcome(name);
    await this.sendMail(to, '🐜 Welcome to Inventory Ant!', html);
  }

  async sendPaymentSuccess(to: string, orderId: string, amount: number, planName: string) {
    const html = this.templateEngine.generatePaymentSuccess(orderId, amount, planName);
    await this.sendMail(to, '💳 Payment Successful – Inventory Ant', html);
  }

  async sendPaymentFailed(to: string, orderId: string, reason: string) {
    const html = this.templateEngine.generatePaymentFailed(orderId, reason);
    await this.sendMail(to, '❌ Payment Failed – Action Required', html);
  }

  async sendInvoice(to: string, invoiceNumber: string, amount: number, tax: number, total: number) {
    const html = this.templateEngine.generateInvoice(invoiceNumber, amount, tax, total);
    await this.sendMail(to, `🧾 Invoice Receipt ${invoiceNumber} – Inventory Ant`, html);
  }

  async sendSubscriptionActivated(to: string, planName: string, expiryDate: Date) {
    const html = this.templateEngine.generateSubscriptionActivated(planName, expiryDate);
    await this.sendMail(to, '🚀 Subscription Plan Activated – Inventory Ant', html);
  }

  async sendSubscriptionCancelled(to: string, planName: string, accessEndsAt: Date) {
    const html = this.templateEngine.generateSubscriptionCancelled(planName, accessEndsAt);
    await this.sendMail(to, 'Subscription Plan Cancelled', html);
  }

  async sendTrialEnding(to: string, planName: string, endDate: Date) {
    const html = this.templateEngine.generateTrialEnding(planName, endDate);
    await this.sendMail(to, '⏳ Plan Trial Period Expiring Soon!', html);
  }

  async sendRenewalReminder(to: string, planName: string, renewalDate: Date, amount: number) {
    const html = this.templateEngine.generateRenewalReminder(planName, renewalDate, amount);
    await this.sendMail(to, '⏰ Plan Renewal Reminder', html);
  }
}
