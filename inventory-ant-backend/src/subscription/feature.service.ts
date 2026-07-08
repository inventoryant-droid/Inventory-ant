import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionRepository } from './subscription.repository';
import { Feature } from '@prisma/client';
import { SubscriptionConfig } from './subscription.config';

@Injectable()
export class FeatureService {
  private featureCache = new Map<string, { data: Feature; expiry: number }>();

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

  async getFeatureByCode(code: string): Promise<Feature> {
    const cached = this.getFromCache(this.featureCache, code);
    if (cached) return cached;

    const feature = await this.repository.findFeatureByCode(code);
    if (!feature) {
      throw new NotFoundException(`Feature with code ${code} not found`);
    }
    this.setToCache(this.featureCache, code, feature);
    return feature;
  }
}
