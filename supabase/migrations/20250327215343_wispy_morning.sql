/*
  # Configure playlist covers storage and policies
  
  1. Changes
    - Add cover_url column to playlists table
    - Create playlist-covers bucket with proper configuration
    - Set up storage policies for playlist covers
  
  2. Security
    - Enable RLS on storage objects
    - Add policies for upload and read access
    - Configure proper user-based access control
*/

-- Add cover_url column to playlists table if it doesn't exist
ALTER TABLE playlists
ADD COLUMN IF NOT EXISTS cover_url text;

-- Create or update the playlist-covers bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('playlist-covers', 'playlist-covers', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Enable RLS on storage.objects if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload playlist covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view playlist covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their playlist covers" ON storage.objects;

-- Create storage policies for playlist covers
CREATE POLICY "Users can upload playlist covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'playlist-covers' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view playlist covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'playlist-covers');

CREATE POLICY "Users can delete their playlist covers"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'playlist-covers' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;