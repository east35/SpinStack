/**
 * Demo Mode API Wrapper
 * Intercepts API calls and returns mock data when in demo mode
 */

import mockDataService from './mockDataService';

const DEMO_MODE_KEY = 'spinstack_demo_mode';

/**
 * Check if demo mode is enabled
 */
export function isDemoMode() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEMO_MODE_KEY) === 'true';
}

/**
 * Enable demo mode
 */
export function enableDemoMode() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEMO_MODE_KEY, 'true');
  }
}

/**
 * Disable demo mode
 */
export function disableDemoMode() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEMO_MODE_KEY);
  }
}

/**
 * Create a promise-like response object for demo mode
 */
function mockResponse(data) {
  return Promise.resolve({ data });
}

/**
 * Create demo mode API methods
 */
export const demoAuth = {
  login: () => mockResponse({ demoMode: true }),
  callback: () => mockResponse({ demoMode: true }),
  me: () => mockResponse({
    user: {
      discogs_username: 'demo_user',
      stack_count: 5,
      demoMode: true,
    }
  }),
  logout: () => {
    disableDemoMode();
    return mockResponse({ success: true });
  },
  updatePreferences: (data) => mockResponse({ success: true, ...data }),
};

export const demoCollection = {
  sync: () => mockResponse({ success: true }),
  getAll: (params) => mockResponse(mockDataService.getCollection(params)),
  getStats: () => mockResponse({}), // Stats handled by stats API
  getGenres: () => mockResponse(mockDataService.getGenres()),
  markPlayed: (id) => mockResponse(mockDataService.markPlayed(id)),
  toggleLike: (id) => mockResponse(mockDataService.toggleLike(id)),
};

export const demoStacks = {
  getDaily: () => mockResponse(mockDataService.getDailyStack()),
  getWeekly: () => mockResponse(mockDataService.getWeeklyStacks()),
  getStyles: () => mockResponse({ stacks: [], clusters: [] }),
  getCurated: () => mockResponse(mockDataService.getWeeklyStacks()),
  refreshDaily: () => mockResponse(mockDataService.refreshDailyStack()),
  refreshWeekly: () => mockResponse(mockDataService.refreshWeeklyStacks()),
  markPlayed: (data) => {
    if (data.played && data.albumId) {
      mockDataService.markPlayed(data.albumId);
    }
    return mockResponse({ success: true });
  },
  // Custom stacks - return mock data for demo
  getCustom: () => mockResponse(mockDataService.getCustomStacks()),
  getDraft: () => mockResponse({ albums: [], stackId: 'demo-draft-1' }),
  createCustom: () => mockResponse({ stackId: 'demo-draft-' + Date.now(), albums: [] }),
  addAlbumToStack: (stackId, albumId) => mockResponse({ success: true }),
  removeAlbumFromStack: (stackId, albumId) => mockResponse({ success: true }),
  saveCustomStack: (stackId, name) => mockResponse({ success: true, stackId, name }),
  deleteCustomStack: (stackId) => mockResponse({ success: true }),
  getRecommendations: (stackId) => mockResponse({ suggestions: [] }),
};

export const demoStats = {
  get: () => mockResponse(mockDataService.getStats()),
};

export const demoPlaylists = {
  generate: (data) => mockResponse({ id: 'demo-playlist', ...data }),
  getAll: () => mockResponse([]),
  getById: (id) => mockResponse({ id }),
  delete: (id) => mockResponse({ success: true }),
};
