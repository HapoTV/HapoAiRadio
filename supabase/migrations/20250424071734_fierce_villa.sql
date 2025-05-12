/*
  # Add advertisement tables if they don't exist
  
  1. Changes
    - Create advertisements table if it doesn't exist
    - Create ad_schedules table if it doesn't exist
    - Create ad_slots table if it doesn't exist
    - Create ad_plays table if it doesn't exist
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create advertisements table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'advertisements') THEN
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
  END IF;
END $$;

-- Create ad_schedules table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ad_schedules') THEN
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
  END IF;
END $$;

-- Create ad_slots table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ad_slots') THEN
    CREATE TABLE ad_slots (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ad_schedule_id uuid REFERENCES ad_schedules(id) ON DELETE CASCADE,
      advertisement_id uuid REFERENCES advertisements(id) ON DELETE CASCADE,
      position integer NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Create ad_plays table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ad_plays') THEN
    CREATE TABLE ad_plays (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      advertisement_id uuid REFERENCES advertisements(id) ON DELETE CASCADE,
      store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
      played_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_plays ENABLE ROW LEVEL SECURITY;

-- Create policies for advertisements
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'advertisements' 
    AND policyname = 'Allow authenticated users to read advertisements'
  ) THEN
    CREATE POLICY "Allow authenticated users to read advertisements"
      ON advertisements FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'advertisements' 
    AND policyname = 'Allow authenticated users to insert advertisements'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert advertisements"
      ON advertisements FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'advertisements' 
    AND policyname = 'Allow authenticated users to update advertisements'
  ) THEN
    CREATE POLICY "Allow authenticated users to update advertisements"
      ON advertisements FOR UPDATE TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'advertisements' 
    AND policyname = 'Allow authenticated users to delete advertisements'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete advertisements"
      ON advertisements FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- Create policies for ad_schedules
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ad_schedules' 
    AND policyname = 'Allow authenticated users to read ad_schedules'
  ) THEN
    CREATE POLICY "Allow authenticated users to read ad_schedules"
      ON ad_schedules FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ad_schedules' 
    AND policyname = 'Allow authenticated users to insert ad_schedules'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert ad_schedules"
      ON ad_schedules FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ad_schedules' 
    AND policyname = 'Allow authenticated users to update ad_schedules'
  ) THEN
    CREATE POLICY "Allow authenticated users to update ad_schedules"
      ON ad_schedules FOR UPDATE TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ad_schedules' 
    AND policyname = 'Allow authenticated users to delete ad_schedules'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete ad_schedules"
      ON ad_schedules FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- Create policies for ad_slots
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ad_slots' 
    AND policyname = 'Allow authenticated users to read ad_slots'
  ) THEN
    CREATE POLICY "Allow authenticated users to read ad_slots"
      ON ad_slots FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ad_slots' 
    AND policyname = 'Allow authenticated users to insert ad_slots'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert ad_slots"
      ON ad_slots FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ad_slots' 
    AND policyname = 'Allow authenticated users to update ad_slots'
  ) THEN
    CREATE POLICY "Allow authenticated users to update ad_slots"
      ON ad_slots FOR UPDATE TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ad_slots' 
    AND policyname = 'Allow authenticated users to delete ad_slots'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete ad_slots"
      ON ad_slots FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- Create policies for ad_plays
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ad_plays' 
    AND policyname = 'Allow authenticated users to read ad_plays'
  ) THEN
    CREATE POLICY "Allow authenticated users to read ad_plays"
      ON ad_plays FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ad_plays' 
    AND policyname = 'Allow authenticated users to insert ad_plays'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert ad_plays"
      ON ad_plays FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;