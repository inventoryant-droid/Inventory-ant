import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class SaasLoggerService implements LoggerService {
  private sanitize(message: any): string {
    if (typeof message !== 'string') {
      try {
        message = JSON.stringify(message);
      } catch {
        message = String(message);
      }
    }

    // Patterns for passwords, otps, secrets, signatures, tokens, and keys
    const sensitivePatterns = [
      /(password["']?\s*:\s*["']?)[^"'\s,]+/gi,
      /(otp["']?\s*:\s*["']?)[^"'\s,]+/gi,
      /(secret["']?\s*:\s*["']?)[^"'\s,]+/gi,
      /(signature["']?\s*:\s*["']?)[^"'\s,]+/gi,
      /(token["']?\s*:\s*["']?)[^"'\s,]+/gi,
      /(key["']?\s*:\s*["']?)[^"'\s,]+/gi,
      /(bearer\s+)[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/gi, // JWT
    ];

    let sanitized = message;
    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '$1[REDACTED]');
    }
    return sanitized;
  }

  log(message: any, context?: string) {
    console.log(`[INFO] [${context || 'Application'}] ${this.sanitize(message)}`);
  }

  error(message: any, trace?: string, context?: string) {
    console.error(`[ERROR] [${context || 'Application'}] ${this.sanitize(message)}`);
    if (trace) console.error(trace);
  }

  warn(message: any, context?: string) {
    console.warn(`[WARN] [${context || 'Application'}] ${this.sanitize(message)}`);
  }

  debug(message: any, context?: string) {
    console.debug(`[DEBUG] [${context || 'Application'}] ${this.sanitize(message)}`);
  }

  verbose(message: any, context?: string) {
    console.log(`[VERBOSE] [${context || 'Application'}] ${this.sanitize(message)}`);
  }

  // Domain-specific helpers
  logAuth(action: string, email: string, details?: string) {
    this.log(`AuthAction: ${action} | User: ${email} | Details: ${details || 'None'}`, 'Authentication');
  }

  logInventory(action: string, sku: string, details: string) {
    this.log(`InventoryAction: ${action} | SKU: ${sku} | Details: ${details}`, 'Inventory');
  }

  logBilling(action: string, invoiceId: string, details: string) {
    this.log(`BillingAction: ${action} | Invoice: ${invoiceId} | Details: ${details}`, 'Billing');
  }

  logSubscription(action: string, userId: string, planSlug: string) {
    this.log(`SubscriptionAction: ${action} | User: ${userId} | Plan: ${planSlug}`, 'Subscription');
  }

  logPayment(action: string, orderId: string, status: string, amount?: number) {
    this.log(`PaymentAction: ${action} | Order: ${orderId} | Status: ${status} | Amount: ${amount || 0}`, 'Payments');
  }

  logWebhook(event: string, gateway: string, status: string) {
    this.log(`WebhookReceived: ${event} | Gateway: ${gateway} | Status: ${status}`, 'Webhook');
  }

  logAI(action: string, userId: string, featureCode: string, details?: string) {
    this.log(`AIAction: ${action} | User: ${userId} | Feature: ${featureCode} | Details: ${details || ''}`, 'AI');
  }

  logCron(jobName: string, status: 'started' | 'completed' | 'failed', details?: string) {
    this.log(`CronJob: ${jobName} | Status: ${status} | Details: ${details || ''}`, 'CronJobs');
  }
}
