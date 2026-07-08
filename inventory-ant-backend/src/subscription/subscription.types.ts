export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled' | 'grace' | 'suspended';
export type BillingCycle = 'monthly' | 'yearly';
export type AuditActionType =
  | 'Subscription Created'
  | 'Subscription Activated'
  | 'Subscription Renewed'
  | 'Plan Changed'
  | 'Trial Started'
  | 'Trial Ended'
  | 'Subscription Expired'
  | 'Subscription Cancelled'
  | 'Subscription Resumed'
  | 'Usage Reset';
