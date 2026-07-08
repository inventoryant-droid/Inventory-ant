import { Injectable, BadRequestException } from '@nestjs/common';
import { SubscriptionRepository } from './subscription.repository';
import { Plan, Coupon } from '@prisma/client';

export interface IPricingBreakdown {
  basePrice: number;
  discount: number;
  couponDiscount: number;
  tax: number;
  finalAmount: number;
  savings: number;
  renewalAmount: number;
  currency: string;
}

@Injectable()
export class PriceCalculationService {
  constructor(private readonly repository: SubscriptionRepository) {}

  async validateCoupon(code: string, planId: string, baseAmount: number): Promise<Coupon> {
    const coupon = await (this.repository as any).prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }

    if (!coupon.active) {
      throw new BadRequestException('This coupon is no longer active');
    }

    const now = new Date();
    if (now < coupon.validFrom) {
      throw new BadRequestException('Coupon promotion has not started yet');
    }
    if (now > coupon.validTill) {
      throw new BadRequestException('Coupon has expired');
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit has been reached');
    }

    if (coupon.planId !== null && coupon.planId !== planId) {
      throw new BadRequestException('This coupon is not valid for the selected plan');
    }

    if (coupon.minimumAmount !== null && baseAmount < coupon.minimumAmount) {
      throw new BadRequestException(`Minimum purchase of Rs.${coupon.minimumAmount} required to use this coupon`);
    }

    return coupon;
  }

  calculateDiscount(coupon: Coupon, baseAmount: number): number {
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (baseAmount * coupon.discountValue) / 100;
      if (coupon.maximumDiscount !== null && discount > coupon.maximumDiscount) {
        discount = coupon.maximumDiscount;
      }
    } else if (coupon.discountType === 'fixed') {
      discount = coupon.discountValue;
    }
    return Math.min(discount, baseAmount);
  }

  async calculatePricing(
    planId: string,
    billingCycle: 'monthly' | 'yearly',
    couponCode?: string,
  ): Promise<IPricingBreakdown> {
    const plan = await this.repository.findPlanById(planId);
    if (!plan) {
      throw new BadRequestException('Invalid plan ID');
    }

    const basePrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    let couponDiscount = 0;

    if (couponCode) {
      const coupon = await this.validateCoupon(couponCode, planId, basePrice);
      couponDiscount = this.calculateDiscount(coupon, basePrice);
    }

    // Savings: If yearly, show monthly rate * 12 vs yearly rate + coupon savings
    let savings = 0;
    if (billingCycle === 'yearly') {
      const monthlyEquivalentTotal = plan.monthlyPrice * 12;
      savings = Math.max(0, monthlyEquivalentTotal - plan.yearlyPrice) + couponDiscount;
    } else {
      savings = couponDiscount;
    }

    const netAmount = basePrice - couponDiscount;
    const gstRate = 0.18; // Tax-ready 18% GST default
    const tax = netAmount * gstRate;
    const finalAmount = netAmount + tax;

    // Recurring renewal price does not include one-off coupon discount unless coupon is persistent
    const renewalNetAmount = basePrice;
    const renewalAmount = renewalNetAmount + (renewalNetAmount * gstRate);

    return {
      basePrice,
      discount: couponDiscount,
      couponDiscount,
      tax,
      finalAmount,
      savings,
      renewalAmount,
      currency: plan.currency || 'INR',
    };
  }
}
