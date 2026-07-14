import { API_BASE_URL } from '../utils/config';

const getHeaders = () => {
  const token = localStorage.getItem('ant_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const AdminService = {
  async getDashboardAnalytics() {
    const res = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch admin metrics');
    return res.json();
  },

  async getBusinessAnalytics() {
    const res = await fetch(`${API_BASE_URL}/api/admin/analytics`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch business analytics');
    return res.json();
  },

  async getUsers(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE_URL}/api/admin/users${query}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch user accounts');
    return res.json();
  },

  async getUserDetails(userId) {
    const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/details`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch user details');
    return res.json();
  },

  async disableUser(userId, active) {
    const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/disable`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ active }),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update user status');
    return res.json();
  },

  async forceLogout(userId) {
    const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/force-logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to force logout user');
    return res.json();
  },

  async getSubscriptions(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE_URL}/api/admin/subscriptions${query}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch subscriptions');
    return res.json();
  },

  async manageSubscription(subId, fields) {
    const res = await fetch(`${API_BASE_URL}/api/admin/subscriptions/${subId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to manage subscription override');
    return res.json();
  },

  async assignPlan(subId, planId) {
    const res = await fetch(`${API_BASE_URL}/api/admin/subscriptions/${subId}/assign-plan`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ planId }),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to assign plan');
    return res.json();
  },

  async getFeatureFlags() {
    const res = await fetch(`${API_BASE_URL}/api/admin/feature-flags`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch feature flags');
    return res.json();
  },

  async getAiConfigs() {
    const res = await fetch(`${API_BASE_URL}/api/admin/ai-config`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch AI configurations');
    return res.json();
  },

  async getSystemHealth() {
    const res = await fetch(`${API_BASE_URL}/api/v1/health`);
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch system health');
    return res.json();
  },

  async getLogs() {
    const res = await fetch(`${API_BASE_URL}/api/admin/logs`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch system logs');
    return res.json();
  },

  async getPayments() {
    const res = await fetch(`${API_BASE_URL}/api/admin/payments`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch payments log');
    return res.json();
  },

  async refundPayment(txnId) {
    const res = await fetch(`${API_BASE_URL}/api/admin/payments/refund`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ txnId }),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to refund transaction');
    return res.json();
  },

  async getSystemStatus() {
    const res = await fetch(`${API_BASE_URL}/api/admin/system`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch system status');
    return res.json();
  },
};
