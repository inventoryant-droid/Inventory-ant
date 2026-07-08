import { Subscription, Plan, Feature, PlanFeature, FeatureUsage } from '@prisma/client';

export interface IFeatureLimit {
  code: string;
  enabled: boolean;
  limitValue: number | null;
  metadata?: any;
}

export interface ISubscriptionWithPlan extends Subscription {
  plan: Plan & {
    features: (PlanFeature & {
      feature: Feature;
    })[];
  };
}

export interface IUsageStatus {
  featureCode: string;
  limitValue: number | null;
  used: number;
  remaining: number | null;
  resetDate: Date;
}
