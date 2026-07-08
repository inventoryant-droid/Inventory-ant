import { Injectable, Inject } from '@nestjs/common';
import { CacheProvider } from './cache.interface';

@Injectable()
export class CacheService {
  constructor(
    @Inject('CacheProvider') private readonly cacheProvider: CacheProvider,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    return this.cacheProvider.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.cacheProvider.set<T>(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.cacheProvider.del(key);
  }

  async clear(): Promise<void> {
    await this.cacheProvider.clear();
  }

  /**
   * Helper function to wrap key lookup and function execution with caching.
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cachedValue = await this.get<T>(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    const freshValue = await fn();
    await this.set<T>(key, freshValue, ttlSeconds);
    return freshValue;
  }
}
