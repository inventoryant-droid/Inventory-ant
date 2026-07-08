import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionRepository } from './subscription.repository';
import { Plan, PlanFeature } from '@prisma/client';
import { SubscriptionConfig } from './subscription.config';

@Injectable()
export class PlanService {
  private planCache = new Map<string, { data: Plan; expiry: number }>();
  private planIdCache = new Map<string, { data: Plan; expiry: number }>();
  private allPlansCache: { data: Plan[]; expiry: number } | null = null;
  private planFeatureCache = new Map<string, { data: PlanFeature | null; expiry: number }>();

  constructor(private readonly repository: SubscriptionRepository) {}

  private getFromCache<T>(cacheMap: Map<string, { data: T; expiry: number }>, key: string): T | null {
    const cached = cacheMap.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    return null;
  }

  private setToCache<T>(cacheMap: Map<string, { data: T; expiry: number }>, key: string, data: T) {
    cacheMap.set(key, { data, expiry: Date.now() + SubscriptionConfig.CACHE_TTL_MS });
  }

  async getPlans(): Promise<Plan[]> {
    if (this.allPlansCache && this.allPlansCache.expiry > Date.now()) {
      return this.allPlansCache.data;
    }
    const plans = await this.repository.findAllPlans();
    this.allPlansCache = { data: plans, expiry: Date.now() + SubscriptionConfig.CACHE_TTL_MS };
    return plans;
  }

  async getPlanBySlug(slug: string): Promise<Plan> {
    const cached = this.getFromCache(this.planCache, slug);
    if (cached) return cached;

    const plan = await this.repository.findPlanBySlug(slug);
    if (!plan) {
      throw new NotFoundException(`Plan with slug ${slug} not found`);
    }
    this.setToCache(this.planCache, slug, plan);
    return plan;
  }

  async getPlanById(id: string): Promise<Plan> {
    const cached = this.getFromCache(this.planIdCache, id);
    if (cached) return cached;

    const plan = await this.repository.findPlanById(id);
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }
    this.setToCache(this.planIdCache, id, plan);
    return plan;
  }

  async getPlanFeatureConfig(planId: string, featureId: string): Promise<PlanFeature | null> {
    const cacheKey = `${planId}_${featureId}`;
    const cached = this.getFromCache(this.planFeatureCache, cacheKey);
    if (cached !== null) return cached;

    const config = await this.repository.findPlanFeature(planId, featureId);
    this.setToCache(this.planFeatureCache, cacheKey, config);
    return config;
  }
}
