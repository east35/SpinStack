const express = require('express');
const router = express.Router();
const discogsService = require('../services/discogs');
const db = require('../db');
const requireAuth = require('../middleware/auth');

// Sync user's Discogs collection
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get user's credentials
    const userResult = await db.query(
      'SELECT discogs_username, discogs_access_token, discogs_access_secret FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { discogs_username, discogs_access_token, discogs_access_secret } = userResult.rows[0];

    console.log(`Syncing collection for user: ${discogs_username}`);

    // Fetch all releases from Discogs
    const releases = await discogsService.getAllCollectionReleases(
      discogs_username,
      discogs_access_token,
      discogs_access_secret
    );

    console.log(`Found ${releases.length} releases`);

    // Insert or update records in database
    let syncedCount = 0;
    for (const release of releases) {
      const basicInfo = release.basic_information;

      await db.query(
        `INSERT INTO vinyl_records (
          user_id, discogs_release_id, discogs_instance_id,
          title, artist, year, genres, styles, label, catalog_number,
          format, album_art_url, date_added_to_collection, folder_id, last_synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, discogs_instance_id)
        DO UPDATE SET
          title = $4,
          artist = $5,
          year = $6,
          genres = $7,
          styles = $8,
          label = $9,
          catalog_number = $10,
          format = $11,
          album_art_url = $12,
          last_synced_at = CURRENT_TIMESTAMP`,
        [
          userId,
          basicInfo.id,
          release.instance_id,
          basicInfo.title,
          basicInfo.artists?.[0]?.name || 'Unknown Artist',
          basicInfo.year || null,
          basicInfo.genres || [],
          basicInfo.styles || [],
          basicInfo.labels?.[0]?.name || null,
          basicInfo.labels?.[0]?.catno || null,
          basicInfo.formats?.[0]?.name || null,
          basicInfo.cover_image || basicInfo.thumb || null,
          release.date_added,
          release.folder_id,
        ]
      );

      syncedCount++;
    }

    res.json({
      success: true,
      synced: syncedCount,
      total: releases.length,
    });
  } catch (error) {
    console.error('Collection sync error:', error);
    res.status(500).json({ error: 'Failed to sync collection' });
  }
});

// Get user's vinyl collection
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const {
      genre,
      search,
      liked,
      unlistened,
      limit = 50,
      offset = 0,
      sort = 'date_added_desc'
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit, 10) || 50, 100);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    let query = `
      SELECT vr.*
      FROM vinyl_records vr
      WHERE vr.user_id = $1
    `;

    const params = [userId];
    let paramCount = 1;

    // Filters
    if (genre) {
      paramCount++;
      query += ` AND $${paramCount} = ANY(vr.genres)`;
      params.push(genre);
    }

    if (liked === 'true') {
      query += ` AND vr.is_liked = true`;
    }

    if (unlistened === 'true') {
      query += ` AND vr.listened_count = 0`;
    }

    if (search) {
      paramCount++;
      query += ` AND (
        vr.title ILIKE $${paramCount} OR
        vr.artist ILIKE $${paramCount} OR
        vr.label ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    // Sorting
    let orderBy = 'vr.date_added_to_collection DESC';
    if (sort === 'title_asc') orderBy = 'vr.title ASC';
    if (sort === 'title_desc') orderBy = 'vr.title DESC';
    if (sort === 'artist_asc') orderBy = 'vr.artist ASC';
    if (sort === 'artist_desc') orderBy = 'vr.artist DESC';
    if (sort === 'year_asc') orderBy = 'vr.year ASC NULLS LAST';
    if (sort === 'year_desc') orderBy = 'vr.year DESC NULLS LAST';
    if (sort === 'date_added_asc') orderBy = 'vr.date_added_to_collection ASC';
    if (sort === 'date_added_desc') orderBy = 'vr.date_added_to_collection DESC';
    if (sort === 'listened_count_asc') orderBy = 'vr.listened_count ASC';
    if (sort === 'listened_count_desc') orderBy = 'vr.listened_count DESC';

    query += ` ORDER BY ${orderBy} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parsedLimit, parsedOffset);

    // Total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM vinyl_records vr WHERE vr.user_id = $1';
    const countParams = [userId];
    let countParamCount = 1;

    if (genre) {
      countParamCount++;
      countQuery += ` AND $${countParamCount} = ANY(vr.genres)`;
      countParams.push(genre);
    }

    if (liked === 'true') {
      countQuery += ` AND vr.is_liked = true`;
    }

    if (unlistened === 'true') {
      countQuery += ` AND vr.listened_count = 0`;
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (
        vr.title ILIKE $${countParamCount} OR
        vr.artist ILIKE $${countParamCount} OR
        vr.label ILIKE $${countParamCount}
      )`;
      countParams.push(`%${search}%`);
    }

    const result = await db.query(query, params);
    const countResult = await db.query(countQuery, countParams);

    res.json({
      records: result.rows,
      count: result.rows.length,
      totalCount: parseInt(countResult.rows[0].count, 10),
      limit: parsedLimit,
      offset: parsedOffset,
    });
  } catch (error) {
    console.error('Get collection error:', error);
    res.status(500).json({ error: 'Failed to get collection' });
  }
});

// Get collection stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const statsResult = await db.query(
      `SELECT
        COUNT(*) as total_records,
        COUNT(DISTINCT unnest(genres)) as total_genres,
        COUNT(DISTINCT artist) as total_artists
      FROM vinyl_records
      WHERE user_id = $1`,
      [userId]
    );

    const genresResult = await db.query(
      `SELECT unnest(genres) as genre, COUNT(*) as count
      FROM vinyl_records
      WHERE user_id = $1
      GROUP BY genre
      ORDER BY count DESC
      LIMIT 10`,
      [userId]
    );

    res.json({
      stats: statsResult.rows[0],
      topGenres: genresResult.rows,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Mark vinyl as played
router.post('/:id/play', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const vinylId = req.params.id;

    // Verify ownership
    const vinylResult = await db.query(
      'SELECT id FROM vinyl_records WHERE id = $1 AND user_id = $2',
      [vinylId, userId]
    );

    if (vinylResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vinyl not found' });
    }

    await db.query(
      'INSERT INTO play_history (user_id, vinyl_record_id, was_skipped) VALUES ($1, $2, false)',
      [userId, vinylId]
    );

    // Update listened count
    await db.query(
      'UPDATE vinyl_records SET listened_count = listened_count + 1, last_played_at = CURRENT_TIMESTAMP WHERE id = $1',
      [vinylId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Mark played error:', error);
    res.status(500).json({ error: 'Failed to mark as played' });
  }
});

// Toggle like on vinyl
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const vinylId = req.params.id;

    // Verify ownership
    const vinylResult = await db.query(
      'SELECT id, is_liked FROM vinyl_records WHERE id = $1 AND user_id = $2',
      [vinylId, userId]
    );

    if (vinylResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vinyl not found' });
    }

    const newLikedState = !vinylResult.rows[0].is_liked;

    await db.query(
      'UPDATE vinyl_records SET is_liked = $1 WHERE id = $2',
      [newLikedState, vinylId]
    );

    res.json({ success: true, is_liked: newLikedState });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

module.exports = router;
