import { Module, forwardRef } from '@nestjs/common';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';
import { SupplierRepository } from './supplier.repository';
import { PrismaService } from '../prisma.service';
import { UsersModule } from '../users/users.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => SubscriptionModule),
  ],
  controllers: [SupplierController],
  providers: [
    SupplierService,
    SupplierRepository,
    PrismaService,
  ],
  exports: [SupplierService, SupplierRepository],
})
export class SupplierModule {}
