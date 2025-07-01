/*
  # Add advertisement scheduling system
  
  1. New Tables
    - `advertisements`
      - `id` (uuid, primary key)
      - `title` (text)
      - `file_url` (text)
      - `duration` (integer) - in seconds
      - `priority` (integer)
      - `start_date` (date)
      - `end_date` (date)
      - `created_at` (timestamp)
      - `status` (text) - active/inactive
    
    - `ad_schedules`
      - `id` (uuid, primary key)
      - `playlist_id` (uuid, foreign key)
      - `interval_minutes` (integer) - time between ads
      - `specific_times` (time[]) - specific times for ads
      - `slot_duration` (integer) - in seconds
      - `is_enabled` (boolean)
      - `created_at` (timestamp)
    
    - `ad_slots`
      - `id` (uuid, primary key)
      - `ad_schedule_id` (uuid, foreign key)
      - `advertisement_id` (uuid, foreign key)
      - `position` (integer)
      - `created_at` (timestamp)
    
    - `ad_plays`
      - `id` (uuid, primary key)
      - `advertisement_id` (uuid, foreign key)
      - `store_id` (uuid, foreign key)
      - `played_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create advertisements table
CREATE TABLE advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  file_url text NOT NULL,
  duration integer NOT NULL DEFAULT 30,
  priority integer NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_duration CHECK (duration > 0),
  CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10),
  CONSTRAINT valid_dates CHECK (start_date <= end_date),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive'))
);

-- Create ad_schedules table
CREATE TABLE ad_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE,
  interval_minutes integer,
  specific_times time[] DEFAULT ARRAY[]::time[],
  slot_duration integer NOT NULL DEFAULT 30,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_interval CHECK (interval_minutes IS NULL OR interval_minutes > 0),
  CONSTRAINT valid_slot_duration CHECK (slot_duration > 0)
);

-- Create ad_slots table
CREATE TABLE ad_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_schedule_id uuid REFERENCES ad_schedules(id) ON DELETE CASCADE,
  advertisement_id uuid REFERENCES advertisements(id) ON DELETE CASCADE,
  position integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create ad_plays table
CREATE TABLE ad_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id uuid REFERENCES advertisements(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  played_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_plays ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read advertisements"
  ON advertisements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert advertisements"
  ON advertisements FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update advertisements"
  ON advertisements FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete advertisements"
  ON advertisements FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read ad_schedules"
  ON ad_schedules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert ad_schedules"
  ON ad_schedules FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update ad_schedules"
  ON ad_schedules FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete ad_schedules"
  ON ad_schedules FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read ad_slots"
  ON ad_slots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert ad_slots"
  ON ad_slots FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update ad_slots"
  ON ad_slots FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete ad_slots"
  ON ad_slots FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read ad_plays"
  ON ad_plays FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert ad_plays"
  ON ad_plays FOR INSERT TO authenticated WITH CHECK (true);