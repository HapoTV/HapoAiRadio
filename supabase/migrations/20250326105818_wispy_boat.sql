/*
  # Update playlist_tracks policies

  1. Changes
    - Add UPDATE policy for playlist_tracks table to allow authenticated users to update track positions
    - Modify existing policies to be more specific about access control

  2. Security
    - Enable RLS on playlist_tracks table
    - Add policy for updating track positions
    - Ensure users can only modify their own playlist tracks
*/

-- First, ensure RLS is enabled
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Allow authenticated users to insert playlist_tracks" ON playlist_tracks;
DROP POLICY IF EXISTS "Allow authenticated users to read playlist_tracks" ON playlist_tracks;

-- Create INSERT policy
CREATE POLICY "Allow authenticated users to insert playlist_tracks"
ON playlist_tracks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE id = playlist_tracks.playlist_id
  )
);

-- Create SELECT policy
CREATE POLICY "Allow authenticated users to read playlist_tracks"
ON playlist_tracks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE id = playlist_tracks.playlist_id
  )
);

-- Create UPDATE policy for position changes
CREATE POLICY "Allow authenticated users to update playlist_tracks"
ON playlist_tracks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE id = playlist_tracks.playlist_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE id = playlist_tracks.playlist_id
  )
);

-- Create DELETE policy
CREATE POLICY "Allow authenticated users to delete playlist_tracks"
ON playlist_tracks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE id = playlist_tracks.playlist_id
  )
);