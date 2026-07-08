export const SubscriptionConfig = {
  CACHE_TTL_MS: Number(process.env.SUBSCRIPTION_CACHE_TTL_MS) || 5 * 60 * 1000, // 5 minutes
  DEFAULT_TRIAL_DAYS: Number(process.env.SUBSCRIPTION_DEFAULT_TRIAL_DAYS) || 30,
  GRACE_PERIOD_DAYS: Number(process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS) || 3,
};
