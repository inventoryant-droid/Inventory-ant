import { Module, NestModule, MiddlewareConsumer, RequestMethod, forwardRef } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionRepository } from './subscription.repository';
import { SubscriptionGuard } from './subscription.guard';
import { SubscriptionScheduler } from './subscription.scheduler';
import { SubscriptionMiddleware } from './subscription.middleware';
import { PlanService } from './plan.service';
import { FeatureService } from './feature.service';
import { UsageService } from './usage.service';
import { AuditService } from './audit.service';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';
import { PriceCalculationService } from './price-calculation.service';
import { UsersModule } from '../users/users.module';
import { SaasModule } from '../saas/saas.module';

@Module({
  imports: [forwardRef(() => UsersModule), forwardRef(() => SaasModule)],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    SubscriptionRepository,
    SubscriptionGuard,
    SubscriptionScheduler,
    PlanService,
    FeatureService,
    UsageService,
    AuditService,
    SubscriptionLifecycleService,
    PriceCalculationService,
  ],
  exports: [
    SubscriptionService,
    SubscriptionRepository,
    SubscriptionGuard,
    SubscriptionScheduler,
    PlanService,
    FeatureService,
    UsageService,
    AuditService,
    SubscriptionLifecycleService,
    PriceCalculationService,
  ],
})
export class SubscriptionModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SubscriptionMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
