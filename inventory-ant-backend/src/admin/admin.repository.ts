import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Plan, Feature, PlanFeature, Coupon, FeatureFlag, Subscription, User, AuditEvent, AiConfig } from '@prisma/client';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Plan Management
  async createPlan(data: any): Promise<Plan> {
    return this.prisma.plan.create({ data });
  }

  async updatePlan(id: string, data: any): Promise<Plan> {
    return this.prisma.plan.update({ where: { id }, data });
  }

  async getPlanById(id: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({ where: { id } });
  }

  async getPlanBySlug(slug: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({ where: { slug } });
  }

  async getPlans(): Promise<Plan[]> {
    return this.prisma.plan.findMany({ 
      orderBy: { displayOrder: 'asc' },
      include: { features: true }
    });
  }

  async deletePlan(id: string): Promise<Plan> {
    // Check if the plan is used by any subscription
    const usageCount = await this.prisma.subscription.count({
      where: { planId: id },
    });
    if (usageCount > 0) {
      throw new BadRequestException('Cannot delete plan: Plan is currently active on users subscriptions.');
    }
    return this.prisma.plan.delete({ where: { id } });
  }

  // 2. Feature Management
  async createFeature(data: any): Promise<Feature> {
    return this.prisma.feature.create({ data });
  }

  async updateFeature(id: string, data: any): Promise<Feature> {
    return this.prisma.feature.update({ where: { id }, data });
  }

  async deleteFeature(id: string): Promise<Feature> {
    return this.prisma.feature.delete({ where: { id } });
  }

  async getFeatures(): Promise<Feature[]> {
    return this.prisma.feature.findMany({ orderBy: { name: 'asc' } });
  }

  async getFeatureById(id: string): Promise<Feature | null> {
    return this.prisma.feature.findUnique({ where: { id } });
  }

  async getFeatureByCode(code: string): Promise<Feature | null> {
    return this.prisma.feature.findUnique({ where: { code } });
  }

  // 3. PlanFeature Mapping
  async assignFeatureToPlan(data: { planId: string; featureId: string; limitValue?: number | null }): Promise<PlanFeature> {
    return this.prisma.planFeature.upsert({
      where: {
        planId_featureId: {
          planId: data.planId,
          featureId: data.featureId,
        },
      },
      create: {
        planId: data.planId,
        featureId: data.featureId,
        limitValue: data.limitValue !== undefined ? data.limitValue : null,
      },
      update: {
        limitValue: data.limitValue !== undefined ? data.limitValue : null,
      },
    });
  }

  async removeFeatureFromPlan(planId: string, featureId: string): Promise<PlanFeature> {
    return this.prisma.planFeature.delete({
      where: {
        planId_featureId: {
          planId,
          featureId,
        },
      },
    });
  }

  async getPlanFeatures(planId: string): Promise<PlanFeature[]> {
    return this.prisma.planFeature.findMany({
      where: { planId },
      include: { feature: true },
    });
  }

  // 4. Coupon Management
  async createCoupon(data: any): Promise<Coupon> {
    return this.prisma.coupon.create({ data });
  }

  async updateCoupon(id: string, data: any): Promise<Coupon> {
    return this.prisma.coupon.update({ where: { id }, data });
  }

  async deleteCoupon(id: string): Promise<Coupon> {
    return this.prisma.coupon.delete({ where: { id } });
  }

  async getCoupons(): Promise<Coupon[]> {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
  }

  async getCouponById(id: string): Promise<Coupon | null> {
    return this.prisma.coupon.findUnique({ where: { id } });
  }

  // 5. Feature Flags
  async createFeatureFlag(data: any): Promise<FeatureFlag> {
    return this.prisma.featureFlag.create({ data });
  }

  async updateFeatureFlag(id: string, data: any): Promise<FeatureFlag> {
    return this.prisma.featureFlag.update({ where: { id }, data });
  }

  async deleteFeatureFlag(id: string): Promise<FeatureFlag> {
    return this.prisma.featureFlag.delete({ where: { id } });
  }

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return this.prisma.featureFlag.findMany({ orderBy: { code: 'asc' } });
  }

  async getFeatureFlagById(id: string): Promise<FeatureFlag | null> {
    return this.prisma.featureFlag.findUnique({ where: { id } });
  }

  // 6. Subscription Management
  async getSubscriptions(search?: string, page?: number, limit?: number): Promise<any[]> {
    const where: any = {
      user: {
        role: { not: 'admin' }
      }
    };
    if (search) {
      where.AND = [
        { user: { role: { not: 'admin' } } },
        {
          OR: [
            { userId: { contains: search, mode: 'insensitive' } },
            { status: { contains: search, mode: 'insensitive' } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
          ]
        }
      ];
    }
    const take = limit ? Number(limit) : undefined;
    const skip = page && limit ? (Number(page) - 1) * Number(limit) : undefined;
    return this.prisma.subscription.findMany({
      where,
      include: { plan: true, user: true },
      orderBy: { updatedAt: 'desc' },
      take,
      skip,
    });
  }

  async getSubscriptionById(id: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({ where: { id } });
  }

  async updateSubscription(id: string, data: any): Promise<Subscription> {
    return this.prisma.subscription.update({ where: { id }, data });
  }

  // 7. User Details
  async getUsers(search?: string, page?: number, limit?: number): Promise<User[]> {
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
      ];
    }
    const take = limit ? Number(limit) : undefined;
    const skip = page && limit ? (Number(page) - 1) * Number(limit) : undefined;
    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getUserUsage(userId: string): Promise<any[]> {
    return this.prisma.featureUsage.findMany({
      where: { userId },
      include: { feature: true },
    });
  }

  async getUserSubscriptionHistory(userId: string): Promise<any[]> {
    return this.prisma.planHistory.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getUserAuditLogs(userId: string, page?: number, limit?: number): Promise<AuditEvent[]> {
    const take = limit ? Number(limit) : undefined;
    const skip = page && limit ? (Number(page) - 1) * Number(limit) : undefined;
    return this.prisma.auditEvent.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take,
      skip,
    });
  }

  async disableUserAccount(id: string, active: boolean): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { active },
    });
  }

  // 8. AI Config
  async upsertAiConfig(key: string, value: any, description?: string): Promise<AiConfig> {
    return this.prisma.aiConfig.upsert({
      where: { key },
      create: { key, value, description },
      update: { value, description },
    });
  }

  async getAiConfigs(): Promise<AiConfig[]> {
    return this.prisma.aiConfig.findMany();
  }

  async getAiConfigByKey(key: string): Promise<AiConfig | null> {
    return this.prisma.aiConfig.findUnique({ where: { key } });
  }

  // 9. Dashboard Queries
  async totalUsers(): Promise<number> {
    return this.prisma.user.count({ where: { role: 'user' } });
  }

  async activeUsers(): Promise<number> {
    return this.prisma.user.count({ where: { active: true, role: 'user' } });
  }

  async usersCountByPlanSlug(slug: string): Promise<number> {
    return this.prisma.subscription.count({
      where: {
        plan: { slug },
        status: { in: ['active', 'trial', 'grace'] },
        user: { role: 'user' },
      },
    });
  }

  async completedPaymentsSum(): Promise<number> {
    // Legacy Payment table might have amount string or float. Let's fetch all payments.
    const payments = await this.prisma.payment.findMany();
    let total = 0;
    payments.forEach(p => {
      // Amount can be string or float
      const amt = typeof p.amount === 'string' ? parseFloat(p.amount) : p.amount;
      if (!isNaN(amt)) total += amt;
    });
    return total;
  }

  async activePaidSubscriptions(): Promise<any[]> {
    return this.prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'grace'] },
        plan: { monthlyPrice: { gt: 0 } },
        user: { role: 'user' },
      },
      include: { plan: true },
    });
  }

  async trialUsersCount(): Promise<number> {
    return this.prisma.subscription.count({
      where: {
        status: 'trial',
        user: { role: 'user' },
      },
    });
  }

  async expiringSubscriptionsCount(cutoffDate: Date): Promise<number> {
    return this.prisma.subscription.count({
      where: {
        status: { in: ['active', 'trial'] },
        expiryDate: { lte: cutoffDate, gte: new Date() },
        user: { role: 'user' },
      },
    });
  }

  async getPlanDistributions(): Promise<any[]> {
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' }
    });

    const distributions = [];
    for (const plan of plans) {
      const count = await this.prisma.subscription.count({
        where: {
          planId: plan.id,
          status: { in: ['active', 'trial', 'grace'] },
          user: { role: 'user' }
        }
      });
      distributions.push({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        count
      });
    }
    return distributions;
  }

  async getMostUsedFeatures(): Promise<any[]> {
    return (this.prisma.featureUsage.groupBy as any)({
      by: ['featureId'],
      _sum: {
        used: true,
      },
    });
  }

  async getAiUsageStats(): Promise<any[]> {
    // Sum used for AI features: AI_CHAT, VOICE_ASSISTANT, SMART_SCAN
    return this.prisma.featureUsage.findMany({
      where: {
        feature: {
          code: { in: ['AI_CHAT', 'VOICE_ASSISTANT', 'SMART_SCAN'] },
        },
      },
      include: { feature: true },
    });
  }

  async createAuditEvent(data: {
    userId: string | null;
    action: string;
    details: string | null;
    performedBy: string;
    ipAddress?: string | null;
  }): Promise<AuditEvent> {
    return this.prisma.auditEvent.create({
      data: {
        userId: data.userId,
        action: data.action,
        details: data.details,
        performedBy: data.performedBy,
        ipAddress: data.ipAddress || null,
        timestamp: new Date(),
      },
    });
  }

  async getDeletedUsers(): Promise<any[]> {
    return this.prisma.deletedUser.findMany({
      orderBy: { deletedAt: 'desc' },
    });
  }

  async saveDeletedUser(data: {
    email: string;
    name: string;
    phone?: string | null;
    businessName?: string | null;
    businessType?: string | null;
    gstNumber?: string | null;
    businessAddress?: string | null;
  }) {
    // Delete any existing archive entry for this email to avoid unique constraint violations
    await this.prisma.deletedUser.deleteMany({
      where: { email: data.email.toLowerCase() }
    });

    return this.prisma.deletedUser.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        phone: data.phone || null,
        businessName: data.businessName || null,
        businessType: data.businessType || null,
        gstNumber: data.gstNumber || null,
        businessAddress: data.businessAddress || null,
        deletedAt: new Date(),
      },
    });
  }

  async deleteUserDataCompletely(userId: string, email: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Find all staff accounts associated with this tenant
      const staffUsers = await tx.user.findMany({ where: { parentEmail: email.toLowerCase() } });
      const allEmails = [email.toLowerCase(), ...staffUsers.map(u => u.email.toLowerCase())];
      const allUserIds = [userId, ...staffUsers.map(u => u.id)];

      // Delete child associations for all emails (tenant + staff)
      // 1. Products
      await tx.product.deleteMany({ where: { userId: { in: allEmails } } });
      // 2. Bills
      await tx.bill.deleteMany({ where: { userId: { in: allEmails } } });
      // 3. Scan History
      await tx.scanHistory.deleteMany({ where: { userId: { in: allEmails } } });
      // 4. Support Tickets
      await tx.supportTicket.deleteMany({ where: { userId: { in: allEmails } } });
      // 5. Payments
      await tx.payment.deleteMany({ where: { userId: { in: allEmails } } });
      // 6. Activity Logs
      await tx.activityLog.deleteMany({ where: { userId: { in: allEmails } } });
      // 7. Inventory History
      await tx.inventoryHistory.deleteMany({ where: { userId: { in: allEmails } } });
      
      // 8. Chat messages & threads
      const threads = await tx.chatThread.findMany({ where: { userId: { in: allEmails } } });
      for (const t of threads) {
        await tx.chatMessage.deleteMany({ where: { threadId: t.id } });
      }
      await tx.chatThread.deleteMany({ where: { userId: { in: allEmails } } });
      
      // Relations linked via User.id (userId) for tenant + staff
      // 9. Subscription addons
      const subs = await tx.subscription.findMany({ where: { userId: { in: allUserIds } } });
      for (const s of subs) {
        await tx.subscriptionAddon.deleteMany({ where: { subscriptionId: s.id } });
      }
      // 10. Subscriptions
      await tx.subscription.deleteMany({ where: { userId: { in: allUserIds } } });
      // 11. Feature Usages
      await tx.featureUsage.deleteMany({ where: { userId: { in: allUserIds } } });
      // 12. Plan History
      await tx.planHistory.deleteMany({ where: { userId: { in: allUserIds } } });
      // 13. Audit events
      await tx.auditEvent.deleteMany({ where: { userId: { in: allUserIds } } });
      // 14. Invoices
      await tx.invoice.deleteMany({ where: { userId: { in: allUserIds } } });

      // 15. The User records themselves (tenant + staff)
      await tx.user.deleteMany({ where: { id: { in: allUserIds } } });
    });
  }

  async getBusinessAnalytics(): Promise<any> {
    // 1. Gross Merchandise Value (GMV) - Sum of all customer bills invoiced by B2B users
    const bills = await this.prisma.bill.findMany();
    let gmv = 0;
    bills.forEach(b => {
      gmv += b.total;
    });

    // 2. Platform Inventory Depth
    const totalProducts = await this.prisma.product.count();
    const products = await this.prisma.product.findMany();
    let lowStockCount = 0;
    products.forEach(p => {
      const qty = parseFloat(p.quantity || '0');
      if (!isNaN(qty) && qty < 20) {
        lowStockCount++;
      }
    });

    // 3. Organizational Scaling
    const totalB2bUsers = await this.prisma.user.count({ where: { role: 'user' } });
    const totalStaff = await this.prisma.user.count({ where: { role: 'staff' } });
    const staffPenetration = totalB2bUsers > 0 ? (totalStaff / totalB2bUsers) : 0;

    // 4. Churn Risk List - Next 30 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 30);
    const expiringSubs = await this.prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'trial', 'grace'] },
        expiryDate: { lte: cutoff, gte: new Date() },
        user: { role: 'user' }
      },
      include: {
        user: true,
        plan: true
      },
      orderBy: { expiryDate: 'asc' }
    });

    // Format risk items
    const churnRiskList = expiringSubs.map(s => {
      const daysLeft = Math.ceil((new Date(s.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        id: s.id,
        userEmail: s.user?.email || 'N/A',
        userName: s.user?.name || 'N/A',
        businessName: s.user?.businessName || 'N/A',
        planName: s.plan?.name || 'N/A',
        expiryDate: s.expiryDate,
        autoRenew: s.autoRenew,
        daysRemaining: daysLeft > 0 ? daysLeft : 0
      };
    });

    // 5. Activity Log breakdown - Event distribution
    const historyLogs = await this.prisma.inventoryHistory.findMany({
      take: 100,
      orderBy: { timestamp: 'desc' }
    });
    const logDistribution: Record<string, number> = {
      CREATE: 0,
      UPDATE: 0,
      DELETE: 0,
      STOCK_IN: 0,
      STOCK_OUT: 0,
      BULK_IMPORT: 0
    };
    historyLogs.forEach(l => {
      if (l.actionType in logDistribution) {
        logDistribution[l.actionType]++;
      }
    });

    // 6. Login Activity Heatmap (Peak hours)
    const logins = await this.prisma.activityLog.findMany({
      where: { action: { contains: 'Login' } },
      select: { timestamp: true }
    });
    const hourlyDistribution = Array(24).fill(0);
    logins.forEach(l => {
      const hr = new Date(l.timestamp).getHours();
      if (hr >= 0 && hr < 24) {
        hourlyDistribution[hr]++;
      }
    });

    return {
      gmv,
      totalProducts,
      averageProductsPerWarehouse: totalB2bUsers > 0 ? (totalProducts / totalB2bUsers) : 0,
      lowStockCount,
      totalStaff,
      staffPenetration,
      churnRiskList,
      logDistribution,
      hourlyDistribution
    };
  }
}
