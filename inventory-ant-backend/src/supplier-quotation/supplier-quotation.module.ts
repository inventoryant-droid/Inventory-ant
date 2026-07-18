import { Module, forwardRef } from '@nestjs/common';
import { SupplierQuotationController } from './supplier-quotation.controller';
import { SupplierQuotationService } from './supplier-quotation.service';
import { SupplierQuotationRepository } from './supplier-quotation.repository';
import { QuotationEventEmitter } from './domain/events/quotation-event-emitter';
import { PrismaService } from '../prisma.service';
import { RequestForQuotationModule } from '../request-for-quotation/request-for-quotation.module';
import { SupplierModule } from '../supplier/supplier.module';
import { UsersModule } from '../users/users.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => SubscriptionModule),
    RequestForQuotationModule,
    SupplierModule,
  ],
  controllers: [SupplierQuotationController],
  providers: [
    SupplierQuotationService,
    SupplierQuotationRepository,
    QuotationEventEmitter,
    PrismaService,
  ],
  exports: [SupplierQuotationService, SupplierQuotationRepository, QuotationEventEmitter],
})
export class SupplierQuotationModule {}
