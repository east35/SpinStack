const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const axios = require('axios');
const db = require('../db');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to fetch album art from MusicBrainz/Cover Art Archive
async function fetchAlbumArt(artist, title) {
  try {
    // Search MusicBrainz for the release
    const searchUrl = `https://musicbrainz.org/ws/2/release/?query=artist:${encodeURIComponent(artist)} AND release:${encodeURIComponent(title)}&fmt=json&limit=1`;
    const searchResponse = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'VinylCollectionApp/1.0' },
      timeout: 5000,
    });

    if (searchResponse.data.releases && searchResponse.data.releases.length > 0) {
      const releaseId = searchResponse.data.releases[0].id;

      // Try to get cover art from Cover Art Archive
      const coverArtUrl = `https://coverartarchive.org/release/${releaseId}/front-500`;

      // Check if cover art exists
      const headResponse = await axios.head(coverArtUrl, { timeout: 3000 });
      if (headResponse.status === 200) {
        return coverArtUrl;
      }
    }
  } catch (error) {
    // Silently fail - album art is optional
    console.log(`Could not fetch album art for ${artist} - ${title}`);
  }
  return null;
}

// Import CSV endpoint
router.post('/csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create a test user if none exists
    let userId = req.session.userId;

    if (!userId) {
      // Create/get a default user for CSV imports
      const userResult = await db.query(
        `INSERT INTO users (discogs_username)
         VALUES ('csv_import_user')
         ON CONFLICT (discogs_username)
         DO UPDATE SET updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
      );
      userId = userResult.rows[0].id;
      req.session.userId = userId;
      req.session.username = 'csv_import_user';
    }

    // Parse CSV
    const csvContent = req.file.buffer.toString('utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    let imported = 0;
    let errors = [];

    for (const record of records) {
      try {
        // Map CSV columns to database fields
        // Expected CSV format: artist, title, year, label, catalog_number, format, genres
        const artist = record.artist || record.Artist || 'Unknown Artist';
        const title = record.title || record.Title || record.album || record.Album || 'Unknown Title';
        const year = parseInt(record.year || record.Year || record.released || record.Released || '0');
        const label = record.label || record.Label || '';
        const catalogNumber = record.catalog_number || record['Catalog Number'] || record.cat_no || '';
        const format = record.format || record.Format || 'Vinyl';
        const genresStr = record.genres || record.Genres || record.genre || record.Genre || '';
        const genres = genresStr ? genresStr.split(',').map(g => g.trim()).filter(g => g) : [];

        // Fetch album art
        const albumArtUrl = await fetchAlbumArt(artist, title);

        // Generate a unique discogs_release_id and instance_id based on CSV data
        const uniqueId = Buffer.from(`${artist}-${title}-${year}-${catalogNumber}`).toString('base64').slice(0, 16);
        const releaseId = parseInt(uniqueId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
        const instanceId = releaseId + records.indexOf(record);

        await db.query(
          `INSERT INTO vinyl_records (
            user_id, discogs_release_id, discogs_instance_id,
            title, artist, year, genres, label, catalog_number, format,
            album_art_url, date_added_to_collection
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id, discogs_instance_id)
          DO UPDATE SET
            title = $4,
            artist = $5,
            year = $6,
            genres = $7,
            label = $8,
            catalog_number = $9,
            format = $10,
            album_art_url = $11,
            last_synced_at = CURRENT_TIMESTAMP`,
          [userId, releaseId, instanceId, title, artist, year, genres, label, catalogNumber, format, albumArtUrl]
        );
        imported++;
      } catch (error) {
        errors.push({ record, error: error.message });
      }
    }

    res.json({
      success: true,
      imported,
      total: records.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ error: 'Failed to import CSV', details: error.message });
  }
});

module.exports = router;
