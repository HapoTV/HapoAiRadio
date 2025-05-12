/*
  # Add geolocation support to stores
  
  1. Changes
    - Add latitude and longitude columns to stores table
    - Add place_id for Google Places API reference
    - Add formatted_address column
    - Add spatial index for location queries
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS latitude numeric(10,8),
ADD COLUMN IF NOT EXISTS longitude numeric(11,8),
ADD COLUMN IF NOT EXISTS place_id text,
ADD COLUMN IF NOT EXISTS formatted_address text;

-- Create index for spatial queries
CREATE INDEX IF NOT EXISTS idx_stores_location 
ON stores USING btree (latitude, longitude);

-- Add constraint to ensure valid coordinates
ALTER TABLE stores
ADD CONSTRAINT valid_latitude 
  CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
ADD CONSTRAINT valid_longitude 
  CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));