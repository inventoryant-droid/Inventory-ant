import { Module } from '@nestjs/common';
import { SaasConfigService } from './config/saas-config.service';
import { SaasLoggerService } from './logging/saas-logger.service';
import { EmailTemplateEngine } from './email/email-template.engine';
import { BrevoProvider } from './email/brevo.provider';
import { EmailService } from './email/email.service';
import { NotificationService } from './notification/notification.service';
import { PaymentRecoveryService } from './recovery/payment-recovery.service';
import { WebhookRecoveryService } from './recovery/webhook-recovery.service';
import { BackgroundJobService } from './recovery/background-job.service';
import { SaasSchedulerService } from './recovery/saas-scheduler.service';
import { HealthModule } from './health/health.module';
import { PaymentModule } from '../payment/payment.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { UsersModule } from '../users/users.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    HealthModule,
    PaymentModule,
    SubscriptionModule,
    UsersModule,
  ],
  providers: [
    SaasConfigService,
    SaasLoggerService,
    EmailTemplateEngine,
    {
      provide: 'EmailProvider',
      useClass: BrevoProvider,
    },
    EmailService,
    NotificationService,
    PaymentRecoveryService,
    WebhookRecoveryService,
    BackgroundJobService,
    SaasSchedulerService,
    PrismaService,
  ],
  exports: [
    SaasConfigService,
    SaasLoggerService,
    EmailService,
    NotificationService,
    PaymentRecoveryService,
    WebhookRecoveryService,
    BackgroundJobService,
  ],
})
export class SaasModule {}
