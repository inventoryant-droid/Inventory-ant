import { Injectable } from '@nestjs/common';

@Injectable()
export class SaasConfigService {
  // Timeout in milliseconds (default 30 minutes)
  readonly paymentTimeoutMs = parseInt(process.env.PAYMENT_TIMEOUT_MS || '1800000', 10);

  // Webhook retry intervals in milliseconds (1m, 5m, 15m, 1h, 24h)
  readonly webhookRetryDelays = [
    60000,       // 1 minute
    300000,      // 5 minutes
    900000,      // 15 minutes
    3600000,     // 1 hour
    86400000,    // 24 hours
  ];

  readonly maxWebhookRetries = parseInt(process.env.MAX_WEBHOOK_RETRIES || '5', 10);

  readonly emailLimitPerHour = parseInt(process.env.EMAIL_LIMIT_PER_HOUR || '100', 10);

  readonly trialEndingReminderDays = parseInt(process.env.TRIAL_ENDING_REMINDER_DAYS || '3', 10);

  readonly renewalReminderDays = parseInt(process.env.RENEWAL_REMINDER_DAYS || '7', 10);

  readonly tokenCleanupIntervalMs = parseInt(process.env.TOKEN_CLEANUP_INTERVAL_MS || '86400000', 10); // 24 hours

  readonly logCleanupIntervalMs = parseInt(process.env.LOG_CLEANUP_INTERVAL_MS || '604800000', 10); // 7 days
}
