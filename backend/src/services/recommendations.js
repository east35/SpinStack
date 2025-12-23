/**
 * Recommendations Service
 * Provides similar album suggestions based on existing albums in a stack
 */

const db = require('../db');

/**
 * Get similar album recommendations based on albums already in a stack
 * @param {number} userId - User ID
 * @param {Array<number>} existingAlbumIds - IDs of albums already in the stack
 * @param {number} limit - Number of recommendations to return (default: 8)
 * @returns {Promise<Array>} Array of recommended albums
 */
async function getSimilarAlbums(userId, existingAlbumIds = [], limit = 8) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  // If no existing albums, return empty array
  if (!existingAlbumIds || existingAlbumIds.length === 0) {
    return [];
  }

  // Get details of existing albums to analyze
  const existingAlbumsQuery = `
    SELECT id, artist, genres, styles, year
    FROM vinyl_records
    WHERE id = ANY($1) AND user_id = $2
  `;

  const existingAlbumsResult = await db.query(existingAlbumsQuery, [existingAlbumIds, userId]);
  const existingAlbums = existingAlbumsResult.rows;

  if (existingAlbums.length === 0) {
    return [];
  }

  // Extract all genres, styles, artists, and years from existing albums
  const allGenres = new Set();
  const allStyles = new Set();
  const allArtists = new Set();
  const allYears = [];

  existingAlbums.forEach(album => {
    if (album.genres && Array.isArray(album.genres)) {
      album.genres.forEach(g => allGenres.add(g.toLowerCase()));
    }
    if (album.styles && Array.isArray(album.styles)) {
      album.styles.forEach(s => allStyles.add(s.toLowerCase()));
    }
    if (album.artist) {
      allArtists.add(album.artist.toLowerCase());
    }
    if (album.year) {
      allYears.push(album.year);
    }
  });

  // Calculate average year for era matching
  const avgYear = allYears.length > 0
    ? Math.round(allYears.reduce((sum, y) => sum + y, 0) / allYears.length)
    : null;

  // Define era range (within 10 years)
  const eraRange = avgYear ? 10 : null;

  // Build similarity scoring query
  // Albums get points for matching: genres (3 pts each), styles (2 pts each), artist (5 pts), era (1 pt)
  const recommendationsQuery = `
    WITH scored_albums AS (
      SELECT
        vr.id,
        vr.title,
        vr.artist,
        vr.album_art_url,
        vr.year,
        vr.label,
        vr.genres,
        vr.styles,
        vr.listened_count,
        vr.is_liked,
        (
          -- Genre matching (3 points per matching genre)
          COALESCE((
            SELECT COUNT(*) * 3
            FROM unnest(vr.genres) AS g
            WHERE LOWER(g) = ANY($3::text[])
          ), 0) +

          -- Style matching (2 points per matching style)
          COALESCE((
            SELECT COUNT(*) * 2
            FROM unnest(vr.styles) AS s
            WHERE LOWER(s) = ANY($4::text[])
          ), 0) +

          -- Same artist (5 points)
          CASE
            WHEN LOWER(vr.artist) = ANY($5::text[]) THEN 5
            ELSE 0
          END +

          -- Same era (1 point if within range)
          CASE
            WHEN $6::integer IS NOT NULL
              AND vr.year IS NOT NULL
              AND ABS(vr.year - $6) <= $7
            THEN 1
            ELSE 0
          END
        ) AS similarity_score
      FROM vinyl_records vr
      WHERE vr.user_id = $1
        AND vr.id != ALL($2::integer[])  -- Exclude albums already in stack
    )
    SELECT
      id,
      title,
      artist,
      album_art_url,
      year,
      label,
      genres,
      styles,
      listened_count,
      is_liked,
      similarity_score
    FROM scored_albums
    WHERE similarity_score > 0
    ORDER BY similarity_score DESC, RANDOM()  -- Random tiebreaker for same scores
    LIMIT $8
  `;

  const params = [
    userId,
    existingAlbumIds,
    Array.from(allGenres),
    Array.from(allStyles),
    Array.from(allArtists),
    avgYear,
    eraRange,
    limit
  ];

  const result = await db.query(recommendationsQuery, params);

  return result.rows.map(album => ({
    id: album.id,
    title: album.title,
    artist: album.artist,
    album_art_url: album.album_art_url,
    year: album.year,
    label: album.label,
    genres: album.genres,
    styles: album.styles,
    listened_count: album.listened_count,
    is_liked: album.is_liked,
    similarity_score: album.similarity_score,
    is_suggestion: true  // Mark as suggestion for UI
  }));
}

module.exports = {
  getSimilarAlbums
};
