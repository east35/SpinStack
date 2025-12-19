const express = require('express');
const router = express.Router();
const discogsService = require('../services/discogs');
const db = require('../db');

// Step 1: Initiate OAuth flow
router.get('/login', async (req, res) => {
  try {
    console.log('🔑 OAuth login initiated');
    const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`;
    const requestData = await discogsService.getRequestToken(callbackUrl);

    // Store tokens in session
    req.session.oauthToken = requestData.token;
    req.session.oauthTokenSecret = requestData.tokenSecret;

    console.log('✅ OAuth tokens stored in session:', req.sessionID);
    console.log('Authorize URL:', requestData.authorizeUrl);

    // Explicitly save session before redirecting
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }

      console.log('✅ Session saved, returning authorize URL');
      res.json({
        authorizeUrl: requestData.authorizeUrl,
      });
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
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', JSON.stringify(req.session, null, 2));
    const { oauth_verifier } = req.body;
    console.log('OAuth verifier:', oauth_verifier);

    if (!oauth_verifier) {
      console.log('❌ Missing OAuth verifier');
      return res.status(400).json({ error: 'Missing OAuth verifier' });
    }

    const { oauthToken, oauthTokenSecret } = req.session;

    if (!oauthToken || !oauthTokenSecret) {
      console.log('❌ Missing OAuth tokens in session');
      console.log('oauthToken:', oauthToken);
      console.log('oauthTokenSecret:', oauthTokenSecret);
      return res.status(400).json({ error: 'Missing OAuth tokens in session' });
    }

    console.log('✅ Session has OAuth tokens, proceeding with exchange');

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

    // Store user in session
    req.session.userId = user.id;
    req.session.username = user.discogs_username;

    // Clear OAuth tokens
    delete req.session.oauthToken;
    delete req.session.oauthTokenSecret;

    console.log('✅ OAuth complete! User stored in session:', { userId: user.id, username: user.discogs_username });

    // Explicitly save session to ensure it's persisted to Redis
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }

      console.log('✅ Session saved successfully');
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.discogs_username,
        },
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

