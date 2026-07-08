import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional, IsEnum, IsDateString, IsJSON } from 'class-validator';

// 1. Plan DTOs
export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  monthlyPrice: number;

  @IsNumber()
  yearlyPrice: number;

  @IsNumber()
  @IsOptional()
  trialDays?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsBoolean()
  @IsOptional()
  popularBadge?: boolean;

  @IsBoolean()
  @IsOptional()
  recommendedBadge?: boolean;

  @IsBoolean()
  @IsOptional()
  visibility?: boolean;

  @IsNumber()
  @IsOptional()
  gracePeriod?: number;
}

export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  monthlyPrice?: number;

  @IsNumber()
  @IsOptional()
  yearlyPrice?: number;

  @IsNumber()
  @IsOptional()
  trialDays?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsBoolean()
  @IsOptional()
  popularBadge?: boolean;

  @IsBoolean()
  @IsOptional()
  recommendedBadge?: boolean;

  @IsBoolean()
  @IsOptional()
  visibility?: boolean;

  @IsNumber()
  @IsOptional()
  gracePeriod?: number;
}

// 2. Feature DTOs
export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  groupName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateFeatureDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  groupName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// 3. PlanFeature Mapping DTOs
export class MapFeatureDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsString()
  @IsNotEmpty()
  featureId: string;

  @IsNumber()
  @IsOptional()
  limitValue?: number | null;

  @IsBoolean()
  @IsOptional()
  isUnlimited?: boolean;
}

// 4. Coupon DTOs
export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  discountType: 'percentage' | 'fixed';

  @IsNumber()
  discountValue: number;

  @IsNumber()
  @IsOptional()
  maximumDiscount?: number;

  @IsNumber()
  @IsOptional()
  minimumAmount?: number;

  @IsNumber()
  @IsOptional()
  usageLimit?: number;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validTill: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  @IsOptional()
  planId?: string;
}

export class UpdateCouponDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  discountType?: 'percentage' | 'fixed';

  @IsNumber()
  @IsOptional()
  discountValue?: number;

  @IsNumber()
  @IsOptional()
  maximumDiscount?: number;

  @IsNumber()
  @IsOptional()
  minimumAmount?: number;

  @IsNumber()
  @IsOptional()
  usageLimit?: number;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validTill?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  @IsOptional()
  planId?: string;
}

// 5. FeatureFlag DTOs
export class CreateFeatureFlagDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsOptional()
  conditions?: any;
}

export class UpdateFeatureFlagDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsOptional()
  conditions?: any;
}

// 6. Subscription Management DTOs
export class ManageSubscriptionDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsDateString()
  @IsOptional()
  trialEndsAt?: string;

  @IsDateString()
  @IsOptional()
  graceEndsAt?: string;

  @IsDateString()
  @IsOptional()
  nextBillingDate?: string;
}

// 7. AI Config DTO
export class UpdateAiConfigDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsNotEmpty()
  value: any;

  @IsString()
  @IsOptional()
  description?: string;
}
