import { Module, forwardRef } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentWebhookController } from './payment.webhook.controller';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { RazorpayProvider } from './providers/razorpay.provider';
import { SubscriptionModule } from '../subscription/subscription.module';
import { UsersModule } from '../users/users.module';
import { SaasModule } from '../saas/saas.module';

@Module({
  imports: [
    forwardRef(() => SubscriptionModule),
    forwardRef(() => UsersModule),
    forwardRef(() => SaasModule),
  ],
  controllers: [
    PaymentController,
    PaymentWebhookController,
  ],
  providers: [
    PaymentService,
    PaymentRepository,
    {
      provide: 'PaymentProvider',
      useClass: RazorpayProvider,
    },
  ],
  exports: [
    PaymentService,
    PaymentRepository,
    'PaymentProvider',
  ],
})
export class PaymentModule {}
