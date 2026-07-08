import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CacheService } from '../cache/cache.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => CacheService)) private readonly cacheService: CacheService,
  ) {}

  async checkDatabase(): Promise<{ status: 'UP' | 'DOWN'; latencyMs?: number; error?: string }> {
    return this.cacheService.wrap('health:database', async () => {
      const start = Date.now();
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        return { status: 'UP', latencyMs: Date.now() - start };
      } catch (err) {
        await this.logHealthFailure('Database', err.message);
        return { status: 'DOWN', error: err.message };
      }
    }, 10); // Cache for 10 seconds
  }

  async checkPayment(): Promise<{ status: 'UP' | 'DOWN'; gateway: string; error?: string }> {
    return this.cacheService.wrap('health:payment', async () => {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (keyId && secret) {
        return { status: 'UP', gateway: 'razorpay' };
      }
      const msg = 'Razorpay credentials (RAZORPAY_KEY_ID/SECRET) are missing in environment';
      await this.logHealthFailure('Payment', msg);
      return { status: 'DOWN', gateway: 'razorpay', error: msg };
    }, 10);
  }

  async checkSubscription(): Promise<{ status: 'UP' | 'DOWN'; count?: number; error?: string }> {
    return this.cacheService.wrap('health:subscription', async () => {
      try {
        const count = await this.prisma.subscription.count();
        return { status: 'UP', count };
      } catch (err) {
        await this.logHealthFailure('Subscription', err.message);
        return { status: 'DOWN', error: err.message };
      }
    }, 10);
  }

  async checkAI(): Promise<{ status: 'UP' | 'DOWN'; provider: string; error?: string }> {
    return this.cacheService.wrap('health:ai', async () => {
      const key = process.env.GEMINI_API_KEY;
      if (key) {
        return { status: 'UP', provider: 'google-gemini' };
      }
      const msg = 'Gemini API key is missing in environment (GEMINI_API_KEY)';
      await this.logHealthFailure('AI', msg);
      return { status: 'DOWN', provider: 'google-gemini', error: msg };
    }, 10);
  }

  async checkEmail(): Promise<{ status: 'UP' | 'DOWN'; provider: string; error?: string }> {
    return this.cacheService.wrap('health:email', async () => {
      const key = process.env.BREVO_API_KEY;
      if (key) {
        return { status: 'UP', provider: 'brevo' };
      }
      const msg = 'Brevo API key is missing in environment (BREVO_API_KEY)';
      await this.logHealthFailure('Email', msg);
      return { status: 'DOWN', provider: 'brevo', error: msg };
    }, 10);
  }

  async checkStorage(): Promise<{ status: 'UP' | 'DOWN'; path: string; error?: string }> {
    return this.cacheService.wrap('health:storage', async () => {
      const testPath = path.join(process.cwd(), 'health-check-temp.txt');
      try {
        fs.writeFileSync(testPath, 'health check data');
        fs.unlinkSync(testPath);
        return { status: 'UP', path: process.cwd() };
      } catch (err) {
        await this.logHealthFailure('Storage', err.message);
        return { status: 'DOWN', path: process.cwd(), error: err.message };
      }
    }, 10);
  }

  private async logHealthFailure(serviceName: string, errorMsg: string) {
    try {
      await this.prisma.auditEvent.create({
        data: {
          userId: null,
          action: 'Health Failure',
          details: `Service health check failed for ${serviceName}. Error: ${errorMsg}`,
          performedBy: 'system',
          timestamp: new Date(),
        },
      });
    } catch (err) {
      console.error('Failed to log health failure audit:', err);
    }
  }
}
