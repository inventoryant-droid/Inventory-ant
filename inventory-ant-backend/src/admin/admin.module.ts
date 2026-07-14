import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { UsersModule } from '../users/users.module';
import { SaasModule } from '../saas/saas.module';

@Module({
  imports: [UsersModule, SaasModule],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
})
export class AdminModule {}
