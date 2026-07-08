import { Module, forwardRef } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '../../prisma.service';
import { SaasModule } from '../saas.module';

@Module({
  imports: [forwardRef(() => SaasModule)],
  controllers: [HealthController],
  providers: [HealthService, PrismaService],
})
export class HealthModule {}
