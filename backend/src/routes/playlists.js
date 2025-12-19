const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAuth = require('../middleware/auth');

// Generate auto playlist
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { type, count = 10, genre, minYear, maxYear } = req.body;

    let query = `
      SELECT
        vr.*,
        COALESCE(ph.play_count, 0) as play_count,
        ph.last_played_at
      FROM vinyl_records vr
      LEFT JOIN (
        SELECT
          vinyl_record_id,
          COUNT(*) as play_count,
          MAX(played_at) as last_played_at
        FROM play_history
        GROUP BY vinyl_record_id
      ) ph ON vr.id = ph.vinyl_record_id
      WHERE vr.user_id = $1
    `;

    const params = [userId];
    let paramCount = 1;

    // Apply filters
    if (genre) {
      paramCount++;
      query += ` AND $${paramCount} = ANY(vr.genres)`;
      params.push(genre);
    }

    if (minYear) {
      paramCount++;
      query += ` AND vr.year >= $${paramCount}`;
      params.push(minYear);
    }

    if (maxYear) {
      paramCount++;
      query += ` AND vr.year <= $${paramCount}`;
      params.push(maxYear);
    }

    // Apply ordering based on playlist type
    switch (type) {
      case 'daily-discovery':
        // Random selection weighted toward least-played
        query += ` ORDER BY (COALESCE(ph.play_count, 0) + 1) ASC, RANDOM()`;
        break;

      case 'rare-gems':
        // Never played or least played
        query += ` ORDER BY COALESCE(ph.play_count, 0) ASC, RANDOM()`;
        break;

      case 'recently-added':
        // Most recently added to collection
        query += ` ORDER BY vr.date_added_to_collection DESC`;
        break;

      case 'dust-collectors':
        // Longest time since played (or never played)
        query += ` ORDER BY COALESCE(ph.last_played_at, '1970-01-01'::timestamp) ASC`;
        break;

      case 'favorites':
        // Most played
        query += ` ORDER BY COALESCE(ph.play_count, 0) DESC`;
        break;

      case 'time-machine':
        // Random from specific era (using year filters)
        query += ` ORDER BY RANDOM()`;
        break;

      default:
        // Random
        query += ` ORDER BY RANDOM()`;
    }

    query += ` LIMIT $${paramCount + 1}`;
    params.push(count);

    const result = await db.query(query, params);

    // Create playlist record
    const playlistName = generatePlaylistName(type, genre);
    const playlistResult = await db.query(
      `INSERT INTO playlists (user_id, name, type, criteria)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, type, created_at`,
      [userId, playlistName, 'auto', { type, genre, minYear, maxYear, count }]
    );

    const playlist = playlistResult.rows[0];

    // Add items to playlist
    for (let i = 0; i < result.rows.length; i++) {
      await db.query(
        `INSERT INTO playlist_items (playlist_id, vinyl_record_id, position)
         VALUES ($1, $2, $3)`,
        [playlist.id, result.rows[i].id, i]
      );
    }

    res.json({
      playlist: {
        ...playlist,
        records: result.rows,
      },
    });
  } catch (error) {
    console.error('Generate playlist error:', error);
    res.status(500).json({ error: 'Failed to generate playlist' });
  }
});

// Get all playlists
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const result = await db.query(
      `SELECT
        p.*,
        COUNT(pi.id) as record_count
      FROM playlists p
      LEFT JOIN playlist_items pi ON p.id = pi.playlist_id
      WHERE p.user_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC`,
      [userId]
    );

    res.json({ playlists: result.rows });
  } catch (error) {
    console.error('Get playlists error:', error);
    res.status(500).json({ error: 'Failed to get playlists' });
  }
});

// Get playlist details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const playlistId = req.params.id;

    const playlistResult = await db.query(
      'SELECT * FROM playlists WHERE id = $1 AND user_id = $2',
      [playlistId, userId]
    );

    if (playlistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const playlist = playlistResult.rows[0];

    const recordsResult = await db.query(
      `SELECT
        vr.*,
        pi.position,
        COALESCE(ph.play_count, 0) as play_count,
        ph.last_played_at
      FROM playlist_items pi
      JOIN vinyl_records vr ON pi.vinyl_record_id = vr.id
      LEFT JOIN (
        SELECT
          vinyl_record_id,
          COUNT(*) as play_count,
          MAX(played_at) as last_played_at
        FROM play_history
        GROUP BY vinyl_record_id
      ) ph ON vr.id = ph.vinyl_record_id
      WHERE pi.playlist_id = $1
      ORDER BY pi.position ASC`,
      [playlistId]
    );

    res.json({
      playlist: {
        ...playlist,
        records: recordsResult.rows,
      },
    });
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({ error: 'Failed to get playlist' });
  }
});

// Delete playlist
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const playlistId = req.params.id;

    const result = await db.query(
      'DELETE FROM playlists WHERE id = $1 AND user_id = $2 RETURNING id',
      [playlistId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// Helper function to generate playlist names
function generatePlaylistName(type, genre) {
  const timestamp = new Date().toLocaleDateString();
  const genrePrefix = genre ? `${genre} ` : '';

  const names = {
    'daily-discovery': `${genrePrefix}Daily Discovery - ${timestamp}`,
    'rare-gems': `${genrePrefix}Rare Gems - ${timestamp}`,
    'recently-added': `${genrePrefix}Recently Added - ${timestamp}`,
    'dust-collectors': `${genrePrefix}Dust Collectors - ${timestamp}`,
    'favorites': `${genrePrefix}Favorites - ${timestamp}`,
    'time-machine': `${genrePrefix}Time Machine - ${timestamp}`,
  };

  return names[type] || `${genrePrefix}Playlist - ${timestamp}`;
}

module.exports = router;
