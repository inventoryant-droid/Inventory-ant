import { Injectable, Logger } from '@nestjs/common';
import { PaymentRepository } from '../../payment/payment.repository';
import { PaymentService } from '../../payment/payment.service';
import { SaasConfigService } from '../config/saas-config.service';

@Injectable()
export class WebhookRecoveryService {
  private readonly logger = new Logger(WebhookRecoveryService.name);

  constructor(
    private readonly repository: PaymentRepository,
    private readonly paymentService: PaymentService,
    private readonly config: SaasConfigService,
  ) {}

  async retryFailedWebhooks(): Promise<void> {
    const failedLogs = await this.repository.prisma.paymentWebhookLog.findMany({
      where: {
        status: 'failed',
        retryCount: { lt: this.config.maxWebhookRetries },
      },
    });

    const now = new Date();

    for (const log of failedLogs) {
      try {
        const lastAttempt = log.processedAt || log.createdAt;
        const delay = this.config.webhookRetryDelays[log.retryCount];
        const elapsed = now.getTime() - lastAttempt.getTime();

        if (elapsed >= delay) {
          this.logger.log(`Retrying webhook event ${log.gatewayEventId} (Attempt: ${log.retryCount + 1})`);

          // Increment retryCount before trying to prevent duplicate execution in case of crash
          const nextRetryCount = log.retryCount + 1;
          await this.repository.prisma.paymentWebhookLog.update({
            where: { id: log.id },
            data: {
              retryCount: nextRetryCount,
              processedAt: now,
            },
          });

          try {
            await this.paymentService.processWebhookEvent(log.payload);

            // Success!
            await this.repository.prisma.paymentWebhookLog.update({
              where: { id: log.id },
              data: {
                status: 'processed',
                error: null,
              },
            });

            await this.repository.createAuditEvent({
              userId: null,
              action: 'Webhook Retry',
              details: `Webhook Event ${log.gatewayEventId} recovered successfully on attempt ${nextRetryCount}`,
              performedBy: 'system',
            });
          } catch (execError) {
            // Failed again
            const isMaxReached = nextRetryCount >= this.config.maxWebhookRetries;
            
            await this.repository.prisma.paymentWebhookLog.update({
              where: { id: log.id },
              data: {
                status: 'failed',
                error: execError.message,
              },
            });

            if (isMaxReached) {
              await this.repository.createAuditEvent({
                userId: null,
                action: 'Webhook Retry',
                details: `Webhook Event ${log.gatewayEventId} reached maximum retry limit of ${this.config.maxWebhookRetries} and is marked as FAILED`,
                performedBy: 'system',
              });
            }
          }
        }
      } catch (error) {
        this.logger.error(`Error processing webhook retry for log ID ${log.id}: ${error.message}`);
      }
    }
  }
}
