-- Migration: Add persistent daily and weekly stacks tables
-- Date: 2025-12-18
-- Purpose: Support static daily/weekly stacks that don't change on refresh

-- Daily stacks - one per user per day
CREATE TABLE IF NOT EXISTS daily_stacks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stack_date DATE NOT NULL,
  albums JSONB NOT NULL,  -- Array of vinyl_record objects (id, title, artist, album_art_url, etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, stack_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stacks_user_date ON daily_stacks(user_id, stack_date);
CREATE INDEX IF NOT EXISTS idx_daily_stacks_date ON daily_stacks(stack_date);

-- Weekly stacks - multiple per user per week (genre-based, curated, etc.)
CREATE TABLE IF NOT EXISTS weekly_stacks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stack_type VARCHAR(100) NOT NULL,  -- 'genre-rock', 'recent-additions', 'unplayed', etc.
  stack_name VARCHAR(255) NOT NULL,
  week_start_date DATE NOT NULL,  -- Monday of the week
  albums JSONB NOT NULL,  -- Array of vinyl_record objects
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, stack_type, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_stacks_user_week ON weekly_stacks(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_stacks_type ON weekly_stacks(stack_type);
CREATE INDEX IF NOT EXISTS idx_weekly_stacks_user_type_week ON weekly_stacks(user_id, stack_type, week_start_date);

-- Add timezone to users table for proper daily stack regeneration
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- Comment for future reference
COMMENT ON TABLE daily_stacks IS 'Persistent daily stacks that remain the same throughout the day';
COMMENT ON TABLE weekly_stacks IS 'Persistent weekly curated stacks that remain the same for 7 days';
COMMENT ON COLUMN users.timezone IS 'User timezone for accurate daily stack midnight regeneration';
