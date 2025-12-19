import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  withCredentials: true,
});

export const auth = {
  login: () => api.get('/api/auth/login'),
  callback: (oauthVerifier, state) => api.post('/api/auth/callback', { oauth_verifier: oauthVerifier, state }),
  me: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
  updatePreferences: (data) => api.patch('/api/auth/preferences', data),
};

export const collection = {
  sync: () => api.post('/api/collection/sync'),
  getAll: (params) => api.get('/api/collection', { params }),
  getStats: () => api.get('/api/collection/stats'),
  getGenres: () => api.get('/api/collection/genres'),
  markPlayed: (id) => api.post(`/api/collection/${id}/play`),
  toggleLike: (id) => api.post(`/api/collection/${id}/like`),
};

export const stacks = {
  getDaily: () => api.get('/api/stacks/daily'),
  getWeekly: () => api.get('/api/stacks/weekly'),
  getStyles: () => api.get('/api/stacks/styles'),
  getCurated: () => api.get('/api/stacks/random'), // Alias for backward compatibility
  refreshDaily: () => api.post('/api/stacks/daily/refresh'),
  refreshWeekly: () => api.post('/api/stacks/weekly/refresh'),
  markPlayed: (data) => api.post('/api/stacks/mark-played', data),
};

export const stats = {
  get: () => api.get('/api/stats'),
};

export const playlists = {
  generate: (data) => api.post('/api/playlists/generate', data),
  getAll: () => api.get('/api/playlists'),
  getById: (id) => api.get(`/api/playlists/${id}`),
  delete: (id) => api.delete(`/api/playlists/${id}`),
};

export default api;
