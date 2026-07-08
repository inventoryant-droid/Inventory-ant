import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminRepository } from './admin.repository';
import {
  CreatePlanDto, UpdatePlanDto, CreateFeatureDto, UpdateFeatureDto,
  MapFeatureDto, CreateCouponDto, UpdateCouponDto, CreateFeatureFlagDto,
  UpdateFeatureFlagDto, ManageSubscriptionDto
} from './admin.dto';
import { AuditEvent, Plan, Feature, Coupon, FeatureFlag, Subscription, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private readonly repository: AdminRepository) {}

  // 1. Plan Management
  async createPlan(dto: CreatePlanDto, adminEmail: string): Promise<Plan> {
    const plan = await this.repository.createPlan({
      name: dto.name,
      slug: dto.slug.toLowerCase().trim(),
      description: dto.description || null,
      monthlyPrice: dto.monthlyPrice,
      yearlyPrice: dto.yearlyPrice,
      trialDays: dto.trialDays || 0,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      displayOrder: dto.displayOrder || 0,
      currency: dto.currency || 'INR',
      popularBadge: dto.popularBadge || false,
      recommendedBadge: dto.recommendedBadge || false,
      visibility: dto.visibility !== undefined ? dto.visibility : true,
      gracePeriod: dto.gracePeriod || 3,
    });

    await this.repository.createAuditEvent({
      userId: null,
      action: 'Plan Created',
      details: `Plan "${plan.name}" (${plan.slug}) created with monthly price Rs.${plan.monthlyPrice}`,
      performedBy: adminEmail,
    });

    return plan;
  }

  async updatePlan(id: string, dto: UpdatePlanDto, adminEmail: string): Promise<Plan> {
    const existing = await this.repository.getPlanById(id);
    if (!existing) throw new NotFoundException('Plan not found');

    const updated = await this.repository.updatePlan(id, dto);

    await this.repository.createAuditEvent({
      userId: null,
      action: 'Plan Updated',
      details: `Plan "${updated.name}" updated by admin`,
      performedBy: adminEmail,
    });

    return updated;
  }

  async deletePlan(id: string, adminEmail: string): Promise<Plan> {
    const existing = await this.repository.getPlanById(id);
    if (!existing) throw new NotFoundException('Plan not found');

    const deleted = await this.repository.deletePlan(id);

    await this.repository.createAuditEvent({
      userId: null,
      action: 'Plan Deleted',
      details: `Plan "${existing.name}" (${existing.slug}) permanently deleted`,
      performedBy: adminEmail,
    });

    return deleted;
  }

  async reorderPlans(planIds: string[], adminEmail: string): Promise<Plan[]> {
    const updatedPlans: Plan[] = [];
    for (let i = 0; i < planIds.length; i++) {
      const plan = await this.repository.updatePlan(planIds[i], { displayOrder: i });
      updatedPlans.push(plan);
    }

    await this.repository.createAuditEvent({
      userId: null,
      action: 'Plans Reordered',
      details: `Reordered display sequence for ${planIds.length} plans`,
      performedBy: adminEmail,
    });

    return updatedPlans.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  // 2. Feature Management
  async createFeature(dto: CreateFeatureDto, adminEmail: string): Promise<Feature> {
    const feat = await this.repository.createFeature({
      name: dto.name,
      code: dto.code.toUpperCase().trim(),
      description: dto.description || null,
      category: dto.category || 'General',
      groupName: dto.groupName || 'Core',
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    await this.repository.createAuditEvent({
      userId: null,
      action: 'Feature Created',
      details: `Feature "${feat.name}" (${feat.code}) registered in database`,
      performedBy: adminEmail,
    });

    return feat;
  }

  async updateFeature(id: string, dto: UpdateFeatureDto, adminEmail: string): Promise<Feature> {
    const existing = await this.repository.getFeatureById(id);
    if (!existing) throw new NotFoundException('Feature not found');

    const updated = await this.repository.updateFeature(id, dto);

    await this.repository.createAuditEvent({
      userId: null,
      action: 'Feature Updated',
      details: `Feature "${updated.name}" updated`,
      performedBy: adminEmail,
    });

    return updated;
  }

  async deleteFeature(id: string, adminEmail: string): Promise<Feature> {
    const existing = await this.repository.getFeatureById(id);
    if (!existing) throw new NotFoundException('Feature not found');

    const deleted = await this.repository.deleteFeature(id);

    await this.repository.createAuditEvent({
      userId: null,
      action: 'Feature Deleted',
      details: `Feature "${existing.name}" permanently deleted`,
      performedBy: adminEmail,
    });

    return deleted;
  }

  async getFeatures(): Promise<Feature[]> {
    return this.repository.getFeatures();
  }

  // 3. PlanFeature Mapping
  async assignFeatureToPlan(dto: MapFeatureDto, adminEmail: string) {
    const plan = await this.repository.getPlanById(dto.planId);
    if (!plan) throw new NotFoundException('Plan not found');

    const feature = await this.repository.getFeatureById(dto.featureId);
    if (!feature) throw new NotFoundException('Feature not found');

    const mapping = await this.repository.assignFeatureToPlan({
      planId: dto.planId,
      featureId: dto.featureId,
      limitValue: dto.isUnlimited ? null : (dto.limitValue !== undefined ? dto.limitValue : null),
    });

    await this.repository.createAuditEvent({
      userId: null,
      action: 'Plan Feature Mapping Created',
      details: `Assigned feature "${feature.name}" to plan "${plan.name}" (Limit: ${dto.isUnlimited ? 'Unlimited' : dto.limitValue})`,
      performedBy: adminEmail,
    });

    return mapping;
  }

  async removeFeatureFromPlan(planId: string, featureId: string, adminEmail: string) {
    const mapping = await this.repository.removeFeatureFromPlan(planId, featureId);

    await this.repository.createAuditEvent({
      userId: null,
      action: 'Plan Feature Mapping Deleted',
      details: `Removed feature mapping for Plan: ${planId}, Feature: ${featureId}`,
      performedBy: adminEmail,
    });

    return mapping;
  }

  // 4. Coupon Management
  async createCoupon(dto: CreateCouponDto, adminEmail: string): Promise<Coupon> {
    const coupon = await this.repository.createCoupon({
      code: dto.code.toUpperCase().trim(),
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maximumDiscount: dto.maximumDiscount || null,
      minimumAmount: dto.minimumAmount || null,
      usageLimit: dto.usageLimit || null,
      validFrom: new Date(dto.validFrom),
      validTill: new Date(dto.validTill),
      active: dto.active !== undefined ? dto.active : true,
      planId: dto.planId || null,
    });

    await this.repository.createAuditEvent({
      userId: null,
      action: 'Coupon Created',
      details: `Coupon "${coupon.code}" created (Type: ${coupon.discountType}, Value: ${coupon.discountValue})`,
      performedBy: adminEmail,
    });

    return coupon;
  }

  async updateCoupon(id: string, dto: UpdateCouponDto, adminEmail: string): Promise<Coupon> {
    const existing = await this.repository.getCouponById(id);
    if (!existing) throw new NotFoundException('Coupon not found');

    const updateData: any = { ...dto };
    if (dto.validFrom) updateData.validFrom = new Date(dto.validFrom);
    if (dto.validTill) updateData.validTill = new Date(dto.validTill);

    const updated = await this.repository.updateCoupon(id, updateData);

    await this.repository.createAuditEvent({
      userId: null,
      action: 'Coupon Updated',
      details: `Coupon "${updated.code}" settings modified`,
      performedBy: adminEmail,
    });

    return updated;
  }

  async deleteCoupon(id: string, adminEmail: string): Promise<Coupon> {
    const existing = await this.repository.getCouponById(id);
    if (!existing) throw new NotFoundException('Coupon not found');

    const deleted = await this.repository.deleteCoupon(id);

    await this.repository.createAuditEvent({
      userId: null,
      action: 'Coupon Deleted',
      details: `Coupon "${existing.code}" removed`,
      performedBy: adminEmail,
    });

    return deleted;
  }

  async getCoupons(): Promise<Coupon[]> {
    return this.repository.getCoupons();
  }

  // 5. Feature Flags
  async createFeatureFlag(dto: CreateFeatureFlagDto, adminEmail: string): Promise<FeatureFlag> {
    const flag = await this.repository.createFeatureFlag({
      name: dto.name,
      code: dto.code.toUpperCase().trim(),
      description: dto.description || null,
      active: dto.active !== undefined ? dto.active : true,
      conditions: dto.conditions || {},
    });

    await this.repository.createAuditEvent({
      userId: null,
      action: 'Feature Flag Created',
      details: `Feature Flag "${flag.name}" (${flag.code}) registered`,
      performedBy: adminEmail,
    });

    return flag;
  }

  async updateFeatureFlag(id: string, dto: UpdateFeatureFlagDto, adminEmail: string): Promise<FeatureFlag> {
    const existing = await this.repository.getFeatureFlagById(id);
    if (!existing) throw new NotFoundException('Feature Flag not found');

    const updated = await this.repository.updateFeatureFlag(id, dto);

    await this.repository.createAuditEvent({
      userId: null,
      action: 'Feature Flag Updated',
      details: `Feature Flag "${updated.name}" updated`,
      performedBy: adminEmail,
    });

    return updated;
  }

  async deleteFeatureFlag(id: string, adminEmail: string): Promise<FeatureFlag> {
    const existing = await this.repository.getFeatureFlagById(id);
    if (!existing) throw new NotFoundException('Feature Flag not found');

    const deleted = await this.repository.deleteFeatureFlag(id);

    await this.repository.createAuditEvent({
      userId: null,
      action: 'Feature Flag Deleted',
      details: `Feature Flag "${existing.name}" removed`,
      performedBy: adminEmail,
    });

    return deleted;
  }

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return this.repository.getFeatureFlags();
  }

  // 6. Subscription Management
  async getSubscriptions(search?: string): Promise<any[]> {
    return this.repository.getSubscriptions(search);
  }

  async manageSubscription(id: string, dto: ManageSubscriptionDto, adminEmail: string): Promise<Subscription> {
    const sub = await this.repository.getSubscriptionById(id);
    if (!sub) throw new NotFoundException('Subscription not found');

    const updateData: any = {};
    if (dto.status) updateData.status = dto.status;
    if (dto.expiryDate) updateData.expiryDate = new Date(dto.expiryDate);
    if (dto.trialEndsAt) updateData.trialEndsAt = new Date(dto.trialEndsAt);
    if (dto.graceEndsAt) updateData.graceEndsAt = new Date(dto.graceEndsAt);
    if (dto.nextBillingDate) updateData.nextBillingDate = new Date(dto.nextBillingDate);

    const updated = await this.repository.updateSubscription(id, updateData);

    await this.repository.createAuditEvent({
      userId: sub.userId,
      action: 'Subscription Overridden',
      details: `Subscription status/expiry updated manually by admin`,
      performedBy: adminEmail,
    });

    return updated;
  }

  async manualUpgradeDowngrade(id: string, planId: string, adminEmail: string): Promise<Subscription> {
    const sub = await this.repository.getSubscriptionById(id);
    if (!sub) throw new NotFoundException('Subscription not found');

    const plan = await this.repository.getPlanById(planId);
    if (!plan) throw new NotFoundException('Target plan not found');

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1); // Default to 30 days extensions

    const updated = await this.repository.updateSubscription(id, {
      planId,
      status: 'active',
      expiryDate: expiry,
      trialEndsAt: null,
      graceEndsAt: null,
    });

    // Log plan history entry
    await this.repository.createAuditEvent({
      userId: sub.userId,
      action: 'Plan Manually Assigned',
      details: `Changed plan from "${sub.planId}" to "${plan.name}" by Admin override`,
      performedBy: adminEmail,
    });

    return updated;
  }

  // 7. User Details
  async getUsers(search?: string): Promise<User[]> {
    return this.repository.getUsers(search);
  }

  async getUserDetails(userId: string): Promise<any> {
    const user = await this.repository.getUserById(userId);
    if (!user) throw new NotFoundException('User not found');

    const usage = await this.repository.getUserUsage(userId);
    const history = await this.repository.getUserSubscriptionHistory(userId);
    const logs = await this.repository.getUserAuditLogs(userId);

    return {
      user,
      usage,
      history,
      logs,
    };
  }

  async disableUserAccount(id: string, active: boolean, adminEmail: string): Promise<User> {
    const user = await this.repository.getUserById(id);
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.repository.disableUserAccount(id, active);

    await this.repository.createAuditEvent({
      userId: id,
      action: active ? 'Account Restored' : 'Account Disabled',
      details: `User account status set to active=${active} by Admin`,
      performedBy: adminEmail,
    });

    return updated;
  }

  async forceLogout(id: string, adminEmail: string): Promise<{ success: boolean }> {
    const user = await this.repository.getUserById(id);
    if (!user) throw new NotFoundException('User not found');

    // To simulate force logout, we invalidate their active state temporarily,
    // or alter password to trigger JWT re-verification on their next API handshake,
    // or set a flag. Here we append a random string to the user password hash
    // to invalidate the matching profile in JwtAuthGuard.
    const newHashedPass = await bcrypt.hash('FORCELOGOUT-' + Math.random().toString(), 10);
    await this.repository.disableUserAccount(id, false); // Disable to lock immediately

    await this.repository.createAuditEvent({
      userId: id,
      action: 'Force Logout',
      details: `Session revoked and account suspended by Admin`,
      performedBy: adminEmail,
    });

    return { success: true };
  }

  // 8. AI Config
  async updateAiConfig(key: string, value: any, description: string, adminEmail: string) {
    const config = await this.repository.upsertAiConfig(key, value, description);

    await this.repository.createAuditEvent({
      userId: null,
      action: 'AI Config Updated',
      details: `Modified AI setting key "${key}" to custom value`,
      performedBy: adminEmail,
    });

    return config;
  }

  async getAiConfigs() {
    return this.repository.getAiConfigs();
  }

  // 9. Dashboard Analytics
  async getDashboardAnalytics() {
    const totalUsers = await this.repository.totalUsers();
    const activeUsers = await this.repository.activeUsers();
    const trialUsers = await this.repository.trialUsersCount();

    const freeUsers = await this.repository.usersCountByPlanSlug('free');
    const silverUsers = await this.repository.usersCountByPlanSlug('silver');
    const goldUsers = await this.repository.usersCountByPlanSlug('gold');
    const enterpriseUsers = await this.repository.usersCountByPlanSlug('enterprise');

    const totalRevenue = await this.repository.completedPaymentsSum();

    // Calculate MRR/ARR based on active subscriptions monthlyPrices
    const activeSubs = await this.repository.activePaidSubscriptions();
    let mrr = 0;
    activeSubs.forEach(s => {
      if (s.plan) {
        mrr += s.plan.monthlyPrice; // Simple MRR aggregation
      }
    });
    const arr = mrr * 12;

    // Expiring Subscriptions (next 7 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + 7);
    const expiringSubscriptions = await this.repository.expiringSubscriptionsCount(cutoffDate);

    // Most Used Features
    const rawUsage = await this.repository.getMostUsedFeatures();
    const sortedFeatures = rawUsage.sort((a, b) => (b._sum.used || 0) - (a._sum.used || 0));

    // AI Stats
    const aiStats = await this.repository.getAiUsageStats();
    let aiChatCount = 0;
    let voiceCount = 0;
    let scanCount = 0;
    aiStats.forEach(stat => {
      if (stat.feature.code === 'AI_CHAT') aiChatCount += stat.used;
      if (stat.feature.code === 'VOICE_ASSISTANT') voiceCount += stat.used;
      if (stat.feature.code === 'SMART_SCAN') scanCount += stat.used;
    });

    return {
      metrics: {
        totalUsers,
        activeUsers,
        trialUsers,
        freeUsers,
        silverUsers,
        goldUsers,
        enterpriseUsers,
        totalRevenue,
        mrr,
        arr,
        expiringSubscriptions,
      },
      mostUsedFeatures: sortedFeatures.slice(0, 5),
      aiUsage: {
        aiChatCount,
        voiceCount,
        scanCount,
      },
    };
  }
}
