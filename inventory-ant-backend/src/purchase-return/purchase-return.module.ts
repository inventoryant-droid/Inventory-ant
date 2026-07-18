import { Module, forwardRef } from '@nestjs/common';
import { PurchaseReturnController } from './purchase-return.controller';
import { PurchaseReturnService } from './purchase-return.service';
import { PurchaseReturnRepository } from './purchase-return.repository';
import { PurchaseReturnEventEmitter } from './domain/events/return-event-emitter';
import { PrismaService } from '../prisma.service';
import { GoodsReceiptModule } from '../goods-receipt/goods-receipt.module';
import { PurchaseOrderModule } from '../purchase-order/purchase-order.module';
import { SupplierModule } from '../supplier/supplier.module';
import { InventoryModule } from '../inventory/infrastructure/inventory.module';
import { UsersModule } from '../users/users.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => SubscriptionModule),
    GoodsReceiptModule,
    PurchaseOrderModule,
    SupplierModule,
    InventoryModule,
  ],
  controllers: [PurchaseReturnController],
  providers: [
    PurchaseReturnService,
    PurchaseReturnRepository,
    PurchaseReturnEventEmitter,
    PrismaService,
  ],
  exports: [PurchaseReturnService, PurchaseReturnRepository, PurchaseReturnEventEmitter],
})
export class PurchaseReturnModule {}
