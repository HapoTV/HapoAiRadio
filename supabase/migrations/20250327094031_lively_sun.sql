/*
  # Update stores table with new fields
  
  1. Changes
    - Add IP address column
    - Add payment status column
    - Add constraints for IP format and status values
  
  2. Security
    - Maintain existing RLS policies
    - Add validation for new fields
*/

-- Add new columns to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS ip_address text,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'inactive' CHECK (payment_status IN ('active', 'suspended', 'inactive'));

-- Add constraint for IP address format
ALTER TABLE stores
ADD CONSTRAINT valid_ip_address 
  CHECK (
    ip_address IS NULL OR 
    ip_address ~ '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$'
  );

-- Update existing rows to have 'inactive' status
UPDATE stores 
SET payment_status = 'inactive' 
WHERE payment_status IS NULL;