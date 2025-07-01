/*
  # Configure storage for music tracks

  1. Storage Configuration
    - Creates a public bucket named 'tracks' for storing music files
    - Enables public access for file downloads
  
  2. Security
    - Enables RLS policies for storage objects
    - Adds policies for authenticated users to upload and read tracks
    - Grants necessary permissions to authenticated users
*/

-- Create the storage bucket for tracks
INSERT INTO storage.buckets (id, name, public)
VALUES ('tracks', 'tracks', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload tracks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read tracks" ON storage.objects;

-- Create policies for the tracks bucket
CREATE POLICY "Authenticated users can upload tracks"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tracks');

CREATE POLICY "Authenticated users can read tracks"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tracks');

-- Grant usage on storage schema
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;