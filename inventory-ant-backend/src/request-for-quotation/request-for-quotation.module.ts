import { Module, forwardRef } from '@nestjs/common';
import { RequestForQuotationController } from './request-for-quotation.controller';
import { RequestForQuotationService } from './request-for-quotation.service';
import { RequestForQuotationRepository } from './request-for-quotation.repository';
import { RFQEventEmitter } from './domain/events/rfq-event-emitter';
import { PrismaService } from '../prisma.service';
import { PurchaseRequisitionModule } from '../purchase-requisition/purchase-requisition.module';
import { SupplierModule } from '../supplier/supplier.module';
import { UsersModule } from '../users/users.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => SubscriptionModule),
    PurchaseRequisitionModule,
    SupplierModule,
  ],
  controllers: [RequestForQuotationController],
  providers: [
    RequestForQuotationService,
    RequestForQuotationRepository,
    RFQEventEmitter,
    PrismaService,
  ],
  exports: [RequestForQuotationService, RequestForQuotationRepository, RFQEventEmitter],
})
export class RequestForQuotationModule {}
