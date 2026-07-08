import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { AiService } from './ai.service';
import { UsersModule } from '../users/users.module';
import { PrismaService } from '../prisma.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [UsersModule, SubscriptionModule],
  controllers: [ProductsController],
  providers: [ProductsService, AiService, PrismaService],
})
export class ProductsModule {}
