const { createClient } = require('redis');

// Create and export Redis client
let redisClient;

if (process.env.REDIS_URL) {
  redisClient = createClient({ url: process.env.REDIS_URL });

  redisClient.connect().catch((err) => {
    console.error('Redis connection error:', err);
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connected');
  });
} else {
  console.warn('⚠️  REDIS_URL not set - caching will be disabled');
  // Create a mock client that does nothing
  redisClient = {
    get: async () => null,
    set: async () => {},
    setex: async () => {},
    del: async () => {},
    ping: async () => { throw new Error('Redis not configured'); },
  };
}

module.exports = redisClient;
