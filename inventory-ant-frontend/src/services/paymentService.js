import { API_BASE_URL } from '../utils/config';

const getHeaders = () => {
  const token = localStorage.getItem('ant_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const PaymentService = {
  async createOrder(planId, billingCycle, couponCode) {
    const res = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ planId, billingCycle, couponCode }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Failed to create payment order');
    }
    return res.json();
  },

  async getBillingHistory() {
    const res = await fetch(`${API_BASE_URL}/api/subscription/billing-history`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch billing history');
    return res.json();
  },

  async downloadInvoicePdf(invoiceId) {
    const res = await fetch(`${API_BASE_URL}/api/subscription/billing-history/${invoiceId}/download`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to download invoice PDF');
    return res.blob();
  },
};
