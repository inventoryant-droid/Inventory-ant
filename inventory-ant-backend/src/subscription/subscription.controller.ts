import { Controller, Get, Post, Body, Req, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { SubscriptionRepository } from './subscription.repository';
import {
  ChangePlanDto, RenewSubscriptionDto, CancelSubscriptionDto,
  StartTrialDto, ApplyCouponDto, PreviewPlanDto
} from './subscription.dto';
import { PriceCalculationService } from './price-calculation.service';
import { PlanService } from './plan.service';

@Controller('api/subscription')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly priceCalculationService: PriceCalculationService,
    private readonly planService: PlanService,
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  @Get('plans')
  async getPlans() {
    return this.planService.getPlans();
  }

  @Get('plans/compare')
  async comparePlans() {
    const plans = await this.planService.getPlans();
    const features = await this.subscriptionRepository.findAllFeatures();
    const compareMatrix = [];

    for (const feat of features) {
      const row: any = {
        featureId: feat.id,
        featureName: feat.name,
        featureCode: feat.code,
        category: feat.category,
      };
      for (const plan of plans) {
        const config = await this.planService.getPlanFeatureConfig(plan.id, feat.id);
        row[plan.slug] = config ? {
          allowed: true,
          limitValue: config.limitValue,
        } : {
          allowed: false,
          limitValue: 0,
        };
      }
      compareMatrix.push(row);
    }
    return compareMatrix;
  }

  @UseGuards(JwtAuthGuard)
  @Get('current')
  async getCurrentSubscription(@Req() req: any) {
    const userId = req.user.sub;
    const sub = await this.subscriptionService.getActiveSubscription(userId);
    const plan = await this.subscriptionService.getCurrentPlan(userId);
    return {
      active: !!sub,
      subscription: sub,
      plan: plan,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('usage')
  async getUserUsages(@Req() req: any) {
    const userId = req.user.sub;
    const codes = ['INVENTORY', 'STAFF', 'AI_CHAT', 'VOICE_ASSISTANT', 'SMART_SCAN', 'ANALYTICS'];
    const usages: Record<string, any> = {};
    for (const code of codes) {
      usages[code] = await this.subscriptionService.getUsage(userId, code);
    }
    return usages;
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getSubscriptionHistory(@Req() req: any) {
    const userId = req.user.sub;
    return this.subscriptionService.getSubscriptionHistory(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('billing-history')
  async getBillingHistory(@Req() req: any) {
    const userId = req.user.sub;
    return (this.subscriptionRepository as any).prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('upcoming-renewal')
  async getUpcomingRenewal(@Req() req: any) {
    const userId = req.user.sub;
    const sub = await this.subscriptionService.getActiveSubscription(userId);
    if (!sub) return { hasUpcomingRenewal: false };

    const plan = await this.subscriptionRepository.findPlanById(sub.planId);
    if (!plan) return { hasUpcomingRenewal: false };

    const pricing = await this.priceCalculationService.calculatePricing(
      plan.id,
      sub.billingCycle === 'yearly' ? 'yearly' : 'monthly'
    );

    return {
      hasUpcomingRenewal: sub.status === 'active' && !sub.cancelledAt,
      renewalDate: sub.expiryDate,
      planName: plan.name,
      amount: pricing.renewalAmount,
      currency: plan.currency,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('apply-coupon')
  @HttpCode(HttpStatus.OK)
  async applyCoupon(@Req() req: any, @Body() body: ApplyCouponDto) {
    return this.priceCalculationService.calculatePricing(
      body.planId,
      body.billingCycle,
      body.code
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('upgrade-preview')
  @HttpCode(HttpStatus.OK)
  async previewUpgrade(@Req() req: any, @Body() body: PreviewPlanDto) {
    const pricing = await this.priceCalculationService.calculatePricing(
      body.targetPlanId,
      body.billingCycle,
      body.couponCode
    );
    return {
      type: 'upgrade',
      ...pricing,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('downgrade-preview')
  @HttpCode(HttpStatus.OK)
  async previewDowngrade(@Req() req: any, @Body() body: PreviewPlanDto) {
    const pricing = await this.priceCalculationService.calculatePricing(
      body.targetPlanId,
      body.billingCycle,
      body.couponCode
    );
    return {
      type: 'downgrade',
      ...pricing,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel-preview')
  @HttpCode(HttpStatus.OK)
  async previewCancel(@Req() req: any) {
    const userId = req.user.sub;
    const sub = await this.subscriptionService.getActiveSubscription(userId);
    if (!sub) {
      throw new BadRequestException('No active subscription to cancel');
    }
    return {
      status: sub.status,
      accessEndsAt: sub.expiryDate,
      gracePeriodDays: 3,
      message: `You will continue to have access to premium features until ${sub.expiryDate.toISOString()}. After this, your account will downgrade to the free tier.`,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('resume-preview')
  @HttpCode(HttpStatus.OK)
  async previewResume(@Req() req: any) {
    const userId = req.user.sub;
    const sub = await this.subscriptionService.getActiveSubscription(userId);
    if (!sub) {
      throw new BadRequestException('No subscription found');
    }
    const plan = await this.subscriptionRepository.findPlanById(sub.planId);
    if (!plan) throw new BadRequestException('Plan not found');
    const pricing = await this.priceCalculationService.calculatePricing(plan.id, 'monthly');
    return {
      nextBillingDate: sub.expiryDate,
      renewalAmount: pricing.renewalAmount,
      currency: plan.currency,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-plan')
  @HttpCode(HttpStatus.OK)
  async changePlan(@Req() req: any, @Body() body: ChangePlanDto) {
    const userId = req.user.sub;
    return this.subscriptionService.changePlan(userId, body.planSlug, body.billingCycle);
  }

  @UseGuards(JwtAuthGuard)
  @Post('renew')
  @HttpCode(HttpStatus.OK)
  async renewSubscription(@Req() req: any, @Body() body: RenewSubscriptionDto) {
    const userId = req.user.sub;
    return this.subscriptionService.renewPlan(userId, body.paymentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@Req() req: any, @Body() body: CancelSubscriptionDto) {
    const userId = req.user.sub;
    return this.subscriptionService.cancelPlan(userId, body.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Post('resume')
  @HttpCode(HttpStatus.OK)
  async resumeSubscription(@Req() req: any) {
    const userId = req.user.sub;
    return this.subscriptionService.resumePlan(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('start-trial')
  async startTrial(@Req() req: any, @Body() body: StartTrialDto) {
    const userId = req.user.sub;
    return this.subscriptionService.startTrial(userId, body.planSlug);
  }
}
