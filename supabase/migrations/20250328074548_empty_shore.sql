/*
  # Add store reference to playlists table
  
  1. Changes
    - Add store_id column to playlists table
    - Add foreign key constraint to stores table
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add store_id column to playlists table
ALTER TABLE playlists
ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES stores(id) ON DELETE SET NULL;

-- Create index for store_id
CREATE INDEX IF NOT EXISTS idx_playlists_store_id ON playlists(store_id);