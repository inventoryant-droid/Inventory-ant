export interface PaymentOrderOptions {
  amount: number; // In minor units (e.g. paisa for INR)
  currency: string;
  receipt: string;
  notes?: any;
}

export interface PaymentOrderResult {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface PaymentDetails {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  email?: string;
  contact?: string;
  createdAt: Date;
}

export interface PaymentProvider {
  createOrder(options: PaymentOrderOptions): Promise<PaymentOrderResult>;
  verifySignature(payload: string, signature: string, secret: string): boolean;
  capturePayment(paymentId: string, amount: number, currency: string): Promise<PaymentDetails>;
  refundPayment(paymentId: string, amount?: number): Promise<any>;
  fetchPayment(paymentId: string): Promise<PaymentDetails>;
}
