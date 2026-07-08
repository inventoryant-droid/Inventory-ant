import { API_BASE_URL } from '../utils/config';

const getHeaders = () => {
  const token = localStorage.getItem('ant_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const SubscriptionService = {
  async getPlans() {
    const res = await fetch(`${API_BASE_URL}/api/subscription/plans`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch plans');
    return res.json();
  },

  async getPlansCompare() {
    const res = await fetch(`${API_BASE_URL}/api/subscription/plans/compare`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch plan comparison matrix');
    return res.json();
  },

  async getCurrentSubscription() {
    const res = await fetch(`${API_BASE_URL}/api/subscription/current`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch current subscription');
    return res.json();
  },

  async getUserUsages() {
    const res = await fetch(`${API_BASE_URL}/api/subscription/usage`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch usages');
    return res.json();
  },

  async getSubscriptionHistory() {
    const res = await fetch(`${API_BASE_URL}/api/subscription/history`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch subscription history');
    return res.json();
  },

  async getUpcomingRenewal() {
    const res = await fetch(`${API_BASE_URL}/api/subscription/upcoming-renewal`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch upcoming renewal details');
    return res.json();
  },

  async applyCoupon(planId, billingCycle, code) {
    const res = await fetch(`${API_BASE_URL}/api/subscription/apply-coupon`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ planId, billingCycle, code }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Failed to apply coupon');
    }
    return res.json();
  },

  async changePlan(planSlug, billingCycle) {
    const res = await fetch(`${API_BASE_URL}/api/subscription/change-plan`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ planSlug, billingCycle }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Failed to change plan');
    }
    return res.json();
  },

  async renewSubscription(paymentId) {
    const res = await fetch(`${API_BASE_URL}/api/subscription/renew`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ paymentId }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Failed to renew subscription');
    }
    return res.json();
  },

  async cancelSubscription(reason) {
    const res = await fetch(`${API_BASE_URL}/api/subscription/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Failed to cancel subscription');
    }
    return res.json();
  },

  async resumeSubscription() {
    const res = await fetch(`${API_BASE_URL}/api/subscription/resume`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Failed to resume subscription');
    }
    return res.json();
  },

  async startTrial(planSlug) {
    const res = await fetch(`${API_BASE_URL}/api/subscription/start-trial`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ planSlug }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Failed to start trial');
    }
    return res.json();
  },
};
