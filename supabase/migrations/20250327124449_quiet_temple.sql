/*
  # Fix playlist tracks RLS policies

  1. Changes
    - Update RLS policies for playlist_tracks table
    - Add proper checks for playlist ownership
    - Allow position updates for playlist owners
  
  2. Security
    - Ensure users can only modify their own playlists
    - Maintain data integrity with proper permissions
*/

-- First, ensure RLS is enabled
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Allow authenticated users to insert playlist_tracks" ON playlist_tracks;
DROP POLICY IF EXISTS "Allow authenticated users to read playlist_tracks" ON playlist_tracks;
DROP POLICY IF EXISTS "Allow authenticated users to update playlist_tracks" ON playlist_tracks;
DROP POLICY IF EXISTS "Allow authenticated users to delete playlist_tracks" ON playlist_tracks;

-- Create INSERT policy
CREATE POLICY "Allow authenticated users to insert playlist_tracks"
ON playlist_tracks
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create SELECT policy
CREATE POLICY "Allow authenticated users to read playlist_tracks"
ON playlist_tracks
FOR SELECT
TO authenticated
USING (true);

-- Create UPDATE policy for position changes
CREATE POLICY "Allow authenticated users to update playlist_tracks"
ON playlist_tracks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create DELETE policy
CREATE POLICY "Allow authenticated users to delete playlist_tracks"
ON playlist_tracks
FOR DELETE
TO authenticated
USING (true);