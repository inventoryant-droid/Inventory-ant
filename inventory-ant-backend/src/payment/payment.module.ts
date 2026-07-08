import { Module, forwardRef } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentWebhookController } from './payment.webhook.controller';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { RazorpayProvider } from './providers/razorpay.provider';
import { SubscriptionModule } from '../subscription/subscription.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    forwardRef(() => SubscriptionModule),
    forwardRef(() => UsersModule),
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
  ],
})
export class PaymentModule {}
