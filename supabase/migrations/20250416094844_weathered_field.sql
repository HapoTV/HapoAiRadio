/*
  # Update playlist relationships table safely
  
  1. Changes
    - Drop existing policy if it exists
    - Create new policy with proper permissions
    - Add indexes and constraints if they don't exist
  
  2. Security
    - Maintain RLS
    - Add proper policies for authenticated users
*/

-- Drop existing policy first to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to manage playlist relationships" ON playlist_relationships;

-- Create playlist_relationships table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'playlist_relationships') THEN
    CREATE TABLE playlist_relationships (
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
  END IF;
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_playlist_relationships_source') THEN
    CREATE INDEX idx_playlist_relationships_source ON playlist_relationships(source_playlist_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_playlist_relationships_related') THEN
    CREATE INDEX idx_playlist_relationships_related ON playlist_relationships(related_playlist_id);
  END IF;
END $$;

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'playlist_relationships' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE playlist_relationships ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create new policy
CREATE POLICY "Allow authenticated users to manage playlist relationships"
  ON playlist_relationships FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create or replace function to update relationship strength
CREATE OR REPLACE FUNCTION update_playlist_relationship_strength()
RETURNS trigger AS $$
BEGIN
  -- Calculate relationship strength based on common tracks
  WITH common_tracks AS (
    SELECT COUNT(*) as common_count
    FROM playlist_tracks as pt1
    JOIN playlist_tracks as pt2 
      ON pt1.track_id = pt2.track_id
    WHERE pt1.playlist_id = NEW.source_playlist_id 
      AND pt2.playlist_id = NEW.related_playlist_id
  ),
  total_tracks AS (
    SELECT 
      (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = NEW.source_playlist_id) as source_count,
      (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = NEW.related_playlist_id) as related_count
  )
  UPDATE playlist_relationships
  SET relationship_strength = (
    SELECT 
      CASE 
        WHEN GREATEST(source_count, related_count) = 0 THEN 0
        ELSE common_count::numeric / GREATEST(source_count, related_count)::numeric
      END
    FROM common_tracks, total_tracks
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_relationship_strength_trigger ON playlist_relationships;

-- Create trigger for updating relationship strength
CREATE TRIGGER update_relationship_strength_trigger
  AFTER INSERT OR UPDATE ON playlist_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_playlist_relationship_strength();

-- Create or replace function to update relationships when playlist tracks change
CREATE OR REPLACE FUNCTION update_playlist_relationships_on_track_change()
RETURNS trigger AS $$
BEGIN
  -- Update relationship strengths for all relationships involving this playlist
  UPDATE playlist_relationships
  SET updated_at = now()
  WHERE source_playlist_id = NEW.playlist_id 
     OR related_playlist_id = NEW.playlist_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_relationships_on_track_change ON playlist_tracks;

-- Create trigger for updating relationships when tracks change
CREATE TRIGGER update_relationships_on_track_change
  AFTER INSERT OR DELETE OR UPDATE ON playlist_tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_playlist_relationships_on_track_change();