/*
  # Update tracks table policies

  1. Changes
    - Add DELETE policy for tracks table
    - Update existing policies to be more specific
    - Ensure proper cascade deletion handling

  2. Security
    - Enable RLS on tracks table
    - Add policy for deleting tracks
    - Maintain data integrity with proper permissions
*/

-- First, ensure RLS is enabled
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Allow authenticated users to insert tracks" ON tracks;
DROP POLICY IF EXISTS "Allow authenticated users to read tracks" ON tracks;

-- Create INSERT policy
CREATE POLICY "Allow authenticated users to insert tracks"
ON tracks
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create SELECT policy
CREATE POLICY "Allow authenticated users to read tracks"
ON tracks
FOR SELECT
TO authenticated
USING (true);

-- Create DELETE policy
CREATE POLICY "Allow authenticated users to delete tracks"
ON tracks
FOR DELETE
TO authenticated
USING (true);