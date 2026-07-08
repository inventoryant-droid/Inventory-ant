import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const CURRENT_SUBSCRIPTION_KEY = 'current_subscription';
export const REQUIRE_FEATURE_KEY = 'require_feature';
export const REQUIRE_LIMIT_KEY = 'require_limit';

export const CurrentSubscription = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.subscription || null;
  },
);

export const RequireSubscription = () => SetMetadata(CURRENT_SUBSCRIPTION_KEY, true);

export const RequireFeature = (featureCode: string) => SetMetadata(REQUIRE_FEATURE_KEY, featureCode);

export const RequireLimit = (featureCode: string, amount = 1) => SetMetadata(REQUIRE_LIMIT_KEY, { featureCode, amount });
