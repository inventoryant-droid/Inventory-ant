import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'inventory-ant-super-secret-key-2026',
      signOptions: { expiresIn: '1d' },
    }),
    forwardRef(() => SubscriptionModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService, JwtModule, PrismaService],
})
export class UsersModule {}
