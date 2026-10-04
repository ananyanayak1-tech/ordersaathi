/**
 * API service for OrderSaathi.
 * Reads the backend base URL from import.meta.env.VITE_API_URL with fallback to http://localhost:5000.
 */
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (netErr) {
    throw new Error(`Unable to connect to server at ${API_BASE}. Please ensure backend is running.`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || data?.details || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  /** Health check */
  checkHealth() {
    return request('/');
  },

  /** Extract orders from WhatsApp chat text using Gemini Flash. */
  extractOrders(chatText) {
    return request('/api/extract', {
      method: 'POST',
      body: JSON.stringify({ chatText })
    });
  },

  /** Save confirmed orders into the database. */
  createOrders(orders) {
    return request('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ orders })
    });
  },

  /** Fetch all orders, newest first. */
  getOrders() {
    return request('/api/orders', { method: 'GET' });
  },

  /** Update payment status of an order. */
  updatePaymentStatus(id, payment_status) {
    return request(`/api/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_status })
    });
  },

  /** Generate an AI reminder message in Hinglish for an order. */
  getReminder(id) {
    return request('/api/reminder', {
      method: 'POST',
      body: JSON.stringify({ id })
    });
  },

  // ── Catalog ────────────────────────────────────────────────────────────────

  /** Fetch all catalog items. */
  getCatalog() {
    return request('/api/catalog', { method: 'GET' });
  },

  /**
   * Add a catalog item.
   * @param {{ name: string, aliases?: string[], price_per_unit: number, unit?: string }} item
   */
  addCatalogItem(item) {
    return request('/api/catalog', {
      method: 'POST',
      body: JSON.stringify(item)
    });
  },

  /** Delete a catalog item by id. */
  deleteCatalogItem(id) {
    return request(`/api/catalog/${id}`, { method: 'DELETE' });
  }
};

export default api;
