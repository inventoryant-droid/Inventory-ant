import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Plan, Feature, PlanFeature, Coupon, FeatureFlag, Subscription, User, AuditEvent, AiConfig } from '@prisma/client';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Plan Management
  async createPlan(data: any): Promise<Plan> {
    return this.prisma.plan.create({ data });
  }

  async updatePlan(id: string, data: any): Promise<Plan> {
    return this.prisma.plan.update({ where: { id }, data });
  }

  async getPlanById(id: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({ where: { id } });
  }

  async getPlanBySlug(slug: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({ where: { slug } });
  }

  async getPlans(): Promise<Plan[]> {
    return this.prisma.plan.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  async deletePlan(id: string): Promise<Plan> {
    // Check if the plan is used by any subscription
    const usageCount = await this.prisma.subscription.count({
      where: { planId: id },
    });
    if (usageCount > 0) {
      throw new BadRequestException('Cannot delete plan: Plan is currently active on users subscriptions.');
    }
    return this.prisma.plan.delete({ where: { id } });
  }

  // 2. Feature Management
  async createFeature(data: any): Promise<Feature> {
    return this.prisma.feature.create({ data });
  }

  async updateFeature(id: string, data: any): Promise<Feature> {
    return this.prisma.feature.update({ where: { id }, data });
  }

  async deleteFeature(id: string): Promise<Feature> {
    return this.prisma.feature.delete({ where: { id } });
  }

  async getFeatures(): Promise<Feature[]> {
    return this.prisma.feature.findMany({ orderBy: { name: 'asc' } });
  }

  async getFeatureById(id: string): Promise<Feature | null> {
    return this.prisma.feature.findUnique({ where: { id } });
  }

  async getFeatureByCode(code: string): Promise<Feature | null> {
    return this.prisma.feature.findUnique({ where: { code } });
  }

  // 3. PlanFeature Mapping
  async assignFeatureToPlan(data: { planId: string; featureId: string; limitValue?: number | null }): Promise<PlanFeature> {
    return this.prisma.planFeature.upsert({
      where: {
        planId_featureId: {
          planId: data.planId,
          featureId: data.featureId,
        },
      },
      create: {
        planId: data.planId,
        featureId: data.featureId,
        limitValue: data.limitValue !== undefined ? data.limitValue : null,
      },
      update: {
        limitValue: data.limitValue !== undefined ? data.limitValue : null,
      },
    });
  }

  async removeFeatureFromPlan(planId: string, featureId: string): Promise<PlanFeature> {
    return this.prisma.planFeature.delete({
      where: {
        planId_featureId: {
          planId,
          featureId,
        },
      },
    });
  }

  async getPlanFeatures(planId: string): Promise<PlanFeature[]> {
    return this.prisma.planFeature.findMany({
      where: { planId },
      include: { feature: true },
    });
  }

  // 4. Coupon Management
  async createCoupon(data: any): Promise<Coupon> {
    return this.prisma.coupon.create({ data });
  }

  async updateCoupon(id: string, data: any): Promise<Coupon> {
    return this.prisma.coupon.update({ where: { id }, data });
  }

  async deleteCoupon(id: string): Promise<Coupon> {
    return this.prisma.coupon.delete({ where: { id } });
  }

  async getCoupons(): Promise<Coupon[]> {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
  }

  async getCouponById(id: string): Promise<Coupon | null> {
    return this.prisma.coupon.findUnique({ where: { id } });
  }

  // 5. Feature Flags
  async createFeatureFlag(data: any): Promise<FeatureFlag> {
    return this.prisma.featureFlag.create({ data });
  }

  async updateFeatureFlag(id: string, data: any): Promise<FeatureFlag> {
    return this.prisma.featureFlag.update({ where: { id }, data });
  }

  async deleteFeatureFlag(id: string): Promise<FeatureFlag> {
    return this.prisma.featureFlag.delete({ where: { id } });
  }

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return this.prisma.featureFlag.findMany({ orderBy: { code: 'asc' } });
  }

  async getFeatureFlagById(id: string): Promise<FeatureFlag | null> {
    return this.prisma.featureFlag.findUnique({ where: { id } });
  }

  // 6. Subscription Management
  async getSubscriptions(search?: string, page?: number, limit?: number): Promise<any[]> {
    const where: any = {};
    if (search) {
      where.OR = [
        { userId: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const take = limit ? Number(limit) : undefined;
    const skip = page && limit ? (Number(page) - 1) * Number(limit) : undefined;
    return this.prisma.subscription.findMany({
      where,
      include: { plan: true, user: true },
      orderBy: { updatedAt: 'desc' },
      take,
      skip,
    });
  }

  async getSubscriptionById(id: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({ where: { id } });
  }

  async updateSubscription(id: string, data: any): Promise<Subscription> {
    return this.prisma.subscription.update({ where: { id }, data });
  }

  // 7. User Details
  async getUsers(search?: string, page?: number, limit?: number): Promise<User[]> {
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
      ];
    }
    const take = limit ? Number(limit) : undefined;
    const skip = page && limit ? (Number(page) - 1) * Number(limit) : undefined;
    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getUserUsage(userId: string): Promise<any[]> {
    return this.prisma.featureUsage.findMany({
      where: { userId },
      include: { feature: true },
    });
  }

  async getUserSubscriptionHistory(userId: string): Promise<any[]> {
    return this.prisma.planHistory.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getUserAuditLogs(userId: string, page?: number, limit?: number): Promise<AuditEvent[]> {
    const take = limit ? Number(limit) : undefined;
    const skip = page && limit ? (Number(page) - 1) * Number(limit) : undefined;
    return this.prisma.auditEvent.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take,
      skip,
    });
  }

  async disableUserAccount(id: string, active: boolean): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { active },
    });
  }

  // 8. AI Config
  async upsertAiConfig(key: string, value: any, description?: string): Promise<AiConfig> {
    return this.prisma.aiConfig.upsert({
      where: { key },
      create: { key, value, description },
      update: { value, description },
    });
  }

  async getAiConfigs(): Promise<AiConfig[]> {
    return this.prisma.aiConfig.findMany();
  }

  async getAiConfigByKey(key: string): Promise<AiConfig | null> {
    return this.prisma.aiConfig.findUnique({ where: { key } });
  }

  // 9. Dashboard Queries
  async totalUsers(): Promise<number> {
    return this.prisma.user.count({ where: { role: { not: 'staff' } } });
  }

  async activeUsers(): Promise<number> {
    return this.prisma.user.count({ where: { active: true, role: { not: 'staff' } } });
  }

  async usersCountByPlanSlug(slug: string): Promise<number> {
    return this.prisma.subscription.count({
      where: {
        plan: { slug },
        status: { in: ['active', 'trial', 'grace'] },
      },
    });
  }

  async completedPaymentsSum(): Promise<number> {
    // Legacy Payment table might have amount string or float. Let's fetch all payments.
    const payments = await this.prisma.payment.findMany();
    let total = 0;
    payments.forEach(p => {
      // Amount can be string or float
      const amt = typeof p.amount === 'string' ? parseFloat(p.amount) : p.amount;
      if (!isNaN(amt)) total += amt;
    });
    return total;
  }

  async activePaidSubscriptions(): Promise<any[]> {
    return this.prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'grace'] },
        plan: { monthlyPrice: { gt: 0 } },
      },
      include: { plan: true },
    });
  }

  async trialUsersCount(): Promise<number> {
    return this.prisma.subscription.count({
      where: { status: 'trial' },
    });
  }

  async expiringSubscriptionsCount(cutoffDate: Date): Promise<number> {
    return this.prisma.subscription.count({
      where: {
        status: { in: ['active', 'trial'] },
        expiryDate: { lte: cutoffDate, gte: new Date() },
      },
    });
  }

  async getMostUsedFeatures(): Promise<any[]> {
    return (this.prisma.featureUsage.groupBy as any)({
      by: ['featureId'],
      _sum: {
        used: true,
      },
    });
  }

  async getAiUsageStats(): Promise<any[]> {
    // Sum used for AI features: AI_CHAT, VOICE_ASSISTANT, SMART_SCAN
    return this.prisma.featureUsage.findMany({
      where: {
        feature: {
          code: { in: ['AI_CHAT', 'VOICE_ASSISTANT', 'SMART_SCAN'] },
        },
      },
      include: { feature: true },
    });
  }

  async createAuditEvent(data: {
    userId: string | null;
    action: string;
    details: string | null;
    performedBy: string;
    ipAddress?: string | null;
  }): Promise<AuditEvent> {
    return this.prisma.auditEvent.create({
      data: {
        userId: data.userId,
        action: data.action,
        details: data.details,
        performedBy: data.performedBy,
        ipAddress: data.ipAddress || null,
        timestamp: new Date(),
      },
    });
  }
}
