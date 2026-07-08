import { Injectable, BadRequestException } from '@nestjs/common';
import { SubscriptionRepository } from './subscription.repository';
import { PlanService } from './plan.service';
import { FeatureService } from './feature.service';
import { IUsageStatus } from './subscription.interfaces';
import { SUBSCRIPTION_STATUS, AUDIT_ACTION } from './subscription.constants';
import { FeatureUsage } from '@prisma/client';

@Injectable()
export class UsageService {
  constructor(
    private readonly repository: SubscriptionRepository,
    private readonly planService: PlanService,
    private readonly featureService: FeatureService,
  ) {}

  async getCurrentPlan(userId: string): Promise<any> {
    const sub = await this.repository.getSubscriptionByUser(userId);
    if (sub && [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL, SUBSCRIPTION_STATUS.GRACE].includes(sub.status)) {
      return sub.plan;
    }
    return this.planService.getPlanBySlug('free');
  }

  async hasFeature(userId: string, featureCode: string): Promise<boolean> {
    const plan = await this.getCurrentPlan(userId);
    const feature = await this.featureService.getFeatureByCode(featureCode);
    const config = await this.planService.getPlanFeatureConfig(plan.id, feature.id);
    return config ? config.enabled : false;
  }

  async canAccessFeature(userId: string, featureCode: string): Promise<boolean> {
    const sub = await this.repository.getSubscriptionByUser(userId);
    if (!sub) {
      return this.hasFeature(userId, featureCode);
    }
    const hasPermission = await this.hasFeature(userId, featureCode);
    if (!hasPermission) return false;

    const allowedStatuses = [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL, SUBSCRIPTION_STATUS.GRACE];
    return allowedStatuses.includes(sub.status);
  }

  async getUsage(userId: string, featureCode: string): Promise<IUsageStatus> {
    const plan = await this.getCurrentPlan(userId);
    const feature = await this.featureService.getFeatureByCode(featureCode);
    const config = await this.planService.getPlanFeatureConfig(plan.id, feature.id);

    const limitValue = config ? config.limitValue : null;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let used = 0;
    if (featureCode === 'INVENTORY') {
      const user = await this.repository.findUserById(userId);
      used = user ? await this.repository.countProducts(user.email) : 0;
    } else if (featureCode === 'STAFF') {
      const user = await this.repository.findUserById(userId);
      used = user ? await this.repository.countStaff(user.email) : 0;
    } else {
      const usageRecord = await this.repository.getFeatureUsage(userId, feature.id, currentMonth, currentYear);
      used = usageRecord ? usageRecord.used : 0;
    }

    const usageRecordFallback = await this.repository.getFeatureUsage(userId, feature.id, currentMonth, currentYear);
    const resetDate = usageRecordFallback ? new Date(usageRecordFallback.resetDate) : new Date(currentYear, currentMonth, 1);

    const remaining = limitValue !== null ? Math.max(0, limitValue - used) : null;

    return {
      featureCode,
      limitValue,
      used,
      remaining,
      resetDate,
    };
  }

  async getRemainingUsage(userId: string, featureCode: string): Promise<number | null> {
    const status = await this.getUsage(userId, featureCode);
    return status.remaining;
  }

  async incrementUsage(userId: string, featureCode: string, amount = 1): Promise<IUsageStatus> {
    const canAccess = await this.canAccessFeature(userId, featureCode);
    if (!canAccess) {
      throw new BadRequestException(`Feature ${featureCode} is not accessible under your current plan`);
    }

    const status = await this.getUsage(userId, featureCode);
    if (status.limitValue !== null && status.remaining !== null && status.remaining < amount) {
      throw new BadRequestException(`Usage limit exceeded for feature ${featureCode}`);
    }

    const feature = await this.featureService.getFeatureByCode(featureCode);
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const resetDate = new Date(currentYear, currentMonth, 1);

    await this.repository.incrementFeatureUsage(userId, feature.id, currentMonth, currentYear, amount, resetDate);
    return this.getUsage(userId, featureCode);
  }

  async resetMonthlyUsage(month?: number, year?: number): Promise<void> {
    const now = new Date();
    const m = month || (now.getMonth() + 1);
    const y = year || now.getFullYear();
    const nextResetDate = new Date(y, m, 1);

    await this.repository.resetAllFeatureUsagesForMonth(m, y, nextResetDate);

    await this.repository.createAuditEvent({
      userId: null,
      action: AUDIT_ACTION.USAGE_RESET,
      details: `Reset usages for period ${m}/${y}`,
      performedBy: 'system',
    });
  }
}
