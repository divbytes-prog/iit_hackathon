import api from './client.js';

/**
 * Every server call the app makes, named after what it means rather than the
 * URL it hits. Components import from here, never from client.js directly.
 */

const timezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

export const auth = {
  register: ({ email, password, username }) =>
    api.post('/auth/register', { email, password, username, timezone: timezone() }),
  login: ({ email, password }) => api.post('/auth/login', { email, password, timezone: timezone() }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const tasks = {
  today: () => api.get('/tasks/today'),
  list: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
    ).toString();
    return api.get(`/tasks${query ? `?${query}` : ''}`);
  },
  create: (payload) => api.post('/tasks', payload),
  update: (id, payload) => api.patch(`/tasks/${id}`, payload),
  remove: (id) => api.del(`/tasks/${id}`),
  complete: (id) => api.post(`/tasks/${id}/complete`),
  reopen: (id) => api.post(`/tasks/${id}/reopen`),
  reorder: (ids) => api.post('/tasks/reorder', { ids }),
};

export const character = {
  get: () => api.get('/character'),
  rules: () => api.get('/character/rules'),
  savePreferences: (payload) => api.patch('/character/preferences', payload),
};

export const shop = {
  items: () => api.get('/shop/items'),
  inventory: () => api.get('/shop/inventory'),
  purchase: (slug) => api.post('/shop/purchase', { slug }),
  equip: (slot, slug) => api.post('/shop/equip', { slot, slug }),
};

export const stats = {
  summary: () => api.get('/stats/summary'),
  activity: (page = 1, limit = 25) => api.get(`/stats/activity?page=${page}&limit=${limit}`),
};

export default { auth, tasks, character, shop, stats };
