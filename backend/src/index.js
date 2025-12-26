// Load env from backend/.env (run this server from the backend directory)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');

const authRoutes = require('./routes/auth');
const collectionRoutes = require('./routes/collection');
const playlistRoutes = require('./routes/playlists');
const importRoutes = require('./routes/import');
const stacksRoutes = require('./routes/stacks');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy to get correct protocol from X-Forwarded-Proto
app.set('trust proxy', 1);

// Redis client setup
let redisClient;
if (process.env.REDIS_URL) {
  redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.connect().catch(console.error);
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Session-Id'],
  exposedHeaders: ['Set-Cookie'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: true, // Create session even if not modified (needed for OAuth)
  cookie: {
    secure: 'auto', // Auto-detect: true if HTTPS (via X-Forwarded-Proto), false if HTTP
    httpOnly: false, // Allow JavaScript access for mobile compatibility debugging
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax', // 'lax' allows cookies to be sent on OAuth redirects
    path: '/', // Ensure cookie is sent for all paths
    // Don't set domain - let browser use the request hostname
  },
  name: 'vinyl.sid', // Custom session name
  proxy: true, // Trust proxy headers (required for secure: 'auto' to work)
};

if (redisClient) {
  sessionConfig.store = new RedisStore({ client: redisClient });
}

app.use(session(sessionConfig));

// Custom middleware to handle session ID from header (fallback for mobile)
app.use((req, res, next) => {
  const sessionIdFromHeader = req.headers['x-session-id'];
  if (sessionIdFromHeader && sessionIdFromHeader !== req.sessionID) {
    // Load session data from store using header session ID
    console.log('🔧 Using session ID from header:', sessionIdFromHeader);
    req.sessionStore.get(sessionIdFromHeader, (err, sessionData) => {
      if (err) {
        console.error('❌ Error loading session from header:', err);
        return next();
      }
      if (sessionData) {
        // Create a new session with the loaded data
        req.sessionStore.createSession(req, sessionData);
        req.sessionID = sessionIdFromHeader;

        // Mark this session as header-based to prevent touch() calls
        req.session._headerBased = true;

        // Override touch() to prevent errors
        req.session.touch = function() { return this; };

        console.log('✅ Session loaded from header, userId:', sessionData.userId);
      }
      next();
    });
  } else {
    next();
  }
});

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Session debug endpoint (development only)
app.get('/api/debug/session', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({
    sessionId: req.sessionID,
    hasSession: !!req.session,
    userId: req.session?.userId || null,
    username: req.session?.username || null,
    hasOAuthTokens: !!(req.session?.oauthToken && req.session?.oauthTokenSecret),
    cookie: {
      maxAge: req.session?.cookie?.maxAge,
      expires: req.session?.cookie?.expires,
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/collection', collectionRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/import', importRoutes);
app.use('/api/stacks', stacksRoutes);
app.use('/api/stats', statsRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎵 Vinyl Collection API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
