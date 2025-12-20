#!/usr/bin/env node

/**
 * Export collection data to create mock data for demo site
 * Usage: node scripts/export-mock-data.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://vinyl_user:vinyl_pass@localhost:5432/vinyl_collection',
});

async function exportMockData() {
  try {
    console.log('🎵 Exporting collection data for demo site...\n');

    // Get all vinyl records WITH album art only
    console.log('📀 Fetching vinyl records with album art...');
    const recordsResult = await pool.query(`
      SELECT
        id, discogs_release_id, title, artist, year, genres, styles, label,
        catalog_number, format, album_art_url
      FROM vinyl_records
      WHERE user_id = (SELECT id FROM users LIMIT 1)
        AND album_art_url IS NOT NULL
        AND album_art_url != ''
      ORDER BY date_added_to_collection DESC
    `);

    const records = recordsResult.rows;
    console.log(`✅ Found ${records.length} records with album art\n`);

    // Calculate stats
    console.log('📊 Calculating stats...');
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_records,
        COUNT(CASE WHEN listened_count > 0 THEN 1 END) as total_listened,
        COUNT(CASE WHEN listened_count = 0 THEN 1 END) as total_unlistened,
        COUNT(CASE WHEN is_liked THEN 1 END) as total_liked
      FROM vinyl_records
      WHERE user_id = (SELECT id FROM users LIMIT 1)
    `);

    const genresResult = await pool.query(`
      SELECT unnest(genres) as genre, COUNT(*) as count
      FROM vinyl_records
      WHERE user_id = (SELECT id FROM users LIMIT 1)
        AND genres IS NOT NULL
      GROUP BY genre
      ORDER BY count DESC
      LIMIT 10
    `);

    const favoriteGenreResult = await pool.query(`
      SELECT unnest(genres) as genre, COUNT(*) as count
      FROM vinyl_records
      WHERE user_id = (SELECT id FROM users LIMIT 1)
        AND genres IS NOT NULL
      GROUP BY genre
      ORDER BY count DESC
      LIMIT 1
    `);

    const favoriteArtistResult = await pool.query(`
      SELECT artist, COUNT(*) as count
      FROM vinyl_records
      WHERE user_id = (SELECT id FROM users LIMIT 1)
      GROUP BY artist
      ORDER BY count DESC
      LIMIT 1
    `);

    const stats = {
      collection: statsResult.rows[0],
      topGenres: genresResult.rows,
      favoriteGenre: favoriteGenreResult.rows[0]?.genre,
      favoriteArtist: favoriteArtistResult.rows[0]?.artist,
      mostPlayed: [],
      dustyGems: []
    };

    console.log(`✅ Stats calculated\n`);

    // Generate mock stacks (simplified version)
    console.log('🎲 Generating mock stacks...');

    // Daily stack - random 8 albums
    const dailyStack = records
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);

    // Weekly stacks - genre-based and curated
    const weeklyStacks = [];

    // Get top genres for stacks
    const topGenres = genresResult.rows.slice(0, 4);
    for (const { genre } of topGenres) {
      const genreRecords = records
        .filter(r => r.genres && r.genres.includes(genre))
        .sort(() => Math.random() - 0.5)
        .slice(0, 8);

      if (genreRecords.length >= 4) {
        weeklyStacks.push({
          id: `genre-${genre.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          name: `Genre: ${genre}`,
          albums: genreRecords
        });
      }
    }

    // Add curated stacks
    const recentRecords = records.slice(0, 8);
    if (recentRecords.length >= 4) {
      weeklyStacks.push({
        id: 'recent-additions',
        name: 'Recent Additions',
        albums: recentRecords
      });
    }

    // Random mix
    const randomRecords = records
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);
    weeklyStacks.push({
      id: 'random-mix',
      name: 'Random Mix',
      albums: randomRecords
    });

    console.log(`✅ Generated ${weeklyStacks.length} weekly stacks\n`);

    // Create mock data object
    const mockData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalRecords: records.length,
        version: '1.0'
      },
      collection: records,
      stats: stats,
      stacks: {
        daily: {
          id: 'daily',
          name: "Today's Setlist",
          date: new Date().toISOString().split('T')[0],
          albums: dailyStack
        },
        weekly: weeklyStacks
      }
    };

    // Write to file
    const outputPath = path.join(__dirname, '../frontend/lib/mockData.json');
    fs.writeFileSync(outputPath, JSON.stringify(mockData, null, 2));

    console.log('✅ Mock data exported successfully!');
    console.log(`📁 Output: ${outputPath}`);
    console.log(`\nSummary:`);
    console.log(`  - Records: ${records.length}`);
    console.log(`  - Daily stack albums: ${dailyStack.length}`);
    console.log(`  - Weekly stacks: ${weeklyStacks.length}`);
    console.log(`  - Top genres: ${topGenres.length}`);

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

exportMockData();
