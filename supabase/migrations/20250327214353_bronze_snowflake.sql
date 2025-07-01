/*
  # Add playlist cover support
  
  1. Changes
    - Add cover_url column to playlists table
    - Create storage bucket for playlist covers
    - Set up storage policies for playlist covers
  
  2. Security
    - Enable proper RLS policies for storage access
    - Maintain existing playlist table security
*/

-- Add cover_url column to playlists table
ALTER TABLE playlists
ADD COLUMN IF NOT EXISTS cover_url text;

-- Create storage bucket for playlist covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('playlist-covers', 'playlist-covers', true)
ON CONFLICT (id) DO NOTHING;

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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;