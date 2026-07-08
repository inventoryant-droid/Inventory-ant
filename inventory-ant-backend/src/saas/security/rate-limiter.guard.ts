import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../cache/cache.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator';
import { TracedRequest } from '../tracing/tracing.middleware';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<TracedRequest>();
    const path = req.route ? req.route.path : req.url;

    // 1. Get explicit rate limit options or resolve defaults based on endpoint prefix
    let options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) {
      options = this.getDefaultOptions(path);
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const userId = req.headers['x-user-id'] as string || null;

    // 2. Perform rate limit checks depending on configured strategy
    const limitBy = options.limitBy || 'all';

    if (limitBy === 'ip' || limitBy === 'all') {
      const ipKey = `ratelimit:ip:${ip}:${path}`;
      await this.checkLimit(ipKey, options.points, options.duration);
    }

    if ((limitBy === 'user' || limitBy === 'all') && userId) {
      const userKey = `ratelimit:user:${userId}:${path}`;
      await this.checkLimit(userKey, options.points, options.duration);
    }

    if (limitBy === 'endpoint') {
      const endpointKey = `ratelimit:endpoint:${path}`;
      await this.checkLimit(endpointKey, options.points, options.duration);
    }

    return true;
  }

  private async checkLimit(key: string, limit: number, duration: number): Promise<void> {
    const currentHits = await this.cacheService.get<number>(key) || 0;

    if (currentHits >= limit) {
      throw new HttpException(
        {
          message: 'Too many requests. Please try again later.',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          errorCode: 'TOO_MANY_REQUESTS',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.cacheService.set<number>(key, currentHits + 1, duration);
  }

  private getDefaultOptions(path: string): RateLimitOptions {
    const lowerPath = path.toLowerCase();
    
    // Auth & OTP
    if (lowerPath.includes('auth') || lowerPath.includes('otp') || lowerPath.includes('password')) {
      return { points: 10, duration: 60, limitBy: 'all' };
    }
    
    // AI & Voice Assistant & Scanner
    if (lowerPath.includes('ai') || lowerPath.includes('voice') || lowerPath.includes('scan')) {
      return { points: 15, duration: 60, limitBy: 'user' };
    }

    // Billing & Payments
    if (lowerPath.includes('billing') || lowerPath.includes('payment') || lowerPath.includes('bill')) {
      return { points: 30, duration: 60, limitBy: 'user' };
    }

    // Admin Panel APIs
    if (lowerPath.includes('admin')) {
      return { points: 40, duration: 60, limitBy: 'user' };
    }

    // General fallback
    return { points: 100, duration: 60, limitBy: 'ip' };
  }
}
