/*
  # Add store analytics table

  1. New Tables
    - `store_analytics`
      - `id` (uuid, primary key)
      - `store_id` (uuid, references stores)
      - `total_plays` (integer)
      - `unique_tracks` (integer)
      - `peak_hours` (integer[])
      - `popular_genres` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `store_analytics` table
    - Add policy for authenticated users to read store analytics
*/

-- Create store analytics table
CREATE TABLE IF NOT EXISTS store_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  total_plays integer DEFAULT 0,
  unique_tracks integer DEFAULT 0,
  peak_hours integer[] DEFAULT ARRAY[]::integer[],
  popular_genres jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_store_analytics_store ON store_analytics(store_id);

-- Enable RLS
ALTER TABLE store_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read store analytics"
  ON store_analytics
  FOR SELECT
  TO authenticated
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_store_analytics_timestamp
  BEFORE UPDATE ON store_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();