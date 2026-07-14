import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import {
  CreatePlanDto, UpdatePlanDto, CreateFeatureDto, UpdateFeatureDto,
  MapFeatureDto, CreateCouponDto, UpdateCouponDto, CreateFeatureFlagDto,
  UpdateFeatureFlagDto, ManageSubscriptionDto, UpdateAiConfigDto
} from './admin.dto';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // 1. Dashboard Metrics
  @Get('dashboard')
  async getDashboardAnalytics() {
    return this.adminService.getDashboardAnalytics();
  }

  // 1b. Advanced Business Analytics
  @Get('analytics')
  async getBusinessAnalytics() {
    return this.adminService.getBusinessAnalytics();
  }

  // 2. Plan Management
  @Get('plans')
  async getPlans() {
    return this.adminService.getPlans();
  }

  @Post('plans')
  async createPlan(@Req() req: any, @Body() dto: CreatePlanDto) {
    return this.adminService.createPlan(dto, req.user.email);
  }

  @Put('plans/:id')
  async updatePlan(@Req() req: any, @Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.adminService.updatePlan(id, dto, req.user.email);
  }

  @Delete('plans/:id')
  async deletePlan(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deletePlan(id, req.user.email);
  }

  @Post('plans/reorder')
  async reorderPlans(@Req() req: any, @Body() body: { planIds: string[] }) {
    return this.adminService.reorderPlans(body.planIds, req.user.email);
  }

  // 3. Feature Management
  @Get('features')
  async getFeatures() {
    return this.adminService.getFeatures();
  }

  @Post('features')
  async createFeature(@Req() req: any, @Body() dto: CreateFeatureDto) {
    return this.adminService.createFeature(dto, req.user.email);
  }

  @Put('features/:id')
  async updateFeature(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateFeatureDto) {
    return this.adminService.updateFeature(id, dto, req.user.email);
  }

  @Delete('features/:id')
  async deleteFeature(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deleteFeature(id, req.user.email);
  }

  // 4. Plan Feature Mapping
  @Post('mappings')
  async assignFeatureToPlan(@Req() req: any, @Body() dto: MapFeatureDto) {
    return this.adminService.assignFeatureToPlan(dto, req.user.email);
  }

  @Delete('mappings/:planId/:featureId')
  async removeFeatureFromPlan(
    @Req() req: any,
    @Param('planId') planId: string,
    @Param('featureId') featureId: string,
  ) {
    return this.adminService.removeFeatureFromPlan(planId, featureId, req.user.email);
  }

  @Get('mappings/:planId')
  async getPlanFeatures(@Param('planId') planId: string) {
    return this.adminService.getPlanFeatures(planId);
  }

  // 5. Coupon Management
  @Get('coupons')
  async getCoupons() {
    return this.adminService.getCoupons();
  }

  @Post('coupons')
  async createCoupon(@Req() req: any, @Body() dto: CreateCouponDto) {
    return this.adminService.createCoupon(dto, req.user.email);
  }

  @Put('coupons/:id')
  async updateCoupon(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.adminService.updateCoupon(id, dto, req.user.email);
  }

  @Delete('coupons/:id')
  async deleteCoupon(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deleteCoupon(id, req.user.email);
  }

  // 6. Feature Flags
  @Get('feature-flags')
  async getFeatureFlags() {
    return this.adminService.getFeatureFlags();
  }

  @Post('feature-flags')
  async createFeatureFlag(@Req() req: any, @Body() dto: CreateFeatureFlagDto) {
    return this.adminService.createFeatureFlag(dto, req.user.email);
  }

  @Put('feature-flags/:id')
  async updateFeatureFlag(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateFeatureFlagDto) {
    return this.adminService.updateFeatureFlag(id, dto, req.user.email);
  }

  @Delete('feature-flags/:id')
  async deleteFeatureFlag(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deleteFeatureFlag(id, req.user.email);
  }

  // 7. Subscription Override
  @Get('subscriptions')
  async getSubscriptions(@Query('search') search?: string) {
    return this.adminService.getSubscriptions(search);
  }

  @Put('subscriptions/:id')
  async manageSubscription(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ManageSubscriptionDto,
  ) {
    return this.adminService.manageSubscription(id, dto, req.user.email);
  }

  @Post('subscriptions/:id/assign-plan')
  async manualUpgradeDowngrade(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { planId: string },
  ) {
    return this.adminService.manualUpgradeDowngrade(id, body.planId, req.user.email);
  }

  // 8. User Management
  @Get('users')
  async getUsers(@Query('search') search?: string) {
    return this.adminService.getUsers(search);
  }

  @Get('deleted-users')
  async getDeletedUsers() {
    return this.adminService.getDeletedUsers();
  }

  @Get('users/:id/details')
  async getUserDetails(@Param('id') id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Post('users/:id/disable')
  async disableUserAccount(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { active: boolean },
  ) {
    return this.adminService.disableUserAccount(id, body.active, req.user.email);
  }

  @Post('users/:id/force-logout')
  async forceLogout(@Req() req: any, @Param('id') id: string) {
    return this.adminService.forceLogout(id, req.user.email);
  }

  @Delete('users/:id')
  async permanentlyDeleteUser(@Req() req: any, @Param('id') id: string) {
    return this.adminService.permanentlyDeleteUser(id, req.user.email);
  }

  // 9. AI Configuration
  @Get('ai-config')
  async getAiConfigs() {
    return this.adminService.getAiConfigs();
  }

  @Post('ai-config')
  async updateAiConfig(@Req() req: any, @Body() dto: UpdateAiConfigDto) {
    return this.adminService.updateAiConfig(dto.key, dto.value, dto.description || '', req.user.email);
  }
}
