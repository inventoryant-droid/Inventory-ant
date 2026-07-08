import { Controller, Get, Post, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { ChangePlanDto, RenewSubscriptionDto, CancelSubscriptionDto, StartTrialDto } from './subscription.dto';

@Controller('api/subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

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

  @Get('history')
  async getSubscriptionHistory(@Req() req: any) {
    const userId = req.user.sub;
    return this.subscriptionService.getSubscriptionHistory(userId);
  }

  @Post('change-plan')
  @HttpCode(HttpStatus.OK)
  async changePlan(@Req() req: any, @Body() body: ChangePlanDto) {
    const userId = req.user.sub;
    return this.subscriptionService.changePlan(userId, body.planSlug, body.billingCycle);
  }

  @Post('renew')
  @HttpCode(HttpStatus.OK)
  async renewSubscription(@Req() req: any, @Body() body: RenewSubscriptionDto) {
    const userId = req.user.sub;
    return this.subscriptionService.renewPlan(userId, body.paymentId);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@Req() req: any, @Body() body: CancelSubscriptionDto) {
    const userId = req.user.sub;
    return this.subscriptionService.cancelPlan(userId, body.reason);
  }

  @Post('resume')
  @HttpCode(HttpStatus.OK)
  async resumeSubscription(@Req() req: any) {
    const userId = req.user.sub;
    return this.subscriptionService.resumePlan(userId);
  }

  @Post('start-trial')
  async startTrial(@Req() req: any, @Body() body: StartTrialDto) {
    const userId = req.user.sub;
    return this.subscriptionService.startTrial(userId, body.planSlug);
  }
}
