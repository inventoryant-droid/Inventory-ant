import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionRepository } from './subscription.repository';
import { Plan, PlanFeature } from '@prisma/client';
import { CacheService } from '../saas/cache/cache.service';

@Injectable()
export class PlanService {
  constructor(
    private readonly repository: SubscriptionRepository,
    private readonly cacheService: CacheService,
  ) {}

  async getPlans(): Promise<Plan[]> {
    const cacheKey = 'plans:all';
    return this.cacheService.wrap(cacheKey, async () => {
      return this.repository.findAllPlans();
    }, 300); // 5 minutes TTL
  }

  async getPlanBySlug(slug: string): Promise<Plan> {
    const cacheKey = `plans:slug:${slug}`;
    return this.cacheService.wrap(cacheKey, async () => {
      const plan = await this.repository.findPlanBySlug(slug);
      if (!plan) {
        throw new NotFoundException(`Plan with slug ${slug} not found`);
      }
      return plan;
    }, 300);
  }

  async getPlanById(id: string): Promise<Plan> {
    const cacheKey = `plans:id:${id}`;
    return this.cacheService.wrap(cacheKey, async () => {
      const plan = await this.repository.findPlanById(id);
      if (!plan) {
        throw new NotFoundException(`Plan with ID ${id} not found`);
      }
      return plan;
    }, 300);
  }

  async getPlanFeatureConfig(planId: string, featureId: string): Promise<PlanFeature | null> {
    const cacheKey = `plans:features:${planId}:${featureId}`;
    return this.cacheService.wrap(cacheKey, async () => {
      return this.repository.findPlanFeature(planId, featureId);
    }, 300);
  }
}
