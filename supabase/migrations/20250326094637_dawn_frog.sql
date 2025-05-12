/*
  # Initial schema for music platform

  1. New Tables
    - `stores`
      - `id` (uuid, primary key)
      - `name` (text)
      - `location` (text)
      - `status` (text)
      - `created_at` (timestamp)
    
    - `tracks`
      - `id` (uuid, primary key)
      - `title` (text)
      - `artist` (text)
      - `duration` (integer)
      - `file_url` (text)
      - `created_at` (timestamp)
    
    - `playlists`
      - `id` (uuid, primary key)
      - `name` (text)
      - `created_at` (timestamp)
    
    - `playlist_tracks`
      - `id` (uuid, primary key)
      - `playlist_id` (uuid, foreign key)
      - `track_id` (uuid, foreign key)
      - `position` (integer)
      - `created_at` (timestamp)
    
    - `schedules`
      - `id` (uuid, primary key)
      - `playlist_id` (uuid, foreign key)
      - `store_id` (uuid, foreign key)
      - `start_time` (time)
      - `end_time` (time)
      - `days_of_week` (integer[])
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read and manage their data
*/

-- Create stores table
CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  status text NOT NULL DEFAULT 'offline',
  created_at timestamptz DEFAULT now()
);

-- Create tracks table
CREATE TABLE tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text,
  duration integer NOT NULL DEFAULT 0,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create playlists table
CREATE TABLE playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create playlist_tracks table
CREATE TABLE playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE,
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE,
  position integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create schedules table
CREATE TABLE schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  start_time time NOT NULL,
  end_time time NOT NULL,
  days_of_week integer[] NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read stores"
  ON stores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert stores"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update stores"
  ON stores FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read tracks"
  ON tracks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert tracks"
  ON tracks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read playlists"
  ON playlists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert playlists"
  ON playlists FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read playlist_tracks"
  ON playlist_tracks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert playlist_tracks"
  ON playlist_tracks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read schedules"
  ON schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert schedules"
  ON schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);