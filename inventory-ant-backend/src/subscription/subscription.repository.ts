import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Subscription, Plan, Feature, PlanFeature, FeatureUsage, PlanHistory, AuditEvent, User, Prisma } from '@prisma/client';
import { ISubscriptionWithPlan } from './subscription.interfaces';

@Injectable()
export class SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Expose the core transaction helper
  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateUserPlanAndValidity(
    userId: string,
    planSlug: string,
    validUntil: Date | null,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const client = tx || this.prisma;
    return client.user.update({
      where: { id: userId },
      data: {
        plan: planSlug,
        validUntil: validUntil ? validUntil.getTime() : null,
        updatedAt: Date.now(),
      },
    });
  }

  async findAllPlans(): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findPlanBySlug(slug: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({
      where: { slug },
    });
  }

  async findPlanById(id: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({
      where: { id },
    });
  }

  async findFeatureByCode(code: string): Promise<Feature | null> {
    return this.prisma.feature.findUnique({
      where: { code },
    });
  }

  async findAllFeatures(): Promise<Feature[]> {
    return this.prisma.feature.findMany({
      where: { isActive: true },
    });
  }

  async findPlanFeature(planId: string, featureId: string): Promise<PlanFeature | null> {
    return this.prisma.planFeature.findUnique({
      where: {
        planId_featureId: {
          planId,
          featureId,
        },
      },
    });
  }

  async getSubscriptionByUser(userId: string): Promise<ISubscriptionWithPlan | null> {
    return this.prisma.subscription.findFirst({
      where: { userId },
      include: {
        plan: {
          include: {
            features: {
              include: {
                feature: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<ISubscriptionWithPlan | null>;
  }

  async getSubscriptionHistory(userId: string): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSubscription(
    data: {
      userId: string;
      planId: string;
      status: string;
      billingCycle: string;
      startDate: Date;
      expiryDate: Date;
      trialEndsAt?: Date | null;
      graceEndsAt?: Date | null;
      cancelledAt?: Date | null;
      nextBillingDate?: Date | null;
      paymentId?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Subscription> {
    const client = tx || this.prisma;
    return client.subscription.create({
      data: {
        userId: data.userId,
        planId: data.planId,
        status: data.status,
        billingCycle: data.billingCycle,
        startDate: data.startDate,
        expiryDate: data.expiryDate,
        trialEndsAt: data.trialEndsAt,
        graceEndsAt: data.graceEndsAt,
        cancelledAt: data.cancelledAt,
        nextBillingDate: data.nextBillingDate,
        paymentId: data.paymentId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async updateSubscription(
    id: string,
    data: {
      status?: string;
      billingCycle?: string;
      startDate?: Date;
      expiryDate?: Date;
      renewalDate?: Date | null;
      trialEndsAt?: Date | null;
      graceEndsAt?: Date | null;
      cancelledAt?: Date | null;
      nextBillingDate?: Date | null;
      autoRenew?: boolean;
      paymentId?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Subscription> {
    const client = tx || this.prisma;
    return client.subscription.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async getFeatureUsage(userId: string, featureId: string, month: number, year: number): Promise<FeatureUsage | null> {
    return this.prisma.featureUsage.findFirst({
      where: {
        userId,
        featureId,
        month,
        year,
      },
    });
  }

  async upsertFeatureUsage(
    userId: string,
    featureId: string,
    month: number,
    year: number,
    used: number,
    resetDate: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<FeatureUsage> {
    const client = tx || this.prisma;
    const existing = await client.featureUsage.findFirst({
      where: { userId, featureId, month, year },
    });
    if (existing) {
      return client.featureUsage.update({
        where: { id: existing.id },
        data: { used },
      });
    } else {
      return client.featureUsage.create({
        data: {
          userId,
          featureId,
          month,
          year,
          used,
          resetDate,
        },
      });
    }
  }

  async incrementFeatureUsage(
    userId: string,
    featureId: string,
    month: number,
    year: number,
    amount: number,
    resetDate: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<FeatureUsage> {
    const client = tx || this.prisma;
    const existing = await client.featureUsage.findFirst({
      where: { userId, featureId, month, year },
    });
    if (existing) {
      return client.featureUsage.update({
        where: { id: existing.id },
        data: { used: { increment: amount } }, // Atomic Prisma increment!
      });
    } else {
      return client.featureUsage.create({
        data: {
          userId,
          featureId,
          month,
          year,
          used: amount,
          resetDate,
        },
      });
    }
  }

  async createPlanHistory(
    data: {
      userId: string;
      oldPlan: string | null;
      newPlan: string;
      reason: string | null;
      changedBy: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<PlanHistory> {
    const client = tx || this.prisma;
    return client.planHistory.create({
      data: {
        userId: data.userId,
        oldPlan: data.oldPlan,
        newPlan: data.newPlan,
        reason: data.reason,
        changedBy: data.changedBy,
        timestamp: new Date(),
      },
    });
  }

  async createAuditEvent(
    data: {
      userId: string | null;
      action: string;
      details: string | null;
      performedBy: string;
      ipAddress?: string | null;
      requestId?: string | null;
      executionTime?: number | null;
      userAgent?: string | null;
      device?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<AuditEvent> {
    const client = tx || this.prisma;
    return client.auditEvent.create({
      data: {
        userId: data.userId,
        action: data.action,
        details: data.details,
        performedBy: data.performedBy,
        ipAddress: data.ipAddress || null,
        requestId: data.requestId || null,
        executionTime: data.executionTime || null,
        userAgent: data.userAgent || null,
        device: data.device || null,
        timestamp: new Date(),
      },
    });
  }

  async countProducts(userEmail: string): Promise<number> {
    return this.prisma.product.count({
      where: { userId: userEmail.toLowerCase() },
    });
  }

  async countStaff(ownerEmail: string): Promise<number> {
    return this.prisma.user.count({
      where: {
        role: 'staff',
        parentEmail: ownerEmail.toLowerCase(),
      },
    });
  }

  async findSubscriptionsDueForExpiry(now: Date): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'trial'] },
        expiryDate: { lte: now },
      },
    });
  }

  async findTrialsDueForExpiry(now: Date): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: {
        status: 'trial',
        trialEndsAt: { lte: now },
      },
    });
  }

  async findSubscriptionsGraceDueForExpiry(now: Date): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: {
        status: 'grace',
        graceEndsAt: { lte: now },
      },
    });
  }

  async resetAllFeatureUsagesForMonth(month: number, year: number, resetDate: Date): Promise<any> {
    return this.prisma.featureUsage.updateMany({
      where: {
        resetDate: { lte: new Date() },
      },
      data: {
        used: 0,
        month,
        year,
        resetDate,
      },
    });
  }
}
