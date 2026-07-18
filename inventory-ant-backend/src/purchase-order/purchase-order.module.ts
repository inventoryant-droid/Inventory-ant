import { Module, forwardRef } from '@nestjs/common';
import { PurchaseOrderController } from './purchase-order.controller';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderRepository } from './purchase-order.repository';
import { PurchaseOrderEventEmitter } from './domain/events/po-event-emitter';
import { PrismaService } from '../prisma.service';
import { SupplierQuotationModule } from '../supplier-quotation/supplier-quotation.module';
import { RequestForQuotationModule } from '../request-for-quotation/request-for-quotation.module';
import { SupplierModule } from '../supplier/supplier.module';
import { UsersModule } from '../users/users.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => SubscriptionModule),
    SupplierQuotationModule,
    RequestForQuotationModule,
    SupplierModule,
  ],
  controllers: [PurchaseOrderController],
  providers: [
    PurchaseOrderService,
    PurchaseOrderRepository,
    PurchaseOrderEventEmitter,
    PrismaService,
  ],
  exports: [PurchaseOrderService, PurchaseOrderRepository, PurchaseOrderEventEmitter],
})
export class PurchaseOrderModule {}
