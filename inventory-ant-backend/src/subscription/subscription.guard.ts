import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from './subscription.service';
import { SubscriptionRepository } from './subscription.repository';
import { CURRENT_SUBSCRIPTION_KEY, REQUIRE_FEATURE_KEY, REQUIRE_LIMIT_KEY } from './subscription.decorators';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionService: SubscriptionService,
    private readonly repository: SubscriptionRepository,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.sub) {
      return true; // Allow public routes
    }

    // Improve Guard: Resolve Target User context.
    // If the requesting user is a Staff member, their subscription quotas must be evaluated against the Parent Owner.
    let targetUserId = user.sub;
    if (user.role === 'staff' && user.tenantEmail) {
      const ownerUser = await this.repository.findUserByEmail(user.tenantEmail);
      if (ownerUser) {
        targetUserId = ownerUser.id;
      }
    }

    // 1. Enforce Subscription Presence check
    const requireSubscription = this.reflector.getAllAndOverride<boolean>(
      CURRENT_SUBSCRIPTION_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (requireSubscription) {
      const sub = await this.subscriptionService.getActiveSubscription(targetUserId);
      if (!sub) {
        throw new ForbiddenException('An active premium subscription is required to access this resource');
      }
    }

    // 2. Enforce Feature Access check
    const requireFeatureCode = this.reflector.getAllAndOverride<string>(
      REQUIRE_FEATURE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (requireFeatureCode) {
      const allowed = await this.subscriptionService.canAccessFeature(targetUserId, requireFeatureCode);
      if (!allowed) {
        throw new ForbiddenException(`Your active plan does not permit access to feature: ${requireFeatureCode}`);
      }
    }

    // 3. Enforce Limit / Quota check
    const requireLimit = this.reflector.getAllAndOverride<{ featureCode: string; amount: number }>(
      REQUIRE_LIMIT_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (requireLimit) {
      const usageStatus = await this.subscriptionService.getUsage(targetUserId, requireLimit.featureCode);
      if (usageStatus.limitValue !== null && usageStatus.remaining !== null && usageStatus.remaining < requireLimit.amount) {
        throw new ForbiddenException({
          error: 'LIMIT_EXCEEDED',
          message: `Monthly limit exceeded for feature: ${requireLimit.featureCode}`,
          feature: requireLimit.featureCode,
          limit: usageStatus.limitValue,
          used: usageStatus.used,
          remaining: usageStatus.remaining,
          resetDate: usageStatus.resetDate,
        });
      }
    }

    return true;
  }
}
