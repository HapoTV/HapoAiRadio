-- Enable RLS on store_analytics if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'store_analytics' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE store_analytics ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Enable RLS on playlist_analytics if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'playlist_analytics' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE playlist_analytics ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies for store_analytics
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'store_analytics' 
    AND policyname = 'Allow authenticated users to read store analytics'
  ) THEN
    CREATE POLICY "Allow authenticated users to read store analytics"
      ON store_analytics FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'store_analytics' 
    AND policyname = 'Allow authenticated users to insert store analytics'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert store analytics"
      ON store_analytics FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'store_analytics' 
    AND policyname = 'Allow authenticated users to update store analytics'
  ) THEN
    CREATE POLICY "Allow authenticated users to update store analytics"
      ON store_analytics FOR UPDATE TO authenticated
      USING (true);
  END IF;
END $$;

-- Create policies for playlist_analytics
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'playlist_analytics' 
    AND policyname = 'Allow authenticated users to read playlist analytics'
  ) THEN
    CREATE POLICY "Allow authenticated users to read playlist analytics"
      ON playlist_analytics FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'playlist_analytics' 
    AND policyname = 'Allow authenticated users to insert playlist analytics'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert playlist analytics"
      ON playlist_analytics FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'playlist_analytics' 
    AND policyname = 'Allow authenticated users to update playlist analytics'
  ) THEN
    CREATE POLICY "Allow authenticated users to update playlist analytics"
      ON playlist_analytics FOR UPDATE TO authenticated
      USING (true);
  END IF;
END $$;