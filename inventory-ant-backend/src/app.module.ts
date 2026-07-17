import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { AdminModule } from './admin/admin.module';
import { PaymentModule } from './payment/payment.module';
import { SaasModule } from './saas/saas.module';
import { InventoryModule } from './inventory/infrastructure/inventory.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ProductsModule,
    UsersModule,
    SubscriptionModule,
    AdminModule,
    PaymentModule,
    SaasModule,
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
