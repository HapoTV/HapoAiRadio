/*
  # Add audit logging for store deletions
  
  1. New Tables
    - `store_audit_logs`
      - `id` (uuid, primary key)
      - `action` (text)
      - `store_id` (uuid)
      - `store_data` (jsonb) - Stores the full store data before deletion
      - `performed_by` (uuid) - References auth.users
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on audit logs table
    - Add policies for authenticated users
*/

-- Create audit logs table
CREATE TABLE IF NOT EXISTS store_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  store_id uuid NOT NULL,
  store_data jsonb NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE store_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to insert audit logs"
  ON store_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read audit logs"
  ON store_audit_logs
  FOR SELECT
  TO authenticated
  USING (true);