import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealthOverview() {
    const db = await this.healthService.checkDatabase();
    const payment = await this.healthService.checkPayment();
    const subscription = await this.healthService.checkSubscription();
    const ai = await this.healthService.checkAI();
    const email = await this.healthService.checkEmail();
    const storage = await this.healthService.checkStorage();

    const overallStatus =
      db.status === 'UP' &&
      payment.status === 'UP' &&
      subscription.status === 'UP' &&
      ai.status === 'UP' &&
      email.status === 'UP' &&
      storage.status === 'UP'
        ? 'UP'
        : 'DEGRADED';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: db,
        payment,
        subscription,
        ai,
        email,
        storage,
      },
    };
  }

  @Get('database')
  async getDatabaseHealth() {
    return this.healthService.checkDatabase();
  }

  @Get('payment')
  async getPaymentHealth() {
    return this.healthService.checkPayment();
  }

  @Get('subscription')
  async getSubscriptionHealth() {
    return this.healthService.checkSubscription();
  }

  @Get('ai')
  async getAiHealth() {
    return this.healthService.checkAI();
  }

  @Get('email')
  async getEmailHealth() {
    return this.healthService.checkEmail();
  }

  @Get('storage')
  async getStorageHealth() {
    return this.healthService.checkStorage();
  }
}
