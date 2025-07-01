-- Recreate the playlist-covers bucket with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'playlist-covers',
  'playlist-covers',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif']::text[];

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload playlist covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view playlist covers" ON storage.objects;

-- Create more specific policies
CREATE POLICY "Allow authenticated users to upload playlist covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'playlist-covers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow public read access to playlist covers"
ON storage.objects
FOR SELECT
USING (bucket_id = 'playlist-covers');

CREATE POLICY "Allow users to delete their own playlist covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'playlist-covers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);