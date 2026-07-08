import { Injectable } from '@nestjs/common';
import { PlanService } from './plan.service';
import { FeatureService } from './feature.service';
import { UsageService } from './usage.service';
import { AuditService } from './audit.service';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';
import { Subscription, Plan, Feature, PlanFeature, FeatureUsage, PlanHistory, AuditEvent } from '@prisma/client';
import { ISubscriptionWithPlan, IUsageStatus } from './subscription.interfaces';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly planService: PlanService,
    private readonly featureService: FeatureService,
    private readonly usageService: UsageService,
    private readonly auditService: AuditService,
    private readonly lifecycleService: SubscriptionLifecycleService,
  ) {}

  // --- Plan Service Delegations ---
  async getPlans(): Promise<Plan[]> {
    return this.planService.getPlans();
  }

  async getPlanBySlug(slug: string): Promise<Plan> {
    return this.planService.getPlanBySlug(slug);
  }

  async getPlanFeatureConfig(planId: string, featureId: string): Promise<PlanFeature | null> {
    return this.planService.getPlanFeatureConfig(planId, featureId);
  }

  // --- Feature Service Delegations ---
  async getFeatureByCode(code: string): Promise<Feature> {
    return this.featureService.getFeatureByCode(code);
  }

  // --- Usage Service Delegations ---
  async getCurrentPlan(userId: string): Promise<Plan> {
    return this.usageService.getCurrentPlan(userId);
  }

  async hasFeature(userId: string, featureCode: string): Promise<boolean> {
    return this.usageService.hasFeature(userId, featureCode);
  }

  async canAccessFeature(userId: string, featureCode: string): Promise<boolean> {
    return this.usageService.canAccessFeature(userId, featureCode);
  }

  async getUsage(userId: string, featureCode: string): Promise<IUsageStatus> {
    return this.usageService.getUsage(userId, featureCode);
  }

  async getRemainingUsage(userId: string, featureCode: string): Promise<number | null> {
    return this.usageService.getRemainingUsage(userId, featureCode);
  }

  async incrementUsage(userId: string, featureCode: string, amount = 1): Promise<IUsageStatus> {
    return this.usageService.incrementUsage(userId, featureCode, amount);
  }

  async resetMonthlyUsage(month?: number, year?: number): Promise<void> {
    return this.usageService.resetMonthlyUsage(month, year);
  }

  // --- Lifecycle Service Delegations ---
  async getSubscriptionByUser(userId: string): Promise<ISubscriptionWithPlan | null> {
    return this.lifecycleService.getSubscriptionByUser(userId);
  }

  async getSubscriptionHistory(userId: string): Promise<Subscription[]> {
    return this.lifecycleService.getSubscriptionHistory(userId);
  }

  async getActiveSubscription(userId: string): Promise<ISubscriptionWithPlan | null> {
    return this.lifecycleService.getActiveSubscription(userId);
  }

  async startTrial(userId: string, planSlug: string): Promise<Subscription> {
    return this.lifecycleService.startTrial(userId, planSlug);
  }

  async changePlan(
    userId: string,
    planSlug: string,
    billingCycle: 'monthly' | 'yearly',
    changedBy = 'user',
    reason = 'Plan upgrade/downgrade',
  ): Promise<Subscription> {
    return this.lifecycleService.changePlan(userId, planSlug, billingCycle, changedBy, reason);
  }

  async renewPlan(userId: string, paymentId?: string): Promise<Subscription> {
    return this.lifecycleService.renewPlan(userId, paymentId);
  }

  async cancelPlan(userId: string, reason?: string): Promise<Subscription> {
    return this.lifecycleService.cancelPlan(userId, reason);
  }

  async resumePlan(userId: string): Promise<Subscription> {
    return this.lifecycleService.resumePlan(userId);
  }

  async expireTrial(userId: string): Promise<Subscription> {
    return this.lifecycleService.expireTrial(userId);
  }

  async deactivateSubscription(userId: string): Promise<Subscription> {
    return this.lifecycleService.deactivateSubscription(userId);
  }

  async syncUserPlanAndValidity(userId: string): Promise<void> {
    return this.lifecycleService.syncUserPlanAndValidity(userId);
  }

  async syncUserPlanAndValidityByEmail(email: string): Promise<void> {
    return this.lifecycleService.syncUserPlanAndValidityByEmail(email);
  }

  // --- Audit Service Delegations ---
  async logPlanChange(userId: string, oldPlan: string | null, newPlan: string, reason: string | null, changedBy: string): Promise<PlanHistory> {
    return this.auditService.logPlanChange(userId, oldPlan, newPlan, reason, changedBy);
  }

  async logAuditEvent(userId: string | null, action: string, details: string | null, performedBy: string, ipAddress?: string | null): Promise<AuditEvent> {
    return this.auditService.logAuditEvent(userId, action, details, performedBy, ipAddress);
  }
}
