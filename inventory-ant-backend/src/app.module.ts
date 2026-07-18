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
import { SupplierModule } from './supplier/supplier.module';
import { PurchaseRequisitionModule } from './purchase-requisition/purchase-requisition.module';
import { RequestForQuotationModule } from './request-for-quotation/request-for-quotation.module';
import { SupplierQuotationModule } from './supplier-quotation/supplier-quotation.module';
import { PurchaseOrderModule } from './purchase-order/purchase-order.module';
import { PurchaseApprovalModule } from './purchase-approval/purchase-approval.module';

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
    SupplierModule,
    PurchaseRequisitionModule,
    RequestForQuotationModule,
    SupplierQuotationModule,
    PurchaseOrderModule,
    PurchaseApprovalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
