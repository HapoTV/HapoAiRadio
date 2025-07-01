/*
  # Configure RLS for commercial_schedules table
  
  1. Changes
    - Enable Row Level Security on commercial_schedules table
    - Add policy for authenticated users to read commercial schedules
    - Add policy for store managers to insert commercial schedules
    - Add policy for service role to have full access
  
  2. Security
    - Ensure proper access control based on store permissions
    - Allow service role unrestricted access for backend operations
*/

-- Enable RLS if not already enabled
ALTER TABLE commercial_schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to read commercial_schedules" ON commercial_schedules;
DROP POLICY IF EXISTS "Allow insert for store managers" ON commercial_schedules;
DROP POLICY IF EXISTS "Allow insert for backend service" ON commercial_schedules;

-- Policy for all authenticated users to read commercial schedules
CREATE POLICY "Allow authenticated users to read commercial_schedules"
ON commercial_schedules
FOR SELECT
TO authenticated
USING (true);

-- Policy for store managers to insert commercial schedules
CREATE POLICY "Allow insert for store managers"
ON commercial_schedules
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM store_permissions
    WHERE store_permissions.user_id = auth.uid()
      AND store_permissions.store_id = commercial_schedules.store_id
      AND (store_permissions.can_edit_schedules = true OR store_permissions.can_edit_playlists = true)
  )
);

-- Create index for improved query performance
CREATE INDEX IF NOT EXISTS idx_commercial_schedules_store ON commercial_schedules(store_id);

-- Add policy for service role if needed (requires superuser privileges)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'service_role'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow insert for backend service" ON commercial_schedules FOR ALL TO service_role USING (true)';
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping service_role policy creation due to insufficient privileges';
END $$;