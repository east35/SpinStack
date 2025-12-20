/**
 * Mock Data Service for Demo Mode
 * Provides in-memory data operations with localStorage persistence for interactive features
 */

import mockData from './mockData.json';

const STORAGE_KEYS = {
  LIKED: 'spinstack_demo_liked',
  PLAYED: 'spinstack_demo_played',
  DAILY_STACK: 'spinstack_demo_daily_stack',
  DAILY_STACK_DATE: 'spinstack_demo_daily_stack_date',
};

class MockDataService {
  constructor() {
    this.data = mockData;
    this.loadFromStorage();
  }

  /**
   * Load user interactions from localStorage
   */
  loadFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const liked = localStorage.getItem(STORAGE_KEYS.LIKED);
      const played = localStorage.getItem(STORAGE_KEYS.PLAYED);

      this.likedSet = new Set(liked ? JSON.parse(liked) : []);
      this.playedMap = new Map(played ? JSON.parse(played) : []);

      // Initialize with some demo data if empty (first visit)
      if (this.likedSet.size === 0 && this.playedMap.size === 0 && this.data.collection.length > 0) {
        this.initializeDemoData();
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      this.likedSet = new Set();
      this.playedMap = new Map();
    }
  }

  /**
   * Initialize demo data with some realistic likes and plays
   */
  initializeDemoData() {
    const albums = this.data.collection;
    if (albums.length === 0) return;

    // Like ~15% of albums (random selection)
    const likeCount = Math.floor(albums.length * 0.15);
    const likedIndices = new Set();
    while (likedIndices.size < likeCount) {
      likedIndices.add(Math.floor(Math.random() * albums.length));
    }
    likedIndices.forEach(i => this.likedSet.add(albums[i].id));

    // Add play counts to ~60% of albums with varied counts
    const playCount = Math.floor(albums.length * 0.6);
    const playedIndices = new Set();
    while (playedIndices.size < playCount) {
      playedIndices.add(Math.floor(Math.random() * albums.length));
    }
    playedIndices.forEach(i => {
      // Random play count weighted towards lower numbers (1-10 plays mostly, some up to 30)
      const plays = Math.floor(Math.random() * Math.random() * 30) + 1;
      this.playedMap.set(albums[i].id, plays);
    });

    this.saveToStorage();
  }

  /**
   * Save user interactions to localStorage
   */
  saveToStorage() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify([...this.likedSet]));
      localStorage.setItem(STORAGE_KEYS.PLAYED, JSON.stringify([...this.playedMap]));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  /**
   * Get collection with filters, sorting, and pagination
   */
  getCollection(params = {}) {
    const {
      genre,
      search,
      liked,
      unlistened,
      limit = 50,
      offset = 0,
      sort = 'date_added_desc'
    } = params;

    let records = [...this.data.collection];

    // Apply filters
    if (genre) {
      // Since our mock data doesn't have genre arrays populated,
      // we simulate genre filtering by using a deterministic subset based on genre name
      // This ensures the same genre always returns the same albums
      const genreHash = genre.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const genreSubsetSize = Math.floor(this.data.collection.length * 0.25); // ~25% of collection per genre

      records = records.filter((r, idx) => {
        // Use a deterministic formula based on genre hash and record index
        // This ensures each genre gets a consistent subset of albums
        return (idx + genreHash) % 4 === genreHash % 4;
      });
    }

    if (search) {
      const query = search.toLowerCase();
      records = records.filter(r =>
        r.title?.toLowerCase().includes(query) ||
        r.artist?.toLowerCase().includes(query) ||
        r.label?.toLowerCase().includes(query)
      );
    }

    if (liked === 'true' || liked === true) {
      records = records.filter(r => this.likedSet.has(r.id));
    }

    if (unlistened === 'true' || unlistened === true) {
      records = records.filter(r => !this.playedMap.has(r.id) || this.playedMap.get(r.id) === 0);
    }

    // Apply sorting
    records.sort((a, b) => {
      switch (sort) {
        case 'title_asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title_desc':
          return (b.title || '').localeCompare(a.title || '');
        case 'artist_asc':
          return (a.artist || '').localeCompare(b.artist || '');
        case 'artist_desc':
          return (b.artist || '').localeCompare(a.artist || '');
        case 'year_asc':
          return (a.year || 9999) - (b.year || 9999);
        case 'year_desc':
          return (b.year || 0) - (a.year || 0);
        case 'listened_count_asc':
          return (this.playedMap.get(a.id) || 0) - (this.playedMap.get(b.id) || 0);
        case 'listened_count_desc':
          return (this.playedMap.get(b.id) || 0) - (this.playedMap.get(a.id) || 0);
        case 'date_added_asc':
        case 'date_added_desc':
        default:
          // Use array index as proxy for date added (most recent first in our export)
          return 0;
      }
    });

    // Apply pagination
    const totalCount = records.length;
    const paginatedRecords = records.slice(offset, offset + limit);

    // Add liked and play count to each record
    const enrichedRecords = paginatedRecords.map(r => ({
      ...r,
      is_liked: this.likedSet.has(r.id),
      listened_count: this.playedMap.get(r.id) || 0,
    }));

    return {
      records: enrichedRecords,
      count: enrichedRecords.length,
      totalCount,
      limit,
      offset,
    };
  }

  /**
   * Get available genres
   */
  getGenres() {
    // Since our mock data doesn't have genre arrays populated,
    // return the genres from stats that we've manually defined
    if (this.data.stats && this.data.stats.topGenres) {
      return {
        genres: this.data.stats.topGenres.map(g => g.genre).sort()
      };
    }

    const genresSet = new Set();
    this.data.collection.forEach(record => {
      if (record.genres) {
        record.genres.forEach(genre => genresSet.add(genre));
      }
    });
    return {
      genres: Array.from(genresSet).sort()
    };
  }

  /**
   * Get collection stats
   */
  getStats() {
    const totalRecords = this.data.collection.length;
    const totalLiked = this.likedSet.size;
    const totalListened = Array.from(this.playedMap.values()).filter(count => count > 0).length;
    const totalUnlistened = totalRecords - totalListened;

    // Get most played
    const mostPlayed = this.data.collection
      .map(r => ({
        ...r,
        is_liked: this.likedSet.has(r.id),
        listened_count: this.playedMap.get(r.id) || 0,
      }))
      .sort((a, b) => b.listened_count - a.listened_count)
      .slice(0, 5);

    // Get dusty gems (never or rarely played)
    const dustyGems = this.data.collection
      .map(r => ({
        ...r,
        is_liked: this.likedSet.has(r.id),
        listened_count: this.playedMap.get(r.id) || 0,
      }))
      .filter(r => r.listened_count <= 1)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);

    return {
      collection: {
        total_records: totalRecords,
        total_listened: totalListened,
        total_unlistened: totalUnlistened,
        total_liked: totalLiked,
      },
      topGenres: this.data.stats.topGenres || [],
      favoriteGenre: this.data.stats.favoriteGenre,
      favoriteArtist: this.data.stats.favoriteArtist,
      mostPlayed,
      dustyGems,
    };
  }

  /**
   * Toggle like on a record
   */
  toggleLike(recordId) {
    if (this.likedSet.has(recordId)) {
      this.likedSet.delete(recordId);
    } else {
      this.likedSet.add(recordId);
    }
    this.saveToStorage();
    return {
      success: true,
      is_liked: this.likedSet.has(recordId),
    };
  }

  /**
   * Mark record as played
   */
  markPlayed(recordId) {
    const currentCount = this.playedMap.get(recordId) || 0;
    this.playedMap.set(recordId, currentCount + 1);
    this.saveToStorage();
    return {
      success: true,
      listened_count: this.playedMap.get(recordId),
    };
  }

  /**
   * Get daily stack
   */
  getDailyStack() {
    if (typeof window === 'undefined') {
      return { stack: this.data.stacks.daily };
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const savedDate = localStorage.getItem(STORAGE_KEYS.DAILY_STACK_DATE);
      const savedStack = localStorage.getItem(STORAGE_KEYS.DAILY_STACK);

      // Return saved stack if it's from today
      if (savedDate === today && savedStack) {
        return { stack: JSON.parse(savedStack) };
      }

      // Generate new daily stack
      const newStack = this.generateDailyStack();
      localStorage.setItem(STORAGE_KEYS.DAILY_STACK, JSON.stringify(newStack));
      localStorage.setItem(STORAGE_KEYS.DAILY_STACK_DATE, today);

      return { stack: newStack };
    } catch (error) {
      console.error('Failed to get daily stack:', error);
      return { stack: this.data.stacks.daily };
    }
  }

  /**
   * Generate a new random daily stack
   */
  generateDailyStack() {
    const albums = [...this.data.collection]
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);

    return {
      id: 'daily',
      name: "Today's Setlist",
      date: new Date().toISOString().split('T')[0],
      albums,
    };
  }

  /**
   * Refresh daily stack
   */
  refreshDailyStack() {
    const newStack = this.generateDailyStack();

    if (typeof window !== 'undefined') {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem(STORAGE_KEYS.DAILY_STACK, JSON.stringify(newStack));
      localStorage.setItem(STORAGE_KEYS.DAILY_STACK_DATE, today);
    }

    return { stack: newStack };
  }

  /**
   * Get weekly stacks
   */
  getWeeklyStacks() {
    return {
      stacks: this.data.stacks.weekly,
      weekStartDate: new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Refresh weekly stacks
   */
  refreshWeeklyStacks() {
    // In demo mode, just shuffle the existing stacks
    const shuffled = [...this.data.stacks.weekly].sort(() => Math.random() - 0.5);
    return {
      stacks: shuffled,
      weekStartDate: new Date().toISOString().split('T')[0],
    };
  }
}

// Export singleton instance
const mockDataService = new MockDataService();
export default mockDataService;
