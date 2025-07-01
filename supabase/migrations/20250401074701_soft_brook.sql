/*
  # Add Commercial Playlist System (Safe Migration)
  
  1. Changes
    - Add IF NOT EXISTS to all table creation statements
    - Add IF NOT EXISTS to all index creation statements
    - Add OR REPLACE to function creation
    - Add IF NOT EXISTS to trigger creation
    - Add IF NOT EXISTS to policy creation
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create playlist_segments table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'playlist_segments') THEN
    CREATE TABLE playlist_segments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE,
      name text NOT NULL,
      songs_count integer NOT NULL DEFAULT 5,
      transition_duration integer NOT NULL DEFAULT 2,
      crossfade_enabled boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT valid_songs_count CHECK (songs_count > 0),
      CONSTRAINT valid_transition CHECK (transition_duration >= 0)
    );
  END IF;
END $$;

-- Create ad_breaks table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ad_breaks') THEN
    CREATE TABLE ad_breaks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      segment_id uuid REFERENCES playlist_segments(id) ON DELETE CASCADE,
      start_time time NOT NULL,
      end_time time NOT NULL,
      max_duration integer NOT NULL,
      buffer_time integer NOT NULL DEFAULT 3,
      priority integer NOT NULL DEFAULT 1,
      max_daily_plays integer,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT valid_times CHECK (start_time < end_time),
      CONSTRAINT valid_duration CHECK (max_duration > 0),
      CONSTRAINT valid_buffer CHECK (buffer_time >= 0),
      CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10),
      CONSTRAINT valid_max_plays CHECK (max_daily_plays IS NULL OR max_daily_plays > 0)
    );
  END IF;
END $$;

-- Create schedule_patterns table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'schedule_patterns') THEN
    CREATE TABLE schedule_patterns (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      segment_id uuid REFERENCES playlist_segments(id) ON DELETE CASCADE,
      pattern_type text NOT NULL CHECK (pattern_type IN ('daily', 'weekly', 'monthly')),
      days integer[] DEFAULT ARRAY[]::integer[],
      dates integer[] DEFAULT ARRAY[]::integer[],
      start_time time NOT NULL,
      end_time time NOT NULL,
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT valid_times CHECK (start_time < end_time)
    );
  END IF;
END $$;

-- Create emergency_overrides table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'emergency_overrides') THEN
    CREATE TABLE emergency_overrides (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      message text NOT NULL,
      priority integer NOT NULL DEFAULT 1,
      start_time timestamptz NOT NULL,
      end_time timestamptz,
      repeat_interval interval,
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10),
      CONSTRAINT valid_times CHECK (end_time IS NULL OR start_time < end_time)
    );
  END IF;
END $$;

-- Create schedule_logs table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'schedule_logs') THEN
    CREATE TABLE schedule_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      segment_id uuid REFERENCES playlist_segments(id) ON DELETE SET NULL,
      ad_break_id uuid REFERENCES ad_breaks(id) ON DELETE SET NULL,
      override_id uuid REFERENCES emergency_overrides(id) ON DELETE SET NULL,
      event_type text NOT NULL CHECK (event_type IN ('segment_start', 'segment_end', 'ad_start', 'ad_end', 'override', 'error')),
      event_data jsonb,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_playlist_segments_playlist') THEN
    CREATE INDEX idx_playlist_segments_playlist ON playlist_segments(playlist_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ad_breaks_segment') THEN
    CREATE INDEX idx_ad_breaks_segment ON ad_breaks(segment_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_schedule_patterns_segment') THEN
    CREATE INDEX idx_schedule_patterns_segment ON schedule_patterns(segment_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_schedule_logs_timestamp') THEN
    CREATE INDEX idx_schedule_logs_timestamp ON schedule_logs(created_at);
  END IF;
END $$;

-- Enable RLS
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'playlist_segments' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE playlist_segments ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'ad_breaks' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE ad_breaks ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'schedule_patterns' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE schedule_patterns ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'emergency_overrides' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE emergency_overrides ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'schedule_logs' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE schedule_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create or replace update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_playlist_segments_timestamp'
  ) THEN
    CREATE TRIGGER update_playlist_segments_timestamp
      BEFORE UPDATE ON playlist_segments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_ad_breaks_timestamp'
  ) THEN
    CREATE TRIGGER update_ad_breaks_timestamp
      BEFORE UPDATE ON ad_breaks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_schedule_patterns_timestamp'
  ) THEN
    CREATE TRIGGER update_schedule_patterns_timestamp
      BEFORE UPDATE ON schedule_patterns
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_emergency_overrides_timestamp'
  ) THEN
    CREATE TRIGGER update_emergency_overrides_timestamp
      BEFORE UPDATE ON emergency_overrides
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'playlist_segments' 
    AND policyname = 'Allow authenticated users to manage playlist segments'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage playlist segments"
      ON playlist_segments FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ad_breaks' 
    AND policyname = 'Allow authenticated users to manage ad breaks'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage ad breaks"
      ON ad_breaks FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'schedule_patterns' 
    AND policyname = 'Allow authenticated users to manage schedule patterns'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage schedule patterns"
      ON schedule_patterns FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'emergency_overrides' 
    AND policyname = 'Allow authenticated users to manage emergency overrides'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage emergency overrides"
      ON emergency_overrides FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'schedule_logs' 
    AND policyname = 'Allow authenticated users to read schedule logs'
  ) THEN
    CREATE POLICY "Allow authenticated users to read schedule logs"
      ON schedule_logs FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;