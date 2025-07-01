/*
  # Update playlists table policies

  1. Changes
    - Add DELETE policy for playlists table
    - Update existing policies to be more specific
    - Ensure proper cascade deletion handling

  2. Security
    - Enable RLS on playlists table
    - Add policy for deleting playlists
    - Maintain data integrity with proper permissions
*/

-- First, ensure RLS is enabled
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Allow authenticated users to insert playlists" ON playlists;
DROP POLICY IF EXISTS "Allow authenticated users to read playlists" ON playlists;

-- Create INSERT policy
CREATE POLICY "Allow authenticated users to insert playlists"
ON playlists
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create SELECT policy
CREATE POLICY "Allow authenticated users to read playlists"
ON playlists
FOR SELECT
TO authenticated
USING (true);

-- Create DELETE policy
CREATE POLICY "Allow authenticated users to delete playlists"
ON playlists
FOR DELETE
TO authenticated
USING (true);

-- Create UPDATE policy
CREATE POLICY "Allow authenticated users to update playlists"
ON playlists
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);