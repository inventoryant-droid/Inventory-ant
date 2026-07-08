import { IsNotEmpty, IsString, IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';

export class CreateSubscriptionDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  planId: string;

  @IsNotEmpty()
  @IsEnum(['monthly', 'yearly'])
  billingCycle: 'monthly' | 'yearly';
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsEnum(['monthly', 'yearly'])
  billingCycle?: 'monthly' | 'yearly';

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

export class ChangePlanDto {
  @IsNotEmpty()
  @IsString()
  planSlug: string;

  @IsNotEmpty()
  @IsEnum(['monthly', 'yearly'])
  billingCycle: 'monthly' | 'yearly';
}

export class RenewSubscriptionDto {
  @IsOptional()
  @IsString()
  paymentId?: string;
}

export class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ResumeSubscriptionDto {}

export class StartTrialDto {
  @IsNotEmpty()
  @IsString()
  planSlug: string;
}

export class ExpireTrialDto {
  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class ApplyCouponDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  planId: string;

  @IsNotEmpty()
  @IsEnum(['monthly', 'yearly'])
  billingCycle: 'monthly' | 'yearly';
}

export class PreviewPlanDto {
  @IsNotEmpty()
  @IsString()
  targetPlanId: string;

  @IsNotEmpty()
  @IsEnum(['monthly', 'yearly'])
  billingCycle: 'monthly' | 'yearly';

  @IsOptional()
  @IsString()
  couponCode?: string;
}
