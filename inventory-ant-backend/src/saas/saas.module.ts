import { Module, forwardRef, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
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

// Cache Layer
import { CacheService } from './cache/cache.service';
import { MemoryCacheProvider } from './cache/memory-cache.provider';

// Storage Layer
import { StorageService } from './storage/storage.service';
import { LocalStorageProvider } from './storage/local-storage.provider';

// Tracing, Error Handling & Security
import { TracingMiddleware } from './tracing/tracing.middleware';
import { TracingInterceptor } from './tracing/tracing.interceptor';
import { GlobalExceptionFilter } from './errors/global-exception.filter';
import { SecuritySanitizationMiddleware } from './security/security.middleware';
import { RateLimiterGuard } from './security/rate-limiter.guard';

@Module({
  imports: [
    HealthModule,
    forwardRef(() => PaymentModule),
    forwardRef(() => SubscriptionModule),
    forwardRef(() => UsersModule),
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

    // Cache Layer
    {
      provide: 'CacheProvider',
      useClass: MemoryCacheProvider,
    },
    CacheService,

    // Storage Layer
    {
      provide: 'StorageProvider',
      useClass: LocalStorageProvider,
    },
    StorageService,

    // Security, Tracing, Filters registered globally
    TracingMiddleware,
    SecuritySanitizationMiddleware,
    
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TracingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimiterGuard,
    },
  ],
  exports: [
    SaasConfigService,
    SaasLoggerService,
    EmailService,
    NotificationService,
    PaymentRecoveryService,
    WebhookRecoveryService,
    BackgroundJobService,

    // Cache & Storage
    CacheService,
    StorageService,

    // Security & Tracing
    TracingMiddleware,
    SecuritySanitizationMiddleware,
  ],
})
export class SaasModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TracingMiddleware, SecuritySanitizationMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
