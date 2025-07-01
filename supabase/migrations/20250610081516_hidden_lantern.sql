/*
  # Optimize track metadata and add indexes
  
  1. Changes
    - Add indexes for improved search performance
    - Add constraints for data validation
    - Update RLS policies for better security
  
  2. Security
    - Ensure proper access control for track data
*/

-- Create additional indexes for improved search performance
CREATE INDEX IF NOT EXISTS idx_tracks_title_trgm ON tracks USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tracks_artist_trgm ON tracks USING gin (artist gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tracks_album_trgm ON tracks USING gin (album gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks USING gin (genre);

-- Add constraints for data validation
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tracks_duration_seconds_check'
  ) THEN
    ALTER TABLE tracks ADD CONSTRAINT tracks_duration_seconds_check 
      CHECK (duration_seconds >= 0);
  END IF;
END $$;

-- Create function to update track play count
CREATE OR REPLACE FUNCTION increment_track_play_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the track's play count in a separate analytics table if needed
  -- This is a placeholder for future analytics functionality
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to handle track deletion
CREATE OR REPLACE FUNCTION handle_track_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the file from storage when the track is deleted
  PERFORM pg_notify(
    'track_deleted',
    json_build_object(
      'file_path', OLD.file_path,
      'user_id', OLD.user_id
    )::text
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for track deletion if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_track_deleted'
  ) THEN
    CREATE TRIGGER on_track_deleted
      BEFORE DELETE ON tracks
      FOR EACH ROW
      EXECUTE FUNCTION handle_track_deletion();
  END IF;
END $$;

-- Ensure proper RLS policies
DO $$ 
BEGIN
  -- Allow users to read all tracks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tracks' 
    AND policyname = 'Users can read all track metadata'
  ) THEN
    CREATE POLICY "Users can read all track metadata"
      ON tracks FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  -- Allow users to insert their own tracks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tracks' 
    AND policyname = 'Users can insert their own tracks'
  ) THEN
    CREATE POLICY "Users can insert their own tracks"
      ON tracks FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Allow users to update their own tracks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tracks' 
    AND policyname = 'Users can update their own tracks'
  ) THEN
    CREATE POLICY "Users can update their own tracks"
      ON tracks FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Allow users to delete their own tracks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tracks' 
    AND policyname = 'Users can delete their own tracks'
  ) THEN
    CREATE POLICY "Users can delete their own tracks"
      ON tracks FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;