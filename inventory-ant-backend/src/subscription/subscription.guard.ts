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
      return true; // Allow guest routes
    }

    let targetUserId = user.sub;
    if (user.role === 'staff' && user.tenantEmail) {
      const ownerUser = await this.repository.findUserByEmail(user.tenantEmail);
      if (ownerUser) {
        targetUserId = ownerUser.id;
      }
    }

    // 1. Subscription Status & Expiry Check
    const requireSubscription = this.reflector.getAllAndOverride<boolean>(
      CURRENT_SUBSCRIPTION_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    const sub = await this.subscriptionService.getActiveSubscription(targetUserId);

    if (requireSubscription || requireSubscription === undefined) {
      // By default check subscription status if logged in
      if (!sub) {
        await this.subscriptionService.logAuditEvent(
          targetUserId,
          'Access Denied',
          'Access blocked: Active subscription required',
          'system',
        );
        throw new ForbiddenException({
          error: 'SUBSCRIPTION_REQUIRED',
          message: 'An active premium subscription is required to access this resource',
        });
      }

      if (sub.status === 'expired' || sub.status === 'suspended') {
        const isTrial = sub.trialEndsAt !== null;
        const errorCode = isTrial ? 'TRIAL_EXPIRED' : 'PLAN_UPGRADE_REQUIRED';
        const errorMsg = isTrial ? 'Your plan trial has expired' : 'Your subscription has expired, upgrade required';

        await this.subscriptionService.logAuditEvent(
          targetUserId,
          'Subscription Expired',
          `Access blocked: Subscription status is ${sub.status}`,
          'system',
        );

        throw new ForbiddenException({
          error: errorCode,
          message: errorMsg,
          status: sub.status,
        });
      }
    }

    // 2. Feature Enabled Check
    const requireFeatureCode = this.reflector.getAllAndOverride<string>(
      REQUIRE_FEATURE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (requireFeatureCode) {
      const allowed = await this.subscriptionService.canAccessFeature(targetUserId, requireFeatureCode);
      if (!allowed) {
        await this.subscriptionService.logAuditEvent(
          targetUserId,
          'Feature Disabled',
          `Access blocked: Feature ${requireFeatureCode} is disabled on current plan`,
          'system',
        );
        throw new ForbiddenException({
          error: 'FEATURE_DISABLED',
          message: `Your active plan does not permit access to feature: ${requireFeatureCode}`,
          feature: requireFeatureCode,
        });
      }
    }

    // 3. Quota Limits Check
    const requireLimit = this.reflector.getAllAndOverride<{ featureCode: string; amount: number }>(
      REQUIRE_LIMIT_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (requireLimit) {
      const usageStatus = await this.subscriptionService.getUsage(targetUserId, requireLimit.featureCode);
      if (usageStatus.limitValue !== null && usageStatus.remaining !== null && usageStatus.remaining < requireLimit.amount) {
        await this.subscriptionService.logAuditEvent(
          targetUserId,
          'Quota Exceeded',
          `Access blocked: Limit exceeded for feature ${requireLimit.featureCode} (Limit: ${usageStatus.limitValue}, Used: ${usageStatus.used})`,
          'system',
        );
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
