import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SubscriptionRepository } from './subscription.repository';
import { PlanService } from './plan.service';
import { AuditService } from './audit.service';
import { Subscription, Plan, User, Prisma } from '@prisma/client';
import { ISubscriptionWithPlan } from './subscription.interfaces';
import { SUBSCRIPTION_STATUS, BILLING_CYCLE, AUDIT_ACTION } from './subscription.constants';
import { SubscriptionConfig } from './subscription.config';

@Injectable()
export class SubscriptionLifecycleService {
  constructor(
    private readonly repository: SubscriptionRepository,
    private readonly planService: PlanService,
    private readonly auditService: AuditService,
  ) {}

  async getSubscriptionByUser(userId: string): Promise<ISubscriptionWithPlan | null> {
    return this.repository.getSubscriptionByUser(userId);
  }

  async getSubscriptionHistory(userId: string): Promise<Subscription[]> {
    return this.repository.getSubscriptionHistory(userId);
  }

  async getActiveSubscription(userId: string): Promise<ISubscriptionWithPlan | null> {
    const sub = await this.getSubscriptionByUser(userId);
    if (!sub) return null;

    const now = new Date();
    if (sub.status === SUBSCRIPTION_STATUS.ACTIVE || sub.status === SUBSCRIPTION_STATUS.TRIAL) {
      if (sub.expiryDate < now) {
        if (sub.autoRenew) {
          await this.renewPlan(userId);
          return this.getSubscriptionByUser(userId);
        } else {
          await this.deactivateSubscription(userId);
          return this.getSubscriptionByUser(userId);
        }
      }
    } else if (sub.status === SUBSCRIPTION_STATUS.GRACE) {
      if (sub.graceEndsAt && sub.graceEndsAt < now) {
        await this.deactivateSubscription(userId);
        return this.getSubscriptionByUser(userId);
      }
    }

    return sub;
  }

  async getCurrentPlan(userId: string): Promise<Plan> {
    const activeSub = await this.getActiveSubscription(userId);
    if (activeSub) {
      return activeSub.plan;
    }
    return this.planService.getPlanBySlug('free');
  }

  // --- Transaction Wrapped Lifecycle Operations ---

  async startTrial(userId: string, planSlug: string): Promise<Subscription> {
    const plan = await this.planService.getPlanBySlug(planSlug);
    if (plan.trialDays <= 0) {
      throw new BadRequestException('Selected plan does not support a trial period');
    }

    return this.repository.transaction(async (tx) => {
      // Fetch inside transaction to prevent race conditions
      const existingSub = await tx.subscription.findFirst({
        where: { userId, status: { in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] } },
      });
      if (existingSub) {
        throw new BadRequestException('User already has an active subscription or trial');
      }

      const now = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(now.getDate() + plan.trialDays);

      const sub = await this.repository.createSubscription(
        {
          userId,
          planId: plan.id,
          status: SUBSCRIPTION_STATUS.TRIAL,
          billingCycle: BILLING_CYCLE.MONTHLY,
          startDate: now,
          expiryDate: trialEndDate,
          trialEndsAt: trialEndDate,
        },
        tx,
      );

      await this.auditService.logPlanChange(userId, null, plan.slug, 'Started Plan Trial', 'user', tx);
      await this.auditService.logAuditEvent(userId, AUDIT_ACTION.TRIAL_STARTED, `Started trial for ${plan.name}`, 'user', null, tx);
      await this.syncUserPlanAndValidityWithTx(userId, sub, tx);

      return sub;
    });
  }

  async changePlan(
    userId: string,
    planSlug: string,
    billingCycle: 'monthly' | 'yearly',
    changedBy = 'user',
    reason = 'Plan upgrade/downgrade',
  ): Promise<Subscription> {
    const plan = await this.planService.getPlanBySlug(planSlug);

    return this.repository.transaction(async (tx) => {
      const activeSub = await tx.subscription.findFirst({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });

      const now = new Date();
      const durationDays = billingCycle === BILLING_CYCLE.YEARLY ? 365 : 30;
      const expiryDate = new Date();
      expiryDate.setDate(now.getDate() + durationDays);

      const oldPlanSlug = activeSub ? activeSub.plan.slug : null;

      let sub: Subscription;
      if (activeSub) {
        sub = await this.repository.updateSubscription(
          activeSub.id,
          {
            planId: plan.id,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            billingCycle,
            startDate: now,
            expiryDate,
            trialEndsAt: null,
            graceEndsAt: null,
            cancelledAt: null,
            nextBillingDate: expiryDate,
          } as any,
          tx,
        );
      } else {
        sub = await this.repository.createSubscription(
          {
            userId,
            planId: plan.id,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            billingCycle,
            startDate: now,
            expiryDate,
            nextBillingDate: expiryDate,
          },
          tx,
        );
      }

      await this.auditService.logPlanChange(userId, oldPlanSlug, plan.slug, reason, changedBy, tx);
      await this.auditService.logAuditEvent(
        userId,
        AUDIT_ACTION.PLAN_CHANGED,
        `Changed plan from ${oldPlanSlug || 'none'} to ${plan.slug}`,
        changedBy,
        null,
        tx,
      );
      await this.syncUserPlanAndValidityWithTx(userId, sub, tx);

      return sub;
    });
  }

  async renewPlan(userId: string, paymentId?: string): Promise<Subscription> {
    return this.repository.transaction(async (tx) => {
      const activeSub = await tx.subscription.findFirst({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!activeSub) {
        throw new NotFoundException('No active subscription found to renew');
      }

      const now = new Date();
      const durationDays = activeSub.billingCycle === BILLING_CYCLE.YEARLY ? 365 : 30;
      const currentExpiry = activeSub.expiryDate > now ? activeSub.expiryDate : now;

      const newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + durationDays);

      const sub = await this.repository.updateSubscription(
        activeSub.id,
        {
          status: SUBSCRIPTION_STATUS.ACTIVE,
          expiryDate: newExpiry,
          renewalDate: now,
          graceEndsAt: null,
          cancelledAt: null,
          nextBillingDate: newExpiry,
          paymentId: paymentId || activeSub.paymentId,
        },
        tx,
      );

      await this.auditService.logAuditEvent(
        userId,
        AUDIT_ACTION.SUBSCRIPTION_RENEWED,
        `Renewed subscription for plan ${activeSub.plan.name}`,
        'system',
        null,
        tx,
      );
      await this.syncUserPlanAndValidityWithTx(userId, sub, tx);

      return sub;
    });
  }

  async cancelPlan(userId: string, reason?: string): Promise<Subscription> {
    return this.repository.transaction(async (tx) => {
      const activeSub = await tx.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!activeSub) {
        throw new NotFoundException('No active subscription found to cancel');
      }

      const sub = await this.repository.updateSubscription(
        activeSub.id,
        {
          autoRenew: false,
          cancelledAt: new Date(),
        },
        tx,
      );

      await this.auditService.logAuditEvent(
        userId,
        AUDIT_ACTION.SUBSCRIPTION_CANCELLED,
        `Cancelled auto-renewal. Reason: ${reason || 'Not specified'}`,
        'user',
        null,
        tx,
      );

      return sub;
    });
  }

  async resumePlan(userId: string): Promise<Subscription> {
    return this.repository.transaction(async (tx) => {
      const activeSub = await tx.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!activeSub) {
        throw new NotFoundException('No active subscription found to resume');
      }

      const sub = await this.repository.updateSubscription(
        activeSub.id,
        {
          autoRenew: true,
          cancelledAt: null,
        },
        tx,
      );

      await this.auditService.logAuditEvent(userId, AUDIT_ACTION.SUBSCRIPTION_RESUMED, 'Resumed auto-renewal', 'user', null, tx);

      return sub;
    });
  }

  async expireTrial(userId: string): Promise<Subscription> {
    return this.repository.transaction(async (tx) => {
      const activeSub = await tx.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!activeSub || activeSub.status !== SUBSCRIPTION_STATUS.TRIAL) {
        throw new BadRequestException('User is not under a plan trial');
      }

      const sub = await this.repository.updateSubscription(
        activeSub.id,
        {
          status: SUBSCRIPTION_STATUS.EXPIRED,
        },
        tx,
      );

      await this.auditService.logAuditEvent(userId, AUDIT_ACTION.TRIAL_ENDED, 'Plan trial expired', 'system', null, tx);
      await this.syncUserPlanAndValidityWithTx(userId, sub, tx);

      return sub;
    });
  }

  async deactivateSubscription(userId: string): Promise<Subscription> {
    return this.repository.transaction(async (tx) => {
      const activeSub = await tx.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!activeSub) {
        throw new NotFoundException('No subscription found to deactivate');
      }

      const now = new Date();
      let newStatus = SUBSCRIPTION_STATUS.EXPIRED;
      let sub: Subscription;

      if (activeSub.status === SUBSCRIPTION_STATUS.ACTIVE && !activeSub.graceEndsAt) {
        newStatus = SUBSCRIPTION_STATUS.GRACE;
        const graceEndsAt = new Date();
        graceEndsAt.setDate(now.getDate() + SubscriptionConfig.GRACE_PERIOD_DAYS);

        sub = await this.repository.updateSubscription(
          activeSub.id,
          {
            status: newStatus,
            graceEndsAt,
          },
          tx,
        );

        await this.auditService.logAuditEvent(
          userId,
          AUDIT_ACTION.SUBSCRIPTION_EXPIRED,
          `Subscription expired. Moved to grace period until ${graceEndsAt.toDateString()}`,
          'system',
          null,
          tx,
        );
      } else {
        sub = await this.repository.updateSubscription(
          activeSub.id,
          {
            status: SUBSCRIPTION_STATUS.EXPIRED,
          },
          tx,
        );

        await this.auditService.logAuditEvent(userId, AUDIT_ACTION.SUBSCRIPTION_EXPIRED, 'Subscription expired and deactivated', 'system', null, tx);
      }

      await this.syncUserPlanAndValidityWithTx(userId, sub, tx);
      return sub;
    });
  }

  // --- Backend User Sync Helper ---

  async syncUserPlanAndValidity(userId: string): Promise<void> {
    const sub = await this.repository.getSubscriptionByUser(userId);
    const user = await this.repository.findUserById(userId);
    if (!user) return;

    if (
      sub &&
      (sub.status === SUBSCRIPTION_STATUS.ACTIVE || sub.status === SUBSCRIPTION_STATUS.TRIAL || sub.status === SUBSCRIPTION_STATUS.GRACE)
    ) {
      if (user.plan !== sub.plan.slug || user.validUntil !== sub.expiryDate.getTime()) {
        await this.repository.updateUserPlanAndValidity(userId, sub.plan.slug, sub.expiryDate);
      }
    } else {
      if (user.plan !== 'free' || user.validUntil !== null) {
        await this.repository.updateUserPlanAndValidity(userId, 'free', null);
      }
    }
  }

  private async syncUserPlanAndValidityWithTx(
    userId: string,
    sub: Subscription | null,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) return;

    if (
      sub &&
      (sub.status === SUBSCRIPTION_STATUS.ACTIVE || sub.status === SUBSCRIPTION_STATUS.TRIAL || sub.status === SUBSCRIPTION_STATUS.GRACE)
    ) {
      const plan = await tx.plan.findUnique({ where: { id: sub.planId } });
      const planSlug = plan ? plan.slug : 'free';
      await this.repository.updateUserPlanAndValidity(userId, planSlug, sub.expiryDate, tx);
    } else {
      await this.repository.updateUserPlanAndValidity(userId, 'free', null, tx);
    }
  }

  async syncUserPlanAndValidityByEmail(email: string): Promise<void> {
    const user = await this.repository.findUserByEmail(email.toLowerCase());
    if (user) {
      await this.syncUserPlanAndValidity(user.id);
    }
  }
}
