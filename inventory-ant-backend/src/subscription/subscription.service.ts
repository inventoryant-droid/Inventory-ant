import { Injectable } from '@nestjs/common';
import { PlanService } from './plan.service';
import { FeatureService } from './feature.service';
import { UsageService } from './usage.service';
import { AuditService } from './audit.service';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';
import { Subscription, Plan, Feature, PlanFeature, FeatureUsage, PlanHistory, AuditEvent } from '@prisma/client';
import { ISubscriptionWithPlan, IUsageStatus } from './subscription.interfaces';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly planService: PlanService,
    private readonly featureService: FeatureService,
    private readonly usageService: UsageService,
    private readonly auditService: AuditService,
    private readonly lifecycleService: SubscriptionLifecycleService,
    private readonly prisma: PrismaService,
  ) {}

  // --- Plan Service Delegations ---
  async getPlans(): Promise<Plan[]> {
    return this.planService.getPlans();
  }

  async getPlanBySlug(slug: string): Promise<Plan> {
    return this.planService.getPlanBySlug(slug);
  }

  async getPlanFeatureConfig(planId: string, featureId: string): Promise<PlanFeature | null> {
    return this.planService.getPlanFeatureConfig(planId, featureId);
  }

  // --- Feature Service Delegations ---
  async getFeatureByCode(code: string): Promise<Feature> {
    return this.featureService.getFeatureByCode(code);
  }

  // --- Usage Service Delegations ---
  async getCurrentPlan(userId: string): Promise<Plan> {
    return this.usageService.getCurrentPlan(userId);
  }

  async hasFeature(userId: string, featureCode: string): Promise<boolean> {
    return this.usageService.hasFeature(userId, featureCode);
  }

  async canAccessFeature(userId: string, featureCode: string): Promise<boolean> {
    return this.usageService.canAccessFeature(userId, featureCode);
  }

  async getUsage(userId: string, featureCode: string): Promise<IUsageStatus> {
    return this.usageService.getUsage(userId, featureCode);
  }

  async getRemainingUsage(userId: string, featureCode: string): Promise<number | null> {
    return this.usageService.getRemainingUsage(userId, featureCode);
  }

  async incrementUsage(userId: string, featureCode: string, amount = 1): Promise<IUsageStatus> {
    return this.usageService.incrementUsage(userId, featureCode, amount);
  }

  async resetMonthlyUsage(month?: number, year?: number): Promise<void> {
    return this.usageService.resetMonthlyUsage(month, year);
  }

  // --- Lifecycle Service Delegations ---
  async getSubscriptionByUser(userId: string): Promise<ISubscriptionWithPlan | null> {
    return this.lifecycleService.getSubscriptionByUser(userId);
  }

  async getSubscriptionHistory(userId: string): Promise<Subscription[]> {
    return this.lifecycleService.getSubscriptionHistory(userId);
  }

  async getActiveSubscription(userId: string): Promise<ISubscriptionWithPlan | null> {
    return this.lifecycleService.getActiveSubscription(userId);
  }

  async startTrial(userId: string, planSlug: string): Promise<Subscription> {
    return this.lifecycleService.startTrial(userId, planSlug);
  }

  async changePlan(
    userId: string,
    planSlug: string,
    billingCycle: 'monthly' | 'yearly',
    changedBy = 'user',
    reason = 'Plan upgrade/downgrade',
  ): Promise<Subscription> {
    return this.lifecycleService.changePlan(userId, planSlug, billingCycle, changedBy, reason);
  }

  async renewPlan(userId: string, paymentId?: string): Promise<Subscription> {
    return this.lifecycleService.renewPlan(userId, paymentId);
  }

  async cancelPlan(userId: string, reason?: string): Promise<Subscription> {
    return this.lifecycleService.cancelPlan(userId, reason);
  }

  async resumePlan(userId: string): Promise<Subscription> {
    return this.lifecycleService.resumePlan(userId);
  }

  async expireTrial(userId: string): Promise<Subscription> {
    return this.lifecycleService.expireTrial(userId);
  }

  async deactivateSubscription(userId: string): Promise<Subscription> {
    return this.lifecycleService.deactivateSubscription(userId);
  }

  async syncUserPlanAndValidity(userId: string): Promise<void> {
    return this.lifecycleService.syncUserPlanAndValidity(userId);
  }

  async syncUserPlanAndValidityByEmail(email: string): Promise<void> {
    return this.lifecycleService.syncUserPlanAndValidityByEmail(email);
  }

  // --- Audit Service Delegations ---
  async logPlanChange(userId: string, oldPlan: string | null, newPlan: string, reason: string | null, changedBy: string): Promise<PlanHistory> {
    return this.auditService.logPlanChange(userId, oldPlan, newPlan, reason, changedBy);
  }

  async logAuditEvent(userId: string | null, action: string, details: string | null, performedBy: string, ipAddress?: string | null): Promise<AuditEvent> {
    return this.auditService.logAuditEvent(userId, action, details, performedBy, ipAddress);
  }

  async generateSaasInvoicePdf(userId: string, invoiceId: string): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        user: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const PDFDocument = require('pdfkit');

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      // ─── Header: TAX INVOICE & Logo ───
      doc.fillColor('#0f9d63')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('TAX INVOICE', { align: 'left' });
         
      doc.moveDown(0.2);

      // Invoice info top right
      const topY = doc.y - 30;
      doc.fillColor('#64748b')
         .fontSize(9)
         .font('Helvetica')
         .text(`Invoice Number: ${invoice.invoiceNumber}`, 350, topY, { align: 'right' });
      doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 350, topY + 12, { align: 'right' });
      if (invoice.paymentId) {
        doc.text(`Payment ID: ${invoice.paymentId}`, 350, topY + 24, { align: 'right' });
      }

      doc.moveDown(1.5);

      // Draw horizontal line separator
      doc.strokeColor('#e2e8f0')
         .lineWidth(1)
         .moveTo(40, doc.y)
         .lineTo(555, doc.y)
         .stroke();

      doc.moveDown(1);

      // ─── Address grid (Billed By vs Billed To) ───
      const gridY = doc.y;
      
      // Billed By (Left)
      doc.fillColor('#94a3b8')
         .fontSize(8)
         .font('Helvetica-Bold')
         .text('BILLED BY', 40, gridY);
      doc.fillColor('#1e293b')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Inventory Ant Ltd.', 40, gridY + 12);
      doc.fillColor('#475569')
         .fontSize(9)
         .font('Helvetica')
         .text('Smart warehouse intelligence, Block-C\nIndustrial Sector-62, Noida, India\nGSTIN: 09AAHCI4530P1Z2', 40, gridY + 24, { lineGap: 3 });

      // Billed To (Right)
      doc.fillColor('#94a3b8')
         .fontSize(8)
         .font('Helvetica-Bold')
         .text('BILLED TO', 330, gridY);
      doc.fillColor('#1e293b')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(invoice.user.businessName || 'Business Owner', 330, gridY + 12);
      
      const billingAddress = [
        invoice.user.name,
        invoice.user.businessAddress || 'Address not configured',
        invoice.user.gstNumber ? `GSTIN: ${invoice.user.gstNumber}` : 'GSTIN: N/A'
      ].filter(Boolean).join('\n');
      
      doc.fillColor('#475569')
         .fontSize(9)
         .font('Helvetica')
         .text(billingAddress, 330, gridY + 24, { lineGap: 3 });

      doc.moveDown(4);

      // ─── SaaS Item Grid ───
      const tableY = doc.y;
      
      // Table Header Background
      doc.fillColor('#f8fafc')
         .rect(40, tableY, 515, 24)
         .fill();
         
      // Table Headers
      doc.fillColor('#0f9d63')
         .fontSize(8.5)
         .font('Helvetica-Bold')
         .text('SAAS ITEM DETAILS', 50, tableY + 8)
         .text('BILLING CYCLE', 330, tableY + 8)
         .text('BASE AMOUNT', 460, tableY + 8, { width: 85, align: 'right' });

      // Table Row
      const rowY = tableY + 30;
      doc.fillColor('#1e293b')
         .fontSize(9.5)
         .font('Helvetica-Bold')
         .text(`${invoice.subscription?.plan?.name || 'Premium'} Plan`, 50, rowY)
         .fillColor('#64748b')
         .fontSize(8.5)
         .font('Helvetica')
         .text('Access to automated POS billing, smart scanner uploads, and staff management tools.', 50, rowY + 12, { width: 250, lineGap: 2 });

      doc.fillColor('#1e293b')
         .fontSize(9.5)
         .font('Helvetica-Bold')
         .text(invoice.subscription?.billingCycle || 'monthly', 330, rowY, { capitalize: true })
         .text(`Rs.${(invoice.amount).toFixed(2)}`, 460, rowY, { width: 85, align: 'right' });

      // Draw line below row
      const lineY = rowY + 45;
      doc.strokeColor('#e2e8f0')
         .lineWidth(0.5)
         .moveTo(40, lineY)
         .lineTo(555, lineY)
         .stroke();

      // ─── Total calculations (Right aligned) ───
      const calcY = lineY + 20;
      doc.fillColor('#475569')
         .fontSize(9)
         .font('Helvetica');
         
      doc.text('Subtotal Price:', 330, calcY)
         .text(`Rs.${(invoice.amount).toFixed(2)}`, 460, calcY, { width: 85, align: 'right' });
         
      doc.text('GST (18%):', 330, calcY + 15)
         .text(`Rs.${(invoice.tax).toFixed(2)}`, 460, calcY + 15, { width: 85, align: 'right' });

      doc.strokeColor('#cbd5e1')
         .lineWidth(1)
         .moveTo(330, calcY + 32)
         .lineTo(555, calcY + 32)
         .stroke();

      doc.fillColor('#0f9d63')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('Total Amount Paid:', 330, calcY + 38)
         .text(`Rs.${(invoice.total).toFixed(2)} INR`, 460, calcY + 38, { width: 85, align: 'right' });

      // ─── Signatures / Footer ───
      const footerY = 700;
      doc.strokeColor('#e2e8f0')
         .lineWidth(0.5)
         .moveTo(40, footerY)
         .lineTo(555, footerY)
         .stroke();

      doc.fillColor('#94a3b8')
         .fontSize(8)
         .font('Helvetica')
         .text('Created At', 40, footerY + 12)
         .fillColor('#475569')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text(new Date(invoice.createdAt).toLocaleDateString(), 40, footerY + 22);

      doc.fillColor('#94a3b8')
         .fontSize(8.5)
         .font('Helvetica-Bold')
         .text('Authorized Signatory', 420, footerY + 12, { align: 'right', width: 135 });
      doc.strokeColor('#cbd5e1')
         .lineWidth(0.5)
         .moveTo(435, footerY + 35)
         .lineTo(555, footerY + 35)
         .stroke();
      doc.fillColor('#94a3b8')
         .fontSize(7)
         .text('Powered by Inventory Ant Ltd.', 420, footerY + 40, { align: 'right', width: 135 });

      doc.end();
    });
  }
}
