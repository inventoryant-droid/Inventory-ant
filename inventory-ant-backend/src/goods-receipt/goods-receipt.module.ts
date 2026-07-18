import { Module, forwardRef } from '@nestjs/common';
import { GoodsReceiptController } from './goods-receipt.controller';
import { GoodsReceiptService } from './goods-receipt.service';
import { GoodsReceiptRepository } from './goods-receipt.repository';
import { GoodsReceiptEventEmitter } from './domain/events/grn-event-emitter';
import { PrismaService } from '../prisma.service';
import { PurchaseOrderModule } from '../purchase-order/purchase-order.module';
import { SupplierModule } from '../supplier/supplier.module';
import { InventoryModule } from '../inventory/infrastructure/inventory.module';
import { UsersModule } from '../users/users.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => SubscriptionModule),
    PurchaseOrderModule,
    SupplierModule,
    InventoryModule,
  ],
  controllers: [GoodsReceiptController],
  providers: [
    GoodsReceiptService,
    GoodsReceiptRepository,
    GoodsReceiptEventEmitter,
    PrismaService,
  ],
  exports: [GoodsReceiptService, GoodsReceiptRepository, GoodsReceiptEventEmitter],
})
export class GoodsReceiptModule {}
