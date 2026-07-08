import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  points: number;       // Number of allowed hits
  duration: number;     // Window size in seconds
  limitBy?: 'ip' | 'user' | 'endpoint' | 'all'; // Default limit mechanism
}

export const RATE_LIMIT_KEY = 'rate_limit_options';
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
