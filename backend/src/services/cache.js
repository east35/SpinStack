const redis = require('../config/redis');
const db = require('../db');

/**
 * Cache service for persistent daily and weekly stacks
 * Uses Redis for fast access with TTL, PostgreSQL for backup/persistence
 */
class CacheService {
  /**
   * Get daily stack from cache or database
   * @param {number} userId
   * @param {string} date - ISO date string (YYYY-MM-DD)
   * @returns {Promise<Array|null>} Array of albums or null
   */
  async getDailyStack(userId, date) {
    const key = `stack:daily:${userId}:${date}`;

    try {
      // Try Redis first
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fall back to database
      const result = await db.query(
        'SELECT albums FROM daily_stacks WHERE user_id = $1 AND stack_date = $2',
        [userId, date]
      );

      if (result.rows.length > 0) {
        const albums = result.rows[0].albums;
        // Re-cache in Redis
        await this.cacheDailyStack(userId, date, albums);
        return albums;
      }

      return null;
    } catch (error) {
      console.error('Error getting daily stack from cache:', error);
      // On error, try database directly
      try {
        const result = await db.query(
          'SELECT albums FROM daily_stacks WHERE user_id = $1 AND stack_date = $2',
          [userId, date]
        );
        return result.rows.length > 0 ? result.rows[0].albums : null;
      } catch (dbError) {
        console.error('Error getting daily stack from database:', dbError);
        return null;
      }
    }
  }

  /**
   * Cache daily stack in Redis with TTL until midnight
   * @param {number} userId
   * @param {string} date - ISO date string (YYYY-MM-DD)
   * @param {Array} albums
   */
  async cacheDailyStack(userId, date, albums) {
    const key = `stack:daily:${userId}:${date}`;
    const ttl = this.getSecondsUntilMidnight();

    try {
      await redis.setEx(key, ttl, JSON.stringify(albums));
    } catch (error) {
      console.error('Error caching daily stack:', error);
      // Non-fatal - app can continue without cache
    }
  }

  /**
   * Get weekly stacks from cache or database
   * @param {number} userId
   * @param {string} weekStartDate - ISO date string (YYYY-MM-DD) for Monday
   * @returns {Promise<Array>} Array of stack objects
   */
  async getWeeklyStacks(userId, weekStartDate) {
    const key = `stack:weekly:${userId}:${weekStartDate}`;

    try {
      // Try Redis first
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fall back to database
      const result = await db.query(
        'SELECT stack_type as id, stack_name as name, albums FROM weekly_stacks WHERE user_id = $1 AND week_start_date = $2 ORDER BY created_at',
        [userId, weekStartDate]
      );

      if (result.rows.length > 0) {
        const stacks = result.rows;
        // Re-cache in Redis
        await this.cacheWeeklyStacks(userId, weekStartDate, stacks);
        return stacks;
      }

      return [];
    } catch (error) {
      console.error('Error getting weekly stacks from cache:', error);
      // On error, try database directly
      try {
        const result = await db.query(
          'SELECT stack_type as id, stack_name as name, albums FROM weekly_stacks WHERE user_id = $1 AND week_start_date = $2 ORDER BY created_at',
          [userId, weekStartDate]
        );
        return result.rows;
      } catch (dbError) {
        console.error('Error getting weekly stacks from database:', dbError);
        return [];
      }
    }
  }

  /**
   * Cache weekly stacks in Redis with TTL until next Monday
   * @param {number} userId
   * @param {string} weekStartDate - ISO date string (YYYY-MM-DD)
   * @param {Array} stacks
   */
  async cacheWeeklyStacks(userId, weekStartDate, stacks) {
    const key = `stack:weekly:${userId}:${weekStartDate}`;
    const ttl = this.getSecondsUntilNextMonday();

    try {
      await redis.setEx(key, ttl, JSON.stringify(stacks));
    } catch (error) {
      console.error('Error caching weekly stacks:', error);
      // Non-fatal - app can continue without cache
    }
  }

  /**
   * Invalidate cache for a specific daily stack
   * @param {number} userId
   * @param {string} date
   */
  async invalidateDailyStack(userId, date) {
    const key = `stack:daily:${userId}:${date}`;
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Error invalidating daily stack cache:', error);
    }
  }

  /**
   * Invalidate cache for weekly stacks
   * @param {number} userId
   * @param {string} weekStartDate
   */
  async invalidateWeeklyStacks(userId, weekStartDate) {
    const key = `stack:weekly:${userId}:${weekStartDate}`;
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Error invalidating weekly stacks cache:', error);
    }
  }

  /**
   * Calculate seconds until midnight (for daily stack TTL)
   * @param {string} timezone - User timezone (default: UTC)
   * @returns {number} Seconds until midnight
   */
  getSecondsUntilMidnight(timezone = 'UTC') {
    // For now, use UTC. TODO: Implement timezone-aware calculation
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    const seconds = Math.floor((midnight - now) / 1000);
    return Math.max(seconds, 60); // Minimum 1 minute TTL
  }

  /**
   * Calculate seconds until next Monday at midnight (for weekly stack TTL)
   * @returns {number} Seconds until next Monday
   */
  getSecondsUntilNextMonday() {
    const now = new Date();
    const nextMonday = new Date(now);
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);

    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(0, 0, 0, 0);

    const seconds = Math.floor((nextMonday - now) / 1000);
    return Math.max(seconds, 3600); // Minimum 1 hour TTL
  }

  /**
   * Get Monday of the current week
   * @param {Date} date
   * @returns {Date} Monday at 00:00 UTC
   */
  getMonday(date = new Date()) {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days; otherwise go to Monday
    d.setUTCDate(d.getUTCDate() + diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Format date as YYYY-MM-DD in UTC
   * @param {Date} date
   * @returns {string}
   */
  formatDate(date = new Date()) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Health check for Redis connection
   * @returns {Promise<boolean>}
   */
  async isHealthy() {
    try {
      await redis.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
}

module.exports = new CacheService();
