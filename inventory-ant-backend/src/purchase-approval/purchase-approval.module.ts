import { Module, forwardRef } from '@nestjs/common';
import { PurchaseApprovalController } from './purchase-approval.controller';
import { PurchaseApprovalService } from './purchase-approval.service';
import { PurchaseApprovalRepository } from './purchase-approval.repository';
import { PurchaseApprovalEventEmitter } from './domain/events/approval-event-emitter';
import { PrismaService } from '../prisma.service';
import { PurchaseOrderModule } from '../purchase-order/purchase-order.module';
import { UsersModule } from '../users/users.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => SubscriptionModule),
    PurchaseOrderModule,
  ],
  controllers: [PurchaseApprovalController],
  providers: [
    PurchaseApprovalService,
    PurchaseApprovalRepository,
    PurchaseApprovalEventEmitter,
    PrismaService,
  ],
  exports: [PurchaseApprovalService, PurchaseApprovalRepository, PurchaseApprovalEventEmitter],
})
export class PurchaseApprovalModule {}
