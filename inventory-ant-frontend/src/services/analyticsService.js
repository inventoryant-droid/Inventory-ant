import { API_BASE_URL } from '../utils/config';

const getHeaders = () => {
  const token = localStorage.getItem('ant_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const AnalyticsService = {
  async getAnalytics(range) {
    const queryParam = range ? `?range=${range}` : '';
    const res = await fetch(`${API_BASE_URL}/api/user/analytics${queryParam}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch analytics reports');
    return res.json();
  },
};
