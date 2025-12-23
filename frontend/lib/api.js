import axios from 'axios';
import { isDemoMode, demoAuth, demoCollection, demoStacks, demoStats, demoPlaylists } from './demoApi';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  withCredentials: true,
});

// Add interceptor to include session ID in headers if available
api.interceptors.request.use((config) => {
  const sessionId = typeof window !== 'undefined' ? localStorage.getItem('vinyl_session_id') : null;
  if (sessionId) {
    config.headers['X-Session-Id'] = sessionId;
  }
  return config;
});

/**
 * Wrapper to use demo API when in demo mode
 */
function wrapApi(realApi, demoApi) {
  const wrapped = {};
  Object.keys(realApi).forEach(key => {
    wrapped[key] = (...args) => {
      if (isDemoMode()) {
        return demoApi[key](...args);
      }
      return realApi[key](...args);
    };
  });
  return wrapped;
}

const realAuth = {
  login: () => api.get('/api/auth/login'),
  callback: (oauthVerifier, state) => api.post('/api/auth/callback', { oauth_verifier: oauthVerifier, state }),
  me: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
  updatePreferences: (data) => api.patch('/api/auth/preferences', data),
};

const realCollection = {
  sync: () => api.post('/api/collection/sync'),
  getAll: (params) => api.get('/api/collection', { params }),
  getStats: () => api.get('/api/collection/stats'),
  getGenres: () => api.get('/api/collection/genres'),
  markPlayed: (id) => api.post(`/api/collection/${id}/play`),
  toggleLike: (id) => api.post(`/api/collection/${id}/like`),
};

const realStacks = {
  getDaily: () => api.get('/api/stacks/daily'),
  getWeekly: () => api.get('/api/stacks/weekly'),
  getStyles: () => api.get('/api/stacks/styles'),
  getCurated: () => api.get('/api/stacks/random'), // Alias for backward compatibility
  refreshDaily: () => api.post('/api/stacks/daily/refresh'),
  refreshWeekly: () => api.post('/api/stacks/weekly/refresh'),
  markPlayed: (data) => api.post('/api/stacks/mark-played', data),
  // Custom stacks
  getCustom: () => api.get('/api/stacks/custom'),
  getDraft: () => api.get('/api/stacks/custom/draft'),
  createCustom: () => api.post('/api/stacks/custom/create'),
  addAlbumToStack: (stackId, albumId) => api.post(`/api/stacks/custom/${stackId}/add-album`, { albumId }),
  removeAlbumFromStack: (stackId, albumId) => api.delete(`/api/stacks/custom/${stackId}/albums/${albumId}`),
  saveCustomStack: (stackId, name, subtitle) => api.post(`/api/stacks/custom/${stackId}/save`, { name, subtitle }),
  deleteCustomStack: (stackId) => api.delete(`/api/stacks/custom/${stackId}`),
  getRecommendations: (stackId) => api.get(`/api/stacks/custom/${stackId}/recommendations`),
};

const realStats = {
  get: () => api.get('/api/stats'),
};

const realPlaylists = {
  generate: (data) => api.post('/api/playlists/generate', data),
  getAll: () => api.get('/api/playlists'),
  getById: (id) => api.get(`/api/playlists/${id}`),
  delete: (id) => api.delete(`/api/playlists/${id}`),
};

// Export wrapped APIs that automatically use demo mode when enabled
export const auth = wrapApi(realAuth, demoAuth);
export const collection = wrapApi(realCollection, demoCollection);
export const stacks = wrapApi(realStacks, demoStacks);
export const stats = wrapApi(realStats, demoStats);
export const playlists = wrapApi(realPlaylists, demoPlaylists);

export default api;
