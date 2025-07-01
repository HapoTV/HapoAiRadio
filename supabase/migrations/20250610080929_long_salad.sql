/*
  # Update existing tracks table with new metadata fields
  
  1. Changes
    - Add album field to tracks table
    - Convert genre from text to text[] (array)
    - Add duration_seconds field
    - Add file_path field
    - Add user_id reference
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to tracks table
ALTER TABLE tracks
ADD COLUMN IF NOT EXISTS album text,
ADD COLUMN IF NOT EXISTS file_path text,
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Rename duration to duration_seconds if it doesn't exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracks' AND column_name = 'duration'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracks' AND column_name = 'duration_seconds'
  ) THEN
    ALTER TABLE tracks RENAME COLUMN duration TO duration_seconds;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracks' AND column_name = 'duration_seconds'
  ) THEN
    ALTER TABLE tracks ADD COLUMN duration_seconds numeric;
  END IF;
END $$;

-- Convert genre from text to text[] if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracks' AND column_name = 'genre' AND data_type = 'text'
  ) THEN
    -- Create a temporary column
    ALTER TABLE tracks ADD COLUMN genre_array text[];
    
    -- Update the temporary column with values from the original column
    UPDATE tracks SET genre_array = ARRAY[genre] WHERE genre IS NOT NULL;
    
    -- Drop the original column
    ALTER TABLE tracks DROP COLUMN genre;
    
    -- Rename the temporary column to the original name
    ALTER TABLE tracks RENAME COLUMN genre_array TO genre;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracks' AND column_name = 'genre'
  ) THEN
    -- Add genre column as array if it doesn't exist
    ALTER TABLE tracks ADD COLUMN genre text[];
  END IF;
END $$;

-- Add file_url column if it doesn't exist
ALTER TABLE tracks
ADD COLUMN IF NOT EXISTS file_url text;

-- Create indexes for improved search performance if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tracks_album') THEN
    CREATE INDEX idx_tracks_album ON tracks USING gin (album gin_trgm_ops);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tracks_user_id') THEN
    CREATE INDEX idx_tracks_user_id ON tracks(user_id);
  END IF;
END $$;

-- Update RLS policies if needed
DO $$ 
BEGIN
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