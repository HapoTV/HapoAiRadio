/*
  # Create storage bucket for music tracks

  1. New Storage Bucket
    - Creates a new public bucket named 'tracks' for storing music files
    - Enables public access for authenticated users
  
  2. Security
    - Enables RLS policies for the bucket
    - Adds policies for authenticated users to upload and read tracks
*/

-- Create the storage bucket for tracks
INSERT INTO storage.buckets (id, name, public)
VALUES ('tracks', 'tracks', true);

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for the tracks bucket
CREATE POLICY "Authenticated users can upload tracks"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tracks');

CREATE POLICY "Authenticated users can read tracks"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tracks');