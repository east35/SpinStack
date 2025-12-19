-- Users table (keeping existing auth structure)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  discogs_username VARCHAR(255) UNIQUE NOT NULL,
  discogs_access_token TEXT,
  discogs_access_secret TEXT,
  stack_count INTEGER DEFAULT 5, -- User preference for stack size
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vinyl records (synced from Discogs collection)
CREATE TABLE IF NOT EXISTS vinyl_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  discogs_release_id INTEGER NOT NULL,
  discogs_instance_id INTEGER NOT NULL,
  title VARCHAR(500) NOT NULL,
  artist VARCHAR(500) NOT NULL,
  year INTEGER,
  genres TEXT[], -- Array of genres
  styles TEXT[], -- Array of styles (subgenres)
  label VARCHAR(255),
  catalog_number VARCHAR(100),
  format VARCHAR(100),
  album_art_url TEXT,
  date_added_to_collection TIMESTAMP,
  folder_id INTEGER, -- Discogs folder ID
  listened_count INTEGER DEFAULT 0, -- Track play count
  is_liked BOOLEAN DEFAULT FALSE, -- Heart/favorite feature
  last_played_at TIMESTAMP, -- Last time played
  last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, discogs_instance_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vinyl_user_id ON vinyl_records(user_id);
CREATE INDEX IF NOT EXISTS idx_vinyl_genres ON vinyl_records USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_vinyl_styles ON vinyl_records USING GIN(styles);
CREATE INDEX IF NOT EXISTS idx_vinyl_artist ON vinyl_records(artist);
CREATE INDEX IF NOT EXISTS idx_vinyl_year ON vinyl_records(year);
CREATE INDEX IF NOT EXISTS idx_vinyl_date_added ON vinyl_records(date_added_to_collection);
CREATE INDEX IF NOT EXISTS idx_vinyl_listened_count ON vinyl_records(listened_count);

-- Play history (track individual plays for analytics)
CREATE TABLE IF NOT EXISTS play_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vinyl_record_id INTEGER NOT NULL REFERENCES vinyl_records(id) ON DELETE CASCADE,
  was_skipped BOOLEAN DEFAULT FALSE, -- Track if skipped vs played
  stack_id INTEGER, -- Optional: which stack it was played from
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_play_history_user ON play_history(user_id);
CREATE INDEX IF NOT EXISTS idx_play_history_vinyl ON play_history(vinyl_record_id);
CREATE INDEX IF NOT EXISTS idx_play_history_date ON play_history(played_at);

-- Stacks (renamed from playlists to match SpinStack terminology)
CREATE TABLE IF NOT EXISTS stacks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'daily', 'custom', 'genre', 'artist', 'random', 'new_pickups', 'dusty_gems', 'rare_gems'
  criteria JSONB, -- Store filter criteria for auto-generated stacks
  is_active BOOLEAN DEFAULT FALSE, -- Track if currently spinning
  current_position INTEGER DEFAULT 0, -- Which album is currently playing
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP -- When finished spinning
);

CREATE INDEX IF NOT EXISTS idx_stacks_user ON stacks(user_id);
CREATE INDEX IF NOT EXISTS idx_stacks_type ON stacks(type);
CREATE INDEX IF NOT EXISTS idx_stacks_active ON stacks(is_active);

-- Stack items (albums in a stack)
CREATE TABLE IF NOT EXISTS stack_items (
  id SERIAL PRIMARY KEY,
  stack_id INTEGER NOT NULL REFERENCES stacks(id) ON DELETE CASCADE,
  vinyl_record_id INTEGER NOT NULL REFERENCES vinyl_records(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, -- Order in the stack
  was_played BOOLEAN DEFAULT FALSE, -- Track completion status
  was_skipped BOOLEAN DEFAULT FALSE,
  played_at TIMESTAMP, -- When marked as played/skipped
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(stack_id, vinyl_record_id)
);

CREATE INDEX IF NOT EXISTS idx_stack_items_stack ON stack_items(stack_id);
CREATE INDEX IF NOT EXISTS idx_stack_items_position ON stack_items(stack_id, position);

-- Collection stats cache (for performance)
CREATE TABLE IF NOT EXISTS collection_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_records INTEGER DEFAULT 0,
  total_listened INTEGER DEFAULT 0,
  total_unlistened INTEGER DEFAULT 0,
  total_liked INTEGER DEFAULT 0,
  favorite_genre VARCHAR(255),
  favorite_artist VARCHAR(500),
  estimated_value_low DECIMAL(10, 2),
  estimated_value_median DECIMAL(10, 2),
  estimated_value_high DECIMAL(10, 2),
  last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collection_stats_user ON collection_stats(user_id);
