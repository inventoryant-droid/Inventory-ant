import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionRepository } from './subscription.repository';
import { Feature } from '@prisma/client';
import { CacheService } from '../saas/cache/cache.service';

@Injectable()
export class FeatureService {
  constructor(
    private readonly repository: SubscriptionRepository,
    private readonly cacheService: CacheService,
  ) {}

  async getFeatureByCode(code: string): Promise<Feature> {
    const cacheKey = `features:code:${code}`;
    return this.cacheService.wrap(cacheKey, async () => {
      const feature = await this.repository.findFeatureByCode(code);
      if (!feature) {
        throw new NotFoundException(`Feature with code ${code} not found`);
      }
      return feature;
    }, 300); // 5 minutes TTL
  }
}
