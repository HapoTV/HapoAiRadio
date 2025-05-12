/*
  # Configure tracks storage

  1. Storage Configuration
    - Create tracks bucket if it doesn't exist
    - Set up proper permissions for authenticated users
    - Configure RLS policies for track uploads and access

  2. Changes
    - Add storage bucket for tracks
    - Enable RLS on storage.objects
    - Create policies for track access and upload
    - Grant necessary permissions to authenticated users
*/

-- Create tracks bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('tracks', 'tracks', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload tracks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read tracks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their tracks" ON storage.objects;

-- Create comprehensive policies for tracks
CREATE POLICY "Authenticated users can upload tracks"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tracks');

CREATE POLICY "Authenticated users can read tracks"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tracks');

CREATE POLICY "Authenticated users can delete their tracks"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'tracks' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Ensure proper permissions are granted
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;