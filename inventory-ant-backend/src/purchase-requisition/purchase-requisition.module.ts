import { Module, forwardRef } from '@nestjs/common';
import { PurchaseRequisitionController } from './purchase-requisition.controller';
import { PurchaseRequisitionService } from './purchase-requisition.service';
import { PurchaseRequisitionRepository } from './purchase-requisition.repository';
import { PurchaseRequisitionEventEmitter } from './domain/events/purchase-requisition-event-emitter';
import { PrismaService } from '../prisma.service';
import { UsersModule } from '../users/users.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => SubscriptionModule),
  ],
  controllers: [PurchaseRequisitionController],
  providers: [
    PurchaseRequisitionService,
    PurchaseRequisitionRepository,
    PurchaseRequisitionEventEmitter,
    PrismaService,
  ],
  exports: [PurchaseRequisitionService, PurchaseRequisitionRepository, PurchaseRequisitionEventEmitter],
})
export class PurchaseRequisitionModule {}
