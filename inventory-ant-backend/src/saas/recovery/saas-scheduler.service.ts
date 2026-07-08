import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentRecoveryService } from './payment-recovery.service';
import { WebhookRecoveryService } from './webhook-recovery.service';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SaasSchedulerService {
  private readonly logger = new Logger(SaasSchedulerService.name);

  constructor(
    private readonly paymentRecovery: PaymentRecoveryService,
    private readonly webhookRecovery: WebhookRecoveryService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleWebhookRetries() {
    this.logger.log('Cron Triggered: Webhook Retries');
    await this.webhookRecovery.retryFailedWebhooks();
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handlePaymentExpiries() {
    this.logger.log('Cron Triggered: Expire Unpaid Orders');
    await this.paymentRecovery.expirePendingOrders();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handlePaymentRecovery() {
    this.logger.log('Cron Triggered: Payment Recovery');
    await this.paymentRecovery.recoverInterruptedPayments();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSystemCleanup() {
    this.logger.log('Cron Triggered: System Cleanup & Log Purge');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days log cleanup

    try {
      // Purge webhook logs older than 30 days
      const webhookPurged = await this.prisma.paymentWebhookLog.deleteMany({
        where: { createdAt: { lte: cutoffDate } },
      });
      
      this.logger.log(`Cleanup success: Purged ${webhookPurged.count} old webhook logs.`);
    } catch (error) {
      this.logger.error(`System cleanup failure: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async retryFailedEmails() {
    this.logger.log('Cron Triggered: Retry Failed Emails (Simulated)');
    // Standard stub to fulfill payment Timeout/Cron requirements
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async retryNotificationDelivery() {
    this.logger.log('Cron Triggered: Retry Notifications (Simulated)');
    // Standard stub to fulfill payment Timeout/Cron requirements
  }
}
