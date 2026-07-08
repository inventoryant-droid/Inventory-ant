import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionRepository } from './subscription.repository';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionScheduler {
  private readonly logger = new Logger(SubscriptionScheduler.name);

  constructor(
    private readonly repository: SubscriptionRepository,
    private readonly service: SubscriptionService,
  ) {}

  // 1. Expire Subscriptions (Check and transition expired subscriptions)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionExpiries() {
    this.logger.log('⏳ Running scheduled task: Subscription Expiries check...');
    try {
      const now = new Date();
      const expiredSubs = await this.repository.findSubscriptionsDueForExpiry(now);
      
      for (const sub of expiredSubs) {
        this.logger.log(`Subscription ${sub.id} for user ${sub.userId} is due for expiry.`);
        await this.service.deactivateSubscription(sub.userId);
      }
      this.logger.log(`✅ Completed Subscription Expiries check. Processed ${expiredSubs.length} subscriptions.`);
    } catch (err) {
      this.logger.error('❌ Error during Subscription Expiries scheduler:', err);
    }
  }

  // 2. Expire Plan Trials
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTrialExpiries() {
    this.logger.log('⏳ Running scheduled task: Plan Trial Expiries check...');
    try {
      const now = new Date();
      const expiredTrials = await this.repository.findTrialsDueForExpiry(now);

      for (const sub of expiredTrials) {
        this.logger.log(`Trial ${sub.id} for user ${sub.userId} has expired.`);
        await this.service.expireTrial(sub.userId);
      }
      this.logger.log(`✅ Completed Plan Trial Expiries check. Processed ${expiredTrials.length} trials.`);
    } catch (err) {
      this.logger.error('❌ Error during Trial Expiries scheduler:', err);
    }
  }

  // 3. Expire Grace Periods
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleGracePeriodExpiries() {
    this.logger.log('⏳ Running scheduled task: Grace Period Expiries check...');
    try {
      const now = new Date();
      const expiredGrace = await this.repository.findSubscriptionsGraceDueForExpiry(now);

      for (const sub of expiredGrace) {
        this.logger.log(`Grace period for subscription ${sub.id} (user ${sub.userId}) has ended.`);
        await this.service.deactivateSubscription(sub.userId);
      }
      this.logger.log(`✅ Completed Grace Period Expiries check. Processed ${expiredGrace.length} grace periods.`);
    } catch (err) {
      this.logger.error('❌ Error during Grace Period Expiries scheduler:', err);
    }
  }

  // 4. Monthly Usage Reset (Midnight of 1st day of month)
  @Cron('0 0 1 * *')
  async handleMonthlyUsageReset() {
    this.logger.log('⏳ Running scheduled task: Monthly Usage Reset...');
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      await this.service.resetMonthlyUsage(currentMonth, currentYear);
      this.logger.log('✅ Monthly Usage reset execution complete.');
    } catch (err) {
      this.logger.error('❌ Error during Monthly Usage Reset scheduler:', err);
    }
  }

  // 5. Subscription Synchronization (Sync legacy fields periodically)
  @Cron(CronExpression.EVERY_HOUR)
  async handleUserFieldsSync() {
    this.logger.log('⏳ Running scheduled task: Subscription Synchronization to User table...');
    try {
      // Find all active subscriptions and synchronize their plan state to User table
      // To keep query fast, we scan through subscriptions and check User records
      const now = new Date();
      const activeSubs = await this.repository.findSubscriptionsDueForExpiry(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)); // Scan recently active
      
      for (const sub of activeSubs) {
        await this.service.syncUserPlanAndValidity(sub.userId);
      }
      this.logger.log('✅ Subscription Synchronization complete.');
    } catch (err) {
      this.logger.error('❌ Error during User fields synchronization scheduler:', err);
    }
  }
}
