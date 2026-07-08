import { API_BASE_URL } from '../utils/config';

const getHeaders = () => {
  const token = localStorage.getItem('ant_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const InventoryService = {
  async getProducts() {
    const res = await fetch(`${API_BASE_URL}/api/user/products`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch products');
    return res.json();
  },

  async addProduct(productData) {
    const res = await fetch(`${API_BASE_URL}/api/user/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(productData),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to add product');
    return res.json();
  },

  async editProduct(id, productData) {
    const res = await fetch(`${API_BASE_URL}/api/user/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(productData),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update product');
    return res.json();
  },

  async deleteProduct(id) {
    const res = await fetch(`${API_BASE_URL}/api/user/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to delete product');
    return res.json();
  },
};
