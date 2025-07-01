/*
  # Create Scheduling System Tables
  
  1. New Tables
    - `service_providers` - Stores information about service providers
    - `services` - Stores information about available services
    - `availabilities` - Stores provider availability windows
    - `break_times` - Stores provider break times
    - `schedule_settings` - Stores provider schedule settings
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create service_providers table if it doesn't exist
CREATE TABLE IF NOT EXISTS service_providers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Create services table if it doesn't exist
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration integer NOT NULL, -- in minutes
  price numeric NOT NULL,
  buffer_time integer DEFAULT 0, -- in minutes
  provider_id uuid REFERENCES service_providers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create availabilities table if it doesn't exist
CREATE TABLE IF NOT EXISTS availabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES service_providers(id) ON DELETE CASCADE,
  day_of_week integer, -- 0-6, where 0 is Sunday
  start_time text NOT NULL, -- HH:MM format
  end_time text NOT NULL, -- HH:MM format
  is_recurring boolean DEFAULT true,
  date text, -- YYYY-MM-DD format for non-recurring availability
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT valid_time_format CHECK (
    start_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' AND
    end_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
  ),
  CONSTRAINT valid_date_format CHECK (
    date IS NULL OR date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  ),
  CONSTRAINT valid_times CHECK (start_time < end_time),
  CONSTRAINT day_or_date CHECK (
    (is_recurring = true AND day_of_week IS NOT NULL AND date IS NULL) OR
    (is_recurring = false AND day_of_week IS NULL AND date IS NOT NULL)
  )
);

-- Create break_times table if it doesn't exist
CREATE TABLE IF NOT EXISTS break_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES service_providers(id) ON DELETE CASCADE,
  day_of_week integer, -- 0-6, where 0 is Sunday
  start_time text NOT NULL, -- HH:MM format
  end_time text NOT NULL, -- HH:MM format
  is_recurring boolean DEFAULT true,
  date text, -- YYYY-MM-DD format for non-recurring breaks
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT valid_time_format CHECK (
    start_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' AND
    end_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
  ),
  CONSTRAINT valid_date_format CHECK (
    date IS NULL OR date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  ),
  CONSTRAINT valid_times CHECK (start_time < end_time),
  CONSTRAINT day_or_date CHECK (
    (is_recurring = true AND day_of_week IS NOT NULL AND date IS NULL) OR
    (is_recurring = false AND day_of_week IS NULL AND date IS NOT NULL)
  )
);

-- Create schedule_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS schedule_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES service_providers(id) ON DELETE CASCADE,
  min_advance_time integer DEFAULT 60, -- in minutes
  max_advance_time integer DEFAULT 30, -- in days
  allow_cancellation boolean DEFAULT true,
  cancellation_time_limit integer DEFAULT 24, -- in hours
  working_hours jsonb DEFAULT '{
    "0": {"start": "09:00", "end": "17:00", "isWorkingDay": false},
    "1": {"start": "09:00", "end": "17:00", "isWorkingDay": true},
    "2": {"start": "09:00", "end": "17:00", "isWorkingDay": true},
    "3": {"start": "09:00", "end": "17:00", "isWorkingDay": true},
    "4": {"start": "09:00", "end": "17:00", "isWorkingDay": true},
    "5": {"start": "09:00", "end": "17:00", "isWorkingDay": true},
    "6": {"start": "09:00", "end": "17:00", "isWorkingDay": false}
  }'::jsonb,
  holiday_dates text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_min_advance_time CHECK (min_advance_time >= 0),
  CONSTRAINT valid_max_advance_time CHECK (max_advance_time > 0),
  CONSTRAINT valid_cancellation_time_limit CHECK (cancellation_time_limit > 0)
);

-- Enable RLS on all tables
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_settings ENABLE ROW LEVEL SECURITY;

-- Create policies - using IF NOT EXISTS to avoid errors
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_providers' 
    AND policyname = 'Allow users to view service providers'
  ) THEN
    CREATE POLICY "Allow users to view service providers"
      ON service_providers FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'services' 
    AND policyname = 'Allow users to view services'
  ) THEN
    CREATE POLICY "Allow users to view services"
      ON services FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'availabilities' 
    AND policyname = 'Allow users to view availabilities'
  ) THEN
    CREATE POLICY "Allow users to view availabilities"
      ON availabilities FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'break_times' 
    AND policyname = 'Allow providers to view their break times'
  ) THEN
    CREATE POLICY "Allow providers to view their break times"
      ON break_times FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'schedule_settings' 
    AND policyname = 'Allow providers to view their schedule settings'
  ) THEN
    CREATE POLICY "Allow providers to view their schedule settings"
      ON schedule_settings FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Note: Sample data inserts have been removed to avoid foreign key constraint violations
-- Users need to be created in auth.users table before service_providers can be inserted