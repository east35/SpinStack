const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAuth = require('../middleware/auth');
const cacheService = require('../services/cache');
const recommendationsService = require('../services/recommendations');

// All routes require authentication
router.use(requireAuth);

// Style clusters for cross-genre stack generation
// Each cluster groups related styles that create cohesive listening experiences
const STYLE_CLUSTERS = {
  'atmospheric': {
    name: 'Atmospheric',
    styles: ['Shoegaze', 'Ambient', 'Ethereal', 'Dream Pop', 'Post-Rock', 'Space Rock', 'Downtempo', 'Drone', 'Dark Ambient']
  },
  'heavy': {
    name: 'Heavy',
    styles: ['Doom Metal', 'Progressive Metal', 'Stoner Rock', 'Sludge Metal', 'Hardcore', 'Noise', 'Industrial', 'Post-Metal', 'Black Metal', 'Death Metal']
  },
  'groovy': {
    name: 'Groovy',
    styles: ['Funk', 'Disco', 'Nu-Disco', 'French House', 'Boogie', 'Soul', 'Rhythm & Blues', 'Deep House', 'Acid Jazz']
  },
  'chill': {
    name: 'Chill',
    styles: ['Downtempo', 'Chillwave', 'Lo-Fi', 'Easy Listening', 'Lounge', 'Trip Hop', 'Ambient', 'New Age', 'Balearic']
  },
  'experimental': {
    name: 'Experimental',
    styles: ['Avantgarde', 'Experimental', 'Noise', 'Musique Concrète', 'Free Jazz', 'Free Improvisation', 'Art Rock', 'No Wave', 'Leftfield']
  },
  'electronic-dance': {
    name: 'Electronic Dance',
    styles: ['Techno', 'House', 'Minimal Techno', 'Acid House', 'Electro', 'Trance', 'Breakbeat', 'Drum n Bass', 'UK Garage']
  },
  'melancholic': {
    name: 'Melancholic',
    styles: ['Slowcore', 'Sadcore', 'Gothic Rock', 'Goth Rock', 'Darkwave', 'Cold Wave', 'Post-Punk', 'Ethereal']
  },
  'psychedelic': {
    name: 'Psychedelic',
    styles: ['Psychedelic Rock', 'Psychedelic', 'Neo-Psychedelia', 'Space Rock', 'Acid Rock', 'Krautrock', 'Stoner Rock']
  },
  'hip-hop-beats': {
    name: 'Hip-Hop & Beats',
    styles: ['Jazzy Hip-Hop', 'Abstract', 'Instrumental Hip-Hop', 'Boom Bap', 'Trip Hop', 'Turntablism', 'Beat Music', 'Lo-Fi']
  },
  'synth-wave': {
    name: 'Synth & Wave',
    styles: ['Synth-pop', 'New Wave', 'Coldwave', 'Darkwave', 'Italo-Disco', 'Electropop', 'Synthwave', 'Minimal Synth']
  }
};

// Helper function to generate style-based stacks
async function generateStyleStacks(userId) {
  const stacks = [];
  
  for (const [clusterId, cluster] of Object.entries(STYLE_CLUSTERS)) {
    // Query records matching any style in this cluster
    const result = await db.query(
      `SELECT id, discogs_release_id, title, artist, album_art_url, year, genres, styles,
              label, catalog_number, format, country, listened_count, last_played_at,
              date_added_to_collection, is_liked,
              array_length(genres, 1) as genre_count
       FROM vinyl_records
       WHERE user_id = $1
         AND styles IS NOT NULL
         AND styles && $2::text[]
       ORDER BY
         -- Prioritize records with multiple matching styles (more representative of the cluster)
         (SELECT COUNT(*) FROM unnest(styles) s WHERE s = ANY($2::text[])) DESC,
         -- Then by genre diversity (cross-genre discoveries are more interesting)
         array_length(genres, 1) DESC NULLS LAST,
         RANDOM()
       LIMIT 16`,
      [userId, cluster.styles]
    );
    
    // Deduplicate by release ID
    const seen = new Set();
    const albums = [];
    for (const row of result.rows) {
      const key = row.discogs_release_id || row.id;
      if (seen.has(key)) continue;
      seen.add(key);
      const { discogs_release_id, genre_count, ...rest } = row;
      albums.push(rest);
      if (albums.length === 8) break;
    }
    
    // Only include clusters with at least 4 albums
    if (albums.length >= 4) {
      stacks.push({
        id: `style-${clusterId}`,
        name: cluster.name,
        type: 'style',
        albums
      });
    }
  }
  
  // Sort by album count (most populated clusters first) and limit to top 6
  stacks.sort((a, b) => b.albums.length - a.albums.length);
  return stacks.slice(0, 6);
}

// Helper function to generate daily stack
async function generateDailyStack(userId) {
  // Pull more than needed, then enforce unique releases
  const result = await db.query(
    `SELECT id, discogs_release_id, title, artist, album_art_url, year, genres, styles,
            label, catalog_number, format, country, listened_count, last_played_at,
            date_added_to_collection, is_liked
     FROM vinyl_records
     WHERE user_id = $1
     ORDER BY RANDOM()
     LIMIT 40`,
    [userId]
  );

  const seen = new Set();
  const albums = [];
  for (const row of result.rows) {
    const key = row.discogs_release_id || row.id;
    if (seen.has(key)) continue;
    seen.add(key);
    const { discogs_release_id, ...rest } = row;
    albums.push(rest);
    if (albums.length === 8) break;
  }

  return albums;
}

// Get daily stack - persistent for 24 hours
router.get('/daily', async (req, res) => {
  try {
    const userId = req.session.userId;
    const today = cacheService.formatDate(new Date());

    console.log(`[Daily Stack] Fetching for user ${userId}, date ${today}`);

    // Check cache/database first
    let albums = await cacheService.getDailyStack(userId, today);
    console.log(`[Daily Stack] Cache result: ${albums ? albums.length + ' albums' : 'null'}`);

    if (!albums) {
      // Generate new stack
      console.log('[Daily Stack] Generating new stack...');
      albums = await generateDailyStack(userId);
      console.log(`[Daily Stack] Generated ${albums.length} albums`);

      // Save to database
      await db.query(
        `INSERT INTO daily_stacks (user_id, stack_date, albums)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, stack_date) DO UPDATE SET albums = $3`,
        [userId, today, JSON.stringify(albums)]
      );
      console.log('[Daily Stack] Saved to database');

      // Cache in Redis
      await cacheService.cacheDailyStack(userId, today, albums);
      console.log('[Daily Stack] Cached in Redis');
    }

    res.json({
      stack: {
        id: 'daily',
        name: "Today's Setlist",
        date: today,
        albums
      }
    });
  } catch (error) {
    console.error('Get daily stack error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to generate daily stack',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to get unique albums (remove duplicates by discogs_release_id)
function getUniqueAlbums(rows) {
  const seen = new Set();
  const uniques = [];
  for (const row of rows) {
    const key = row.discogs_release_id || row.id;
    if (seen.has(key)) continue;
    seen.add(key);
    const { discogs_release_id, ...rest } = row;
    uniques.push(rest);
  }
  return uniques;
}

// Helper function to generate weekly stacks
async function generateWeeklyStacks(userId, weekStartDate) {
  const stacks = [];
  const genreStacks = [];

  const fetchStack = async (id, name, whereClause, orderClause = 'ORDER BY RANDOM()', limit = 16, extraParams = [], targetArray = stacks) => {
    try {
      const result = await db.query(
        `SELECT id, discogs_release_id, title, artist, album_art_url, year, genres, styles,
                label, catalog_number, format, country, listened_count, last_played_at,
                date_added_to_collection, is_liked
         FROM vinyl_records
         WHERE user_id = $1 ${whereClause}
         ${orderClause}
         LIMIT ${limit}`,
        [userId, ...extraParams]
      );
      const albums = getUniqueAlbums(result.rows).slice(0, 8);
      if (albums.length >= 4) {
        targetArray.push({ id, name, albums });
      }
    } catch (error) {
      console.error(`Error fetching stack "${name}":`, error);
      // Continue generating other stacks even if one fails
    }
  };

  // 1. First: Style-based stacks (cross-genre mood clusters) - up to 8
  try {
    const styleStacks = await generateStyleStacks(userId);
    stacks.push(...styleStacks.slice(0, 8));
  } catch (error) {
    console.error('Error generating style stacks:', error);
    // Continue with other stacks even if style stacks fail
  }

  // 2. Curated stacks (behavior-based)
  // Recent additions (last 90 days)
  await fetchStack(
    'recent-additions',
    'Recent Additions',
    "AND date_added_to_collection > NOW() - INTERVAL '90 days'",
    'ORDER BY date_added_to_collection DESC'
  );

  // Unplayed
  await fetchStack(
    'unplayed',
    'Unplayed Gems',
    'AND listened_count = 0',
    'ORDER BY RANDOM()'
  );

  // Rarely played
  await fetchStack(
    'rarely-played',
    'Rarely Played',
    'AND listened_count <= 2',
    'ORDER BY RANDOM()'
  );

  // Classics (older releases)
  await fetchStack(
    'classics',
    'Classics',
    'AND year IS NOT NULL AND year < 1990',
    'ORDER BY year ASC NULLS LAST'
  );

  // 90s
  await fetchStack(
    'nineties',
    '90s',
    'AND year IS NOT NULL AND year >= 1990 AND year < 2000',
    'ORDER BY RANDOM()'
  );

  // 2000s+
  await fetchStack(
    'modern',
    'Modern Mix',
    'AND year IS NOT NULL AND year >= 2000',
    'ORDER BY year DESC NULLS LAST'
  );

  // Favorites
  await fetchStack(
    'favorites',
    'Favorites',
    'AND is_liked = true',
    'ORDER BY RANDOM()'
  );

  // 3. Last: Genre stacks (up to 4)
  const genresResult = await db.query(
    `SELECT unnest(genres) as genre, COUNT(*) as count
     FROM vinyl_records
     WHERE user_id = $1 AND genres IS NOT NULL AND array_length(genres, 1) > 0
     GROUP BY genre
     ORDER BY count DESC
     LIMIT 4`,
    [userId]
  );

  for (const { genre } of genresResult.rows) {
    await fetchStack(
      `genre-${genre.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      `Genre: ${genre}`,
      'AND $2 = ANY(genres)',
      'ORDER BY RANDOM()',
      24,
      [genre],
      genreStacks
    );
  }

  // Add genre stacks at the end
  stacks.push(...genreStacks);

  // Fallback: random mixes if none found yet
  if (stacks.length === 0) {
    const result = await db.query(
      `SELECT id, discogs_release_id, title, artist, album_art_url, year, genres, styles,
              label, catalog_number, format, country, listened_count, last_played_at,
              date_added_to_collection, is_liked
       FROM vinyl_records
       WHERE user_id = $1
       ORDER BY RANDOM()
       LIMIT 40`,
      [userId]
    );
    const albums = getUniqueAlbums(result.rows).slice(0, 8);
    if (albums.length >= 4) {
      stacks.push({ id: 'random-mix', name: 'Random Mix', albums });
    }
  }

  // Limit to 16 stacks total
  return stacks.slice(0, 16);
}

// Get weekly stacks - persistent for 7 days (renamed from /random)
router.get('/weekly', async (req, res) => {
  try {
    const userId = req.session.userId;
    const weekStartDate = cacheService.formatDate(cacheService.getMonday());

    // Check cache/database first
    let stacks = await cacheService.getWeeklyStacks(userId, weekStartDate);

    if (!stacks || stacks.length === 0) {
      // Generate new weekly stacks
      stacks = await generateWeeklyStacks(userId, weekStartDate);

      // Save to database and cache
      for (const stack of stacks) {
        await db.query(
          `INSERT INTO weekly_stacks (user_id, stack_type, stack_name, week_start_date, albums)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, stack_type, week_start_date)
           DO UPDATE SET albums = $5, stack_name = $3`,
          [userId, stack.id, stack.name, weekStartDate, JSON.stringify(stack.albums)]
        );
      }

      await cacheService.cacheWeeklyStacks(userId, weekStartDate, stacks);
    }

    res.json({
      stacks,
      weekStartDate
    });
  } catch (error) {
    console.error('Get weekly stacks error:', error);
    res.status(500).json({ error: 'Failed to fetch weekly stacks' });
  }
});

// Keep /random as an alias for backward compatibility
router.get('/random', async (req, res) => {
  req.url = '/weekly';
  router.handle(req, res);
});

// Get style-based stacks only (mood/vibe clusters)
router.get('/styles', async (req, res) => {
  try {
    const userId = req.session.userId;
    const stacks = await generateStyleStacks(userId);
    
    res.json({
      stacks,
      clusters: Object.keys(STYLE_CLUSTERS).map(id => ({
        id,
        name: STYLE_CLUSTERS[id].name,
        styles: STYLE_CLUSTERS[id].styles
      }))
    });
  } catch (error) {
    console.error('Get style stacks error:', error);
    res.status(500).json({ error: 'Failed to fetch style stacks' });
  }
});

// Refresh daily stack (manual regeneration)
router.post('/daily/refresh', async (req, res) => {
  try {
    const userId = req.session.userId;
    const today = cacheService.formatDate(new Date());

    // Generate new stack (bypass cache)
    const albums = await generateDailyStack(userId);

    // Update database
    await db.query(
      `INSERT INTO daily_stacks (user_id, stack_date, albums)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, stack_date) DO UPDATE SET albums = $3`,
      [userId, today, JSON.stringify(albums)]
    );

    // Invalidate and update cache
    await cacheService.invalidateDailyStack(userId, today);
    await cacheService.cacheDailyStack(userId, today, albums);

    res.json({
      stack: {
        id: 'daily',
        name: "Today's Setlist",
        date: today,
        albums
      }
    });
  } catch (error) {
    console.error('Refresh daily stack error:', error);
    res.status(500).json({ error: 'Failed to refresh daily stack' });
  }
});

// Refresh weekly stacks (manual regeneration)
router.post('/weekly/refresh', async (req, res) => {
  try {
    const userId = req.session.userId;
    const weekStartDate = cacheService.formatDate(cacheService.getMonday());

    // Generate new stacks (bypass cache)
    const stacks = await generateWeeklyStacks(userId, weekStartDate);

    // Delete old stacks for this week
    await db.query(
      'DELETE FROM weekly_stacks WHERE user_id = $1 AND week_start_date = $2',
      [userId, weekStartDate]
    );

    // Save new stacks to database
    for (const stack of stacks) {
      await db.query(
        `INSERT INTO weekly_stacks (user_id, stack_type, stack_name, week_start_date, albums)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, stack.id, stack.name, weekStartDate, JSON.stringify(stack.albums)]
      );
    }

    // Invalidate and update cache
    await cacheService.invalidateWeeklyStacks(userId, weekStartDate);
    await cacheService.cacheWeeklyStacks(userId, weekStartDate, stacks);

    res.json({
      stacks,
      weekStartDate
    });
  } catch (error) {
    console.error('Refresh weekly stacks error:', error);
    res.status(500).json({ error: 'Failed to refresh weekly stacks' });
  }
});

// Mark album as played/skipped
router.post('/mark-played', async (req, res) => {
  try {
    const { albumId, played, skipped } = req.body;
    const userId = req.session.userId;

    // Insert play history
    await db.query(
      `INSERT INTO play_history (user_id, vinyl_record_id, was_skipped)
       VALUES ($1, $2, $3)`,
      [userId, albumId, skipped]
    );

    // Update vinyl record if played
    if (played) {
      await db.query(
        `UPDATE vinyl_records
         SET listened_count = listened_count + 1, last_played_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2`,
        [albumId, userId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark played error:', error);
    res.status(500).json({ error: 'Failed to mark album' });
  }
});

// ============================================
// CUSTOM STACKS ENDPOINTS
// ============================================

// Get all custom stacks for the user
router.get('/custom', async (req, res) => {
  try {
    const userId = req.session.userId;

    const result = await db.query(
      `SELECT s.id, s.name, s.created_at, s.updated_at,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', vr.id,
                    'title', vr.title,
                    'artist', vr.artist,
                    'album_art_url', vr.album_art_url,
                    'year', vr.year,
                    'label', vr.label,
                    'genres', vr.genres,
                    'styles', vr.styles,
                    'listened_count', vr.listened_count,
                    'is_liked', vr.is_liked
                  ) ORDER BY si.position
                ) FILTER (WHERE vr.id IS NOT NULL),
                '[]'
              ) as albums,
              COUNT(si.id) as album_count
       FROM stacks s
       LEFT JOIN stack_items si ON s.id = si.stack_id
       LEFT JOIN vinyl_records vr ON si.vinyl_record_id = vr.id
       WHERE s.user_id = $1
         AND s.type = 'custom'
         AND s.name IS NOT NULL
         AND s.name != ''
         AND s.name != 'Untitled Stack'
       GROUP BY s.id, s.name, s.created_at, s.updated_at
       HAVING COUNT(si.id) = 8
       ORDER BY s.created_at DESC`,
      [userId]
    );

    const stacks = result.rows.map(row => ({
      id: `custom-${row.id}`,
      stackId: row.id,
      name: row.name,
      type: 'custom',
      albums: row.albums,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json({ stacks });
  } catch (error) {
    console.error('Get custom stacks error:', error);
    res.status(500).json({ error: 'Failed to fetch custom stacks' });
  }
});

// Get a single custom stack (in-progress draft)
router.get('/custom/draft', async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get the most recent draft stack (unnamed OR incomplete - less than 8 albums)
    const result = await db.query(
      `SELECT s.id, s.name, s.created_at,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', vr.id,
                    'title', vr.title,
                    'artist', vr.artist,
                    'album_art_url', vr.album_art_url,
                    'year', vr.year,
                    'label', vr.label,
                    'genres', vr.genres,
                    'styles', vr.styles,
                    'listened_count', vr.listened_count,
                    'is_liked', vr.is_liked
                  ) ORDER BY si.position
                ) FILTER (WHERE vr.id IS NOT NULL),
                '[]'
              ) as albums,
              COUNT(si.id) as album_count
       FROM stacks s
       LEFT JOIN stack_items si ON s.id = si.stack_id
       LEFT JOIN vinyl_records vr ON si.vinyl_record_id = vr.id
       WHERE s.user_id = $1
         AND s.type = 'custom'
         AND (s.name IS NULL OR s.name = '' OR s.name = 'Untitled Stack')
       GROUP BY s.id, s.name, s.created_at
       HAVING COUNT(si.id) < 8
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ draft: null });
    }

    const row = result.rows[0];
    const draft = {
      id: row.id,
      albums: row.albums,
      createdAt: row.created_at
    };

    res.json({ draft });
  } catch (error) {
    console.error('Get draft stack error:', error);
    res.status(500).json({ error: 'Failed to fetch draft stack' });
  }
});

// Create a new custom stack (draft)
router.post('/custom/create', async (req, res) => {
  try {
    const userId = req.session.userId;

    // Create a new draft stack
    const result = await db.query(
      `INSERT INTO stacks (user_id, type, name)
       VALUES ($1, 'custom', '')
       RETURNING id, created_at`,
      [userId]
    );

    const stackId = result.rows[0].id;

    res.json({
      stackId,
      albums: [],
      createdAt: result.rows[0].created_at
    });
  } catch (error) {
    console.error('Create custom stack error:', error);
    res.status(500).json({ error: 'Failed to create custom stack' });
  }
});

// Add album to custom stack
router.post('/custom/:stackId/add-album', async (req, res) => {
  try {
    const { stackId } = req.params;
    const { albumId } = req.body;
    const userId = req.session.userId;

    // Verify stack belongs to user and is custom type
    const stackCheck = await db.query(
      'SELECT id FROM stacks WHERE id = $1 AND user_id = $2 AND type = $3',
      [stackId, userId, 'custom']
    );

    if (stackCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Stack not found' });
    }

    // Check if album already in stack
    const existingCheck = await db.query(
      'SELECT id FROM stack_items WHERE stack_id = $1 AND vinyl_record_id = $2',
      [stackId, albumId]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Album already in stack' });
    }

    // Get current album count
    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM stack_items WHERE stack_id = $1',
      [stackId]
    );

    const currentCount = parseInt(countResult.rows[0].count);

    // Enforce 8 album limit
    if (currentCount >= 8) {
      return res.status(400).json({ error: 'Stack is full (maximum 8 albums)' });
    }

    // Add album to stack
    const position = currentCount + 1;
    await db.query(
      `INSERT INTO stack_items (stack_id, vinyl_record_id, position)
       VALUES ($1, $2, $3)`,
      [stackId, albumId, position]
    );

    // Update stack timestamp
    await db.query(
      'UPDATE stacks SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [stackId]
    );

    // Get updated stack with all albums
    const stackResult = await db.query(
      `SELECT COALESCE(
                json_agg(
                  json_build_object(
                    'id', vr.id,
                    'title', vr.title,
                    'artist', vr.artist,
                    'album_art_url', vr.album_art_url,
                    'year', vr.year,
                    'label', vr.label,
                    'genres', vr.genres,
                    'styles', vr.styles,
                    'listened_count', vr.listened_count,
                    'is_liked', vr.is_liked
                  ) ORDER BY si.position
                ),
                '[]'
              ) as albums
       FROM stack_items si
       JOIN vinyl_records vr ON si.vinyl_record_id = vr.id
       WHERE si.stack_id = $1`,
      [stackId]
    );

    const albums = stackResult.rows[0].albums;
    const albumIds = albums.map(a => a.id);

    // Get recommendations if we have albums
    let suggestions = [];
    if (albumIds.length > 0 && albumIds.length < 8) {
      suggestions = await recommendationsService.getSimilarAlbums(userId, albumIds, 12);
    }

    res.json({
      success: true,
      albums,
      suggestions,
      canSave: albums.length === 8
    });
  } catch (error) {
    console.error('Add album to stack error:', error);
    res.status(500).json({ error: 'Failed to add album to stack' });
  }
});

// Remove album from custom stack
router.delete('/custom/:stackId/albums/:albumId', async (req, res) => {
  try {
    const { stackId, albumId } = req.params;
    const userId = req.session.userId;

    // Verify stack belongs to user
    const stackCheck = await db.query(
      'SELECT id FROM stacks WHERE id = $1 AND user_id = $2 AND type = $3',
      [stackId, userId, 'custom']
    );

    if (stackCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Stack not found' });
    }

    // Remove album from stack
    await db.query(
      'DELETE FROM stack_items WHERE stack_id = $1 AND vinyl_record_id = $2',
      [stackId, albumId]
    );

    // Reorder positions
    await db.query(
      `UPDATE stack_items si
       SET position = subquery.new_position
       FROM (
         SELECT id, ROW_NUMBER() OVER (ORDER BY position) as new_position
         FROM stack_items
         WHERE stack_id = $1
       ) AS subquery
       WHERE si.id = subquery.id`,
      [stackId]
    );

    // Update stack timestamp
    await db.query(
      'UPDATE stacks SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [stackId]
    );

    // Get updated stack
    const stackResult = await db.query(
      `SELECT COALESCE(
                json_agg(
                  json_build_object(
                    'id', vr.id,
                    'title', vr.title,
                    'artist', vr.artist,
                    'album_art_url', vr.album_art_url,
                    'year', vr.year,
                    'label', vr.label,
                    'genres', vr.genres,
                    'styles', vr.styles,
                    'listened_count', vr.listened_count,
                    'is_liked', vr.is_liked
                  ) ORDER BY si.position
                ),
                '[]'
              ) as albums
       FROM stack_items si
       JOIN vinyl_records vr ON si.vinyl_record_id = vr.id
       WHERE si.stack_id = $1`,
      [stackId]
    );

    const albums = stackResult.rows[0].albums;
    const albumIds = albums.map(a => a.id);

    // Get updated recommendations
    let suggestions = [];
    if (albumIds.length > 0 && albumIds.length < 8) {
      suggestions = await recommendationsService.getSimilarAlbums(userId, albumIds, 12);
    }

    res.json({
      success: true,
      albums,
      suggestions,
      canSave: albums.length === 8
    });
  } catch (error) {
    console.error('Remove album from stack error:', error);
    res.status(500).json({ error: 'Failed to remove album from stack' });
  }
});

// Save and name a custom stack
router.post('/custom/:stackId/save', async (req, res) => {
  try {
    const { stackId } = req.params;
    const { name } = req.body;
    const userId = req.session.userId;

    // Validate name
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Stack name is required' });
    }

    if (name.length > 100) {
      return res.status(400).json({ error: 'Stack name must be 100 characters or less' });
    }

    // Verify stack belongs to user
    const stackCheck = await db.query(
      'SELECT id FROM stacks WHERE id = $1 AND user_id = $2 AND type = $3',
      [stackId, userId, 'custom']
    );

    if (stackCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Stack not found' });
    }

    // Verify stack has exactly 8 albums
    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM stack_items WHERE stack_id = $1',
      [stackId]
    );

    if (parseInt(countResult.rows[0].count) !== 8) {
      return res.status(400).json({ error: 'Stack must have exactly 8 albums to save' });
    }

    // Update stack with name
    await db.query(
      'UPDATE stacks SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [name.trim(), stackId]
    );

    res.json({ success: true, name: name.trim() });
  } catch (error) {
    console.error('Save custom stack error:', error);
    res.status(500).json({ error: 'Failed to save custom stack' });
  }
});

// Delete a custom stack
router.delete('/custom/:stackId', async (req, res) => {
  try {
    const { stackId } = req.params;
    const userId = req.session.userId;

    // Verify stack belongs to user
    const stackCheck = await db.query(
      'SELECT id FROM stacks WHERE id = $1 AND user_id = $2 AND type = $3',
      [stackId, userId, 'custom']
    );

    if (stackCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Stack not found' });
    }

    // Delete stack items first (foreign key constraint)
    await db.query('DELETE FROM stack_items WHERE stack_id = $1', [stackId]);

    // Delete stack
    await db.query('DELETE FROM stacks WHERE id = $1', [stackId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete custom stack error:', error);
    res.status(500).json({ error: 'Failed to delete custom stack' });
  }
});

// Get recommendations for a draft stack
router.get('/custom/:stackId/recommendations', async (req, res) => {
  try {
    const { stackId } = req.params;
    const userId = req.session.userId;

    // Verify stack belongs to user
    const stackCheck = await db.query(
      'SELECT id FROM stacks WHERE id = $1 AND user_id = $2 AND type = $3',
      [stackId, userId, 'custom']
    );

    if (stackCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Stack not found' });
    }

    // Get album IDs in stack
    const albumsResult = await db.query(
      'SELECT vinyl_record_id FROM stack_items WHERE stack_id = $1',
      [stackId]
    );

    const albumIds = albumsResult.rows.map(row => row.vinyl_record_id);

    if (albumIds.length === 0) {
      return res.json({ suggestions: [] });
    }

    // Get recommendations
    const suggestions = await recommendationsService.getSimilarAlbums(userId, albumIds, 12);

    res.json({ suggestions });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

module.exports = router;
