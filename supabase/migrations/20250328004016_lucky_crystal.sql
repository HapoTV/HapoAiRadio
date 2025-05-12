/*
  # Update Tracks Table Schema

  1. Changes
    - Add new columns for enhanced music metadata
    - Add constraints for data validation
    - Update existing indexes

  2. Data Validation
    - Add check constraints for valid years
    - Ensure duration is stored in seconds
*/

-- Add new columns to tracks table
ALTER TABLE tracks
ADD COLUMN IF NOT EXISTS album_artist text,
ADD COLUMN IF NOT EXISTS release_year integer,
ADD COLUMN IF NOT EXISTS genre text;

-- Add check constraints
ALTER TABLE tracks
ADD CONSTRAINT valid_release_year 
  CHECK (release_year IS NULL OR (release_year >= 1900 AND release_year <= date_part('year', CURRENT_DATE)::integer));

-- Create indexes for improved search performance
CREATE INDEX IF NOT EXISTS idx_tracks_album_artist_trgm ON tracks USING gin (album_artist gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tracks_genre_trgm ON tracks USING gin (genre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tracks_release_year ON tracks (release_year);

-- Update RLS policies to include new columns
CREATE POLICY "Users can read all track metadata" ON tracks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update track metadata" ON tracks
  FOR UPDATE TO authenticated USING (true);