const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAuth = require('../middleware/auth');
const cacheService = require('../services/cache');

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
    `SELECT id, discogs_release_id, title, artist, album_art_url, year, genres
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

    // Check cache/database first
    let albums = await cacheService.getDailyStack(userId, today);

    if (!albums) {
      // Generate new stack
      albums = await generateDailyStack(userId);

      // Save to database
      await db.query(
        `INSERT INTO daily_stacks (user_id, stack_date, albums)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, stack_date) DO UPDATE SET albums = $3`,
        [userId, today, JSON.stringify(albums)]
      );

      // Cache in Redis
      await cacheService.cacheDailyStack(userId, today, albums);
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
    res.status(500).json({ error: 'Failed to generate daily stack' });
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

  const fetchStack = async (id, name, whereClause, orderClause = 'ORDER BY RANDOM()', limit = 16, extraParams = []) => {
    const result = await db.query(
      `SELECT id, discogs_release_id, title, artist, album_art_url, year, genres
       FROM vinyl_records
       WHERE user_id = $1 ${whereClause}
       ${orderClause}
       LIMIT ${limit}`,
      [userId, ...extraParams]
    );
    const albums = getUniqueAlbums(result.rows).slice(0, 8);
    if (albums.length >= 4) {
      stacks.push({ id, name, albums });
    }
  };

  // Top genres (up to 4)
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
      [genre]
    );
  }

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

  // Add style-based stacks (cross-genre mood clusters)
  const styleStacks = await generateStyleStacks(userId);
  stacks.push(...styleStacks);

  // Fallback: random mixes if none found yet
  if (stacks.length === 0) {
    const result = await db.query(
      `SELECT id, discogs_release_id, title, artist, album_art_url, year, genres
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

  return stacks;
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

module.exports = router;
