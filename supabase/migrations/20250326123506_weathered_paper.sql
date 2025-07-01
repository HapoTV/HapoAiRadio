/*
  # Add track analytics

  1. New Tables
    - `track_plays`
      - `id` (uuid, primary key)
      - `track_id` (uuid, foreign key to tracks)
      - `store_id` (uuid, foreign key to stores)
      - `played_at` (timestamp)
      - `playlist_id` (uuid, foreign key to playlists)

  2. Security
    - Enable RLS on `track_plays` table
    - Add policies for authenticated users
*/

-- Create track_plays table
CREATE TABLE IF NOT EXISTS track_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE,
  played_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE track_plays ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to insert track plays"
ON track_plays
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read track plays"
ON track_plays
FOR SELECT
TO authenticated
USING (true);