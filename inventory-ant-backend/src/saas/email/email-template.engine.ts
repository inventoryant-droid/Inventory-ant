import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailTemplateEngine {
  private wrapLayout(title: string, bodyContent: string): string {
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; padding: 32px 16px;">
        <div style="background: #ffffff; border-radius: 20px; padding: 40px 36px; box-shadow: 0 4px 24px rgba(0,0,0,0.07); border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: #7c3aed; border-radius: 16px; margin-bottom: 16px;">
              <span style="font-size: 28px;">🐜</span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px;">Inventory Ant</h1>
            <p style="margin: 4px 0 0; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">B2B Warehouse Intelligence</p>
          </div>

          <h2 style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 16px; text-align: center;">${title}</h2>
          
          ${bodyContent}
          
        </div>
        <p style="text-align: center; color: #cbd5e1; font-size: 11px; margin-top: 20px;">© 2026 Inventory Ant. All rights reserved.</p>
      </div>
    `;
  }

  generateWelcome(name: string): string {
    const content = `
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Hi ${name || 'User'},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">Welcome to Inventory Ant! We are excited to link with your warehouse catalog and boost your warehouse workflows with AI search capabilities.</p>
      <div style="text-align: center;">
        <a href="https://inventory-ant.com/dashboard" style="background: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">Go to Dashboard</a>
      </div>
    `;
    return this.wrapLayout('Welcome to the Core!', content);
  }

  generatePaymentSuccess(orderId: string, amount: number, planName: string): string {
    const content = `
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Hello,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Your payment for plan <strong>${planName}</strong> was processed successfully.</p>
      <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">Order Ref: <strong>${orderId}</strong></p>
        <p style="margin: 0; font-size: 13px; color: #64748b;">Amount Paid: <strong>Rs.${amount.toFixed(2)}</strong></p>
      </div>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">Your premium quotas are now active.</p>
    `;
    return this.wrapLayout('Payment Successful!', content);
  }

  generatePaymentFailed(orderId: string, reason: string): string {
    const content = `
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Hello,</p>
      <p style="color: #ef4444; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">We were unable to complete processing your payment transaction.</p>
      <div style="background: #fdf2f2; border: 1px dashed #fca5a5; border-radius: 12px; padding: 16px; margin-bottom: 24px; color: #991b1b;">
        <p style="margin: 0 0 8px; font-size: 13px;">Order Ref: <strong>${orderId}</strong></p>
        <p style="margin: 0; font-size: 13px;">Error Reason: <strong>${reason || 'Declined by financial gateway'}</strong></p>
      </div>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">Please try again or select a different payment instrument.</p>
    `;
    return this.wrapLayout('Payment Failed', content);
  }

  generateInvoice(invoiceNumber: string, amount: number, tax: number, total: number): string {
    const content = `
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Hello,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Please find below the invoice summary details for your active subscription plan.</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Invoice: <strong>${invoiceNumber}</strong></p>
        <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 6px;">
          <span>Subtotal:</span>
          <strong>Rs.${amount.toFixed(2)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 6px;">
          <span>GST (18%):</span>
          <strong>Rs.${tax.toFixed(2)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; color: #1e293b; font-weight: 700; margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
          <span>Total:</span>
          <span>Rs.${total.toFixed(2)}</span>
        </div>
      </div>
    `;
    return this.wrapLayout('Invoice Receipt Generated', content);
  }

  generateSubscriptionActivated(planName: string, expiryDate: Date): string {
    const content = `
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Hi,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Your subscription has been activated successfully!</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">You now have premium access to plan <strong>${planName}</strong> valid until <strong>${expiryDate.toLocaleDateString()}</strong>.</p>
    `;
    return this.wrapLayout('SaaS Plan Activated!', content);
  }

  generateSubscriptionCancelled(planName: string, accessEndsAt: Date): string {
    const content = `
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Hello,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Your premium plan cancel request has been processed.</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">Your premium plan <strong>${planName}</strong> features will remain active until <strong>${accessEndsAt.toLocaleDateString()}</strong>, after which it will downgrade to the free tier.</p>
    `;
    return this.wrapLayout('Subscription Cancelled', content);
  }

  generateTrialEnding(planName: string, endDate: Date): string {
    const content = `
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Hello,</p>
      <p style="color: #eab308; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Your trial period for plan <strong>${planName}</strong> is ending soon.</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">The trial expires on <strong>${endDate.toLocaleDateString()}</strong>. To prevent catalog locks and quota cutoffs, upgrade to a paid subscription plan.</p>
    `;
    return this.wrapLayout('Trial Period Expiring Soon!', content);
  }

  generateRenewalReminder(planName: string, renewalDate: Date, amount: number): string {
    const content = `
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Hello,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">This is a friendly reminder that your plan subscription is up for auto-renewal soon.</p>
      <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 6px; font-size: 13px; color: #475569;">Plan: <strong>${planName}</strong></p>
        <p style="margin: 0 0 6px; font-size: 13px; color: #475569;">Renewal Date: <strong>${renewalDate.toLocaleDateString()}</strong></p>
        <p style="margin: 0; font-size: 13px; color: #475569;">Renewal Cost: <strong>Rs.${amount.toFixed(2)}</strong></p>
      </div>
    `;
    return this.wrapLayout('Renewal Reminder', content);
  }
}
