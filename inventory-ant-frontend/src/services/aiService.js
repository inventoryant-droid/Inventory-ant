import { API_BASE_URL } from '../utils/config';

const getHeaders = () => {
  const token = localStorage.getItem('ant_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const AIService = {
  async getChatThreads() {
    const res = await fetch(`${API_BASE_URL}/api/user/products/chat-threads`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch chat sessions');
    return res.json();
  },

  async createChatThread(title) {
    const res = await fetch(`${API_BASE_URL}/api/user/products/chat-threads`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to create chat session');
    return res.json();
  },

  async deleteChatThread(id) {
    const res = await fetch(`${API_BASE_URL}/api/user/products/chat-threads/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to delete chat session');
    return res.json();
  },

  async sendAgentCommand(payload) {
    const res = await fetch(`${API_BASE_URL}/api/user/products/agent-command-v2`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to run AI command');
    }
    return res.json();
  },

  async scanBill(scanPayload) {
    const res = await fetch(`${API_BASE_URL}/api/user/products/scan-bill`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(scanPayload),
    });
    if (!res.ok) throw new Error(await res.text() || 'Smart Scanner failed');
    return res.json();
  },

  async confirmBill(confirmPayload) {
    const res = await fetch(`${API_BASE_URL}/api/user/products/confirm-bill`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(confirmPayload),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to sync scan items');
    return res.json();
  },

  async getScanHistory() {
    const res = await fetch(`${API_BASE_URL}/api/user/products/scan-history`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch scan logs');
    return res.json();
  },
};
