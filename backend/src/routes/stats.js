const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAuth = require('../middleware/auth');

// All routes require authentication
router.use(requireAuth);

// Get comprehensive collection stats
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;

    // Basic collection stats
    const collectionStats = await db.query(
      `SELECT
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE listened_count = 0) as total_unlistened,
        COUNT(*) FILTER (WHERE listened_count > 0) as total_listened,
        COUNT(*) FILTER (WHERE is_liked = true) as total_liked,
        SUM(listened_count) as total_plays
      FROM vinyl_records
      WHERE user_id = $1`,
      [userId]
    );

    // Favorite genre (most listened to)
    const favoriteGenre = await db.query(
      `SELECT unnest(vr.genres) as genre, SUM(vr.listened_count) as play_count
      FROM vinyl_records vr
      WHERE vr.user_id = $1 AND vr.genres IS NOT NULL
      GROUP BY genre
      ORDER BY play_count DESC
      LIMIT 1`,
      [userId]
    );

    // Favorite artist (most listened to)
    const favoriteArtist = await db.query(
      `SELECT artist, SUM(listened_count) as play_count
      FROM vinyl_records
      WHERE user_id = $1
      GROUP BY artist
      ORDER BY play_count DESC
      LIMIT 1`,
      [userId]
    );

    // Top genres by record count
    const topGenres = await db.query(
      `SELECT unnest(genres) as genre, COUNT(*) as count
      FROM vinyl_records
      WHERE user_id = $1 AND genres IS NOT NULL
      GROUP BY genre
      ORDER BY count DESC
      LIMIT 10`,
      [userId]
    );

    // Top artists by record count
    const topArtists = await db.query(
      `SELECT artist, COUNT(*) as count
      FROM vinyl_records
      WHERE user_id = $1
      GROUP BY artist
      ORDER BY count DESC
      LIMIT 10`,
      [userId]
    );

    // Recent plays (last 30 days)
    const recentActivity = await db.query(
      `SELECT
        DATE(played_at) as date,
        COUNT(*) as play_count
      FROM play_history
      WHERE user_id = $1
        AND played_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(played_at)
      ORDER BY date DESC`,
      [userId]
    );

    // Most played albums
    const mostPlayed = await db.query(
      `SELECT
        vr.id,
        vr.title,
        vr.artist,
        vr.album_art_url,
        vr.listened_count
      FROM vinyl_records vr
      WHERE vr.user_id = $1 AND vr.listened_count > 0
      ORDER BY vr.listened_count DESC
      LIMIT 10`,
      [userId]
    );

    // Least played / unlistened albums
    const dustyGems = await db.query(
      `SELECT
        vr.id,
        vr.title,
        vr.artist,
        vr.album_art_url,
        vr.listened_count,
        vr.date_added_to_collection
      FROM vinyl_records vr
      WHERE vr.user_id = $1
      ORDER BY vr.listened_count ASC, vr.date_added_to_collection ASC
      LIMIT 10`,
      [userId]
    );

    res.json({
      collection: collectionStats.rows[0],
      favoriteGenre: favoriteGenre.rows[0]?.genre || null,
      favoriteArtist: favoriteArtist.rows[0]?.artist || null,
      topGenres: topGenres.rows,
      topArtists: topArtists.rows,
      recentActivity: recentActivity.rows,
      mostPlayed: mostPlayed.rows,
      dustyGems: dustyGems.rows,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
