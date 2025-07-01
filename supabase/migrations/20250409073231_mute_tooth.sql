/*
  # Add Dynamic Playlist System
  
  1. New Tables
    - `playlist_relationships`
      - Links playlists together and tracks their relationships
      - Stores metadata about relationship strength and type
    
    - `playlist_queue`
      - Stores the current queue state for each playlist
      - Tracks both user-selected and auto-generated tracks
    
    - `playlist_analytics`
      - Stores playlist performance metrics
      - Used for improving auto-generation accuracy

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create playlist_relationships table
CREATE TABLE IF NOT EXISTS playlist_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE,
  related_playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('similar', 'inspired', 'store_specific', 'auto_generated')),
  relationship_strength numeric NOT NULL DEFAULT 0 CHECK (relationship_strength >= 0 AND relationship_strength <= 1),
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_playlist_relationship UNIQUE (source_playlist_id, related_playlist_id)
);

-- Create playlist_queue table
CREATE TABLE IF NOT EXISTS playlist_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE,
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE,
  position integer NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('user', 'auto', 'store')),
  source_playlist_id uuid REFERENCES playlists(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_position CHECK (position >= 0)
);

-- Create playlist_analytics table
CREATE TABLE IF NOT EXISTS playlist_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE,
  total_plays integer DEFAULT 0,
  avg_completion_rate numeric DEFAULT 0 CHECK (avg_completion_rate >= 0 AND avg_completion_rate <= 1),
  skip_rate numeric DEFAULT 0 CHECK (skip_rate >= 0 AND skip_rate <= 1),
  genre_distribution jsonb,
  tempo_distribution jsonb,
  mood_distribution jsonb,
  peak_play_hours integer[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_playlist_relationships_source ON playlist_relationships(source_playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_relationships_related ON playlist_relationships(related_playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_queue_playlist ON playlist_queue(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_queue_position ON playlist_queue(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_playlist_analytics_playlist ON playlist_analytics(playlist_id);

-- Enable RLS
ALTER TABLE playlist_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to manage playlist relationships"
  ON playlist_relationships FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage playlist queue"
  ON playlist_queue FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read playlist analytics"
  ON playlist_analytics FOR SELECT TO authenticated
  USING (true);

-- Create function to update playlist analytics
CREATE OR REPLACE FUNCTION update_playlist_analytics()
RETURNS trigger AS $$
BEGIN
  -- Update the analytics when a track is played
  UPDATE playlist_analytics
  SET 
    total_plays = total_plays + 1,
    updated_at = now()
  WHERE playlist_id = NEW.playlist_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;