/*
  # Add track analytics policies safely

  This migration ensures the track_plays table and its policies exist,
  creating them only if they don't already exist.

  1. Changes:
    - Creates track_plays table if it doesn't exist
    - Enables RLS
    - Creates policies for authenticated users if they don't exist
*/

-- Create track_plays table if it doesn't exist
CREATE TABLE IF NOT EXISTS track_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE,
  played_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'track_plays' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE track_plays ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create insert policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'track_plays' 
    AND policyname = 'Allow authenticated users to insert track plays'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert track plays"
    ON track_plays
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- Create select policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'track_plays' 
    AND policyname = 'Allow authenticated users to read track plays'
  ) THEN
    CREATE POLICY "Allow authenticated users to read track plays"
    ON track_plays
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;