/*
  # Fix Commercial Schedules RLS Policy

  1. Security Changes
    - Drop the existing incorrect RLS policy that references non-existent `store_users` table
    - Create new RLS policy that correctly references `store_permissions` table
    - Ensure users with appropriate store permissions can schedule commercials

  The existing policy was referencing a `store_users` table that doesn't exist in the schema.
  The correct table is `store_permissions` which manages user permissions for stores.
*/

-- Drop the existing incorrect policy
DROP POLICY IF EXISTS "Allow insert for store managers" ON commercial_schedules;

-- Create the correct policy using store_permissions table
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