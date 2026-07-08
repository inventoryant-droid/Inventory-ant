import { API_BASE_URL } from '../utils/config';

const getHeaders = () => {
  const token = localStorage.getItem('ant_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const NotificationService = {
  async getNotifications() {
    const res = await fetch(`${API_BASE_URL}/api/user/notifications`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch notifications');
    return res.json();
  },
};
