import { Injectable } from '@nestjs/common';
import { PaymentProvider, PaymentOrderOptions, PaymentOrderResult, PaymentDetails } from './payment-provider.interface';
import * as crypto from 'crypto';
const Razorpay = require('razorpay');

@Injectable()
export class RazorpayProvider implements PaymentProvider {
  private razorpay: any;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId123';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mockKeySecret456';
    
    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  async createOrder(options: PaymentOrderOptions): Promise<PaymentOrderResult> {
    const response = await this.razorpay.orders.create({
      amount: options.amount,
      currency: options.currency,
      receipt: options.receipt,
      notes: options.notes,
    });

    return {
      id: response.id,
      amount: response.amount,
      currency: response.currency,
      receipt: response.receipt,
      status: response.status,
    };
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    return expectedSignature === signature;
  }

  async capturePayment(paymentId: string, amount: number, currency: string): Promise<PaymentDetails> {
    const response = await this.razorpay.payments.capture(paymentId, amount, currency);
    return {
      id: response.id,
      orderId: response.order_id,
      amount: response.amount,
      currency: response.currency,
      status: response.status,
      method: response.method,
      email: response.email,
      contact: response.contact,
      createdAt: new Date(response.created_at * 1000),
    };
  }

  async refundPayment(paymentId: string, amount?: number): Promise<any> {
    const params: any = {};
    if (amount !== undefined) params.amount = amount;
    return this.razorpay.payments.refund(paymentId, params);
  }

  async fetchPayment(paymentId: string): Promise<PaymentDetails> {
    const response = await this.razorpay.payments.fetch(paymentId);
    return {
      id: response.id,
      orderId: response.order_id,
      amount: response.amount,
      currency: response.currency,
      status: response.status,
      method: response.method,
      email: response.email,
      contact: response.contact,
      createdAt: new Date(response.created_at * 1000),
    };
  }
}
