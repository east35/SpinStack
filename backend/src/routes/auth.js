const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createClient } = require('redis');
const discogsService = require('../services/discogs');
const db = require('../db');

// Redis client for OAuth state storage (separate from session store)
let redisClient;
if (process.env.REDIS_URL) {
  redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.connect().catch(console.error);
}

// Step 1: Initiate OAuth flow
router.get('/login', async (req, res) => {
  try {
    console.log('🔑 OAuth login initiated');
    const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`;
    const requestData = await discogsService.getRequestToken(callbackUrl);

    // Generate a unique state key for this OAuth flow
    const stateKey = crypto.randomBytes(32).toString('hex');

    // Store OAuth tokens in Redis with the state key (expires in 10 minutes)
    if (redisClient) {
      await redisClient.setEx(`oauth:${stateKey}`, 600, JSON.stringify({
        token: requestData.token,
        tokenSecret: requestData.tokenSecret
      }));
      console.log('✅ OAuth tokens stored in Redis with state:', stateKey);
    } else {
      // Fallback to session if Redis not available
      req.session.oauthToken = requestData.token;
      req.session.oauthTokenSecret = requestData.tokenSecret;
      console.log('✅ OAuth tokens stored in session (fallback)');
    }

    // Append state to authorize URL
    const authorizeUrlWithState = `${requestData.authorizeUrl}&state=${stateKey}`;
    console.log('Authorize URL:', authorizeUrlWithState);

    res.json({
      authorizeUrl: authorizeUrlWithState,
      state: stateKey // Also return state for frontend to store
    });
  } catch (error) {
    console.error('❌ OAuth initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate authentication' });
  }
});

// Step 2: Handle OAuth callback
router.post('/callback', async (req, res) => {
  try {
    console.log('🔐 OAuth callback received');
    const { oauth_verifier, state } = req.body;
    console.log('OAuth verifier:', oauth_verifier);
    console.log('State key:', state);

    if (!oauth_verifier) {
      console.log('❌ Missing OAuth verifier');
      return res.status(400).json({ error: 'Missing OAuth verifier' });
    }

    let oauthToken, oauthTokenSecret;

    // Try to get OAuth tokens from Redis using state key
    if (state && redisClient) {
      const storedData = await redisClient.get(`oauth:${state}`);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        oauthToken = parsed.token;
        oauthTokenSecret = parsed.tokenSecret;
        // Delete the state key after use (one-time use)
        await redisClient.del(`oauth:${state}`);
        console.log('✅ Retrieved OAuth tokens from Redis');
      }
    }

    // Fallback to session if Redis lookup failed
    if (!oauthToken || !oauthTokenSecret) {
      oauthToken = req.session.oauthToken;
      oauthTokenSecret = req.session.oauthTokenSecret;
      if (oauthToken && oauthTokenSecret) {
        console.log('✅ Retrieved OAuth tokens from session (fallback)');
      }
    }

    if (!oauthToken || !oauthTokenSecret) {
      console.log('❌ Missing OAuth tokens - neither in Redis nor session');
      return res.status(400).json({ error: 'OAuth session expired. Please try logging in again.' });
    }

    console.log('✅ Have OAuth tokens, proceeding with exchange');

    // Exchange for access token
    const accessData = await discogsService.getAccessToken(
      oauthToken,
      oauthTokenSecret,
      oauth_verifier
    );

    // Get user identity
    const identity = await discogsService.getIdentity(
      accessData.token,
      accessData.tokenSecret
    );

    // Store or update user in database
    const result = await db.query(
      `INSERT INTO users (discogs_username, discogs_access_token, discogs_access_secret)
       VALUES ($1, $2, $3)
       ON CONFLICT (discogs_username)
       DO UPDATE SET
         discogs_access_token = $2,
         discogs_access_secret = $3,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, discogs_username`,
      [identity.username, accessData.token, accessData.tokenSecret]
    );

    const user = result.rows[0];

    // Regenerate session to get a fresh session ID with the user data
    // This ensures a clean session and proper cookie setting
    req.session.regenerate((err) => {
      if (err) {
        console.error('❌ Session regeneration error:', err);
        return res.status(500).json({ error: 'Failed to create session' });
      }

      // Set user data in the new session
      req.session.userId = user.id;
      req.session.username = user.discogs_username;

      console.log('✅ OAuth complete! User stored in session:', { userId: user.id, username: user.discogs_username, sessionId: req.sessionID });

      // Explicitly save session to ensure it's persisted to Redis
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('❌ Session save error:', saveErr);
          return res.status(500).json({ error: 'Failed to save session' });
        }

        console.log('✅ Session regenerated and saved successfully, ID:', req.sessionID);
        res.json({
          success: true,
          user: {
            id: user.id,
            username: user.discogs_username,
          },
        });
      });
    });
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to complete authentication' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  console.log('👤 /me endpoint called');
  console.log('Session ID:', req.sessionID);
  console.log('Session userId:', req.session.userId);
  console.log('Full session:', JSON.stringify(req.session, null, 2));

  if (!req.session.userId) {
    console.log('❌ No userId in session - not authenticated');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    console.log('✅ User authenticated, fetching user data for ID:', req.session.userId);
    const result = await db.query(
      'SELECT id, discogs_username, stack_count, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

module.exports = router;

// Update user preferences
router.patch('/preferences', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { stack_count } = req.body;

    if (stack_count !== undefined) {
      await db.query(
        'UPDATE users SET stack_count = $1 WHERE id = $2',
        [stack_count, req.session.userId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

