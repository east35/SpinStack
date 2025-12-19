const express = require('express');
const router = express.Router();
const discogsService = require('../services/discogs');
const db = require('../db');

// Step 1: Initiate OAuth flow
router.get('/login', async (req, res) => {
  try {
    const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`;
    const requestData = await discogsService.getRequestToken(callbackUrl);

    // Store tokens in session
    req.session.oauthToken = requestData.token;
    req.session.oauthTokenSecret = requestData.tokenSecret;

    res.json({
      authorizeUrl: requestData.authorizeUrl,
    });
  } catch (error) {
    console.error('OAuth initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate authentication' });
  }
});

// Step 2: Handle OAuth callback
router.post('/callback', async (req, res) => {
  try {
    const { oauth_verifier } = req.body;

    if (!oauth_verifier) {
      return res.status(400).json({ error: 'Missing OAuth verifier' });
    }

    const { oauthToken, oauthTokenSecret } = req.session;

    if (!oauthToken || !oauthTokenSecret) {
      return res.status(400).json({ error: 'Missing OAuth tokens in session' });
    }

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

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.discogs_username,
      },
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Failed to complete authentication' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
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

