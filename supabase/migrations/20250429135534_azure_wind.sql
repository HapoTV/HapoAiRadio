/*
  # Add player sessions and emergency queue tables
  
  1. New Tables
    - `player_sessions`
      - Stores the current playback state for each store
      - Tracks current track, status, and timestamp
    
    - `emergency_queue`
      - Stores emergency broadcasts that override normal playback
      - Includes priority, message, and timing information
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create player_sessions table
CREATE TABLE IF NOT EXISTS player_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  current_track_id uuid REFERENCES tracks(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('playing', 'paused', 'stopped', 'loading')),
  volume integer NOT NULL DEFAULT 100 CHECK (volume >= 0 AND volume <= 100),
  is_muted boolean NOT NULL DEFAULT false,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_store_session UNIQUE (store_id)
);

-- Create emergency_queue table
CREATE TABLE IF NOT EXISTS emergency_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  message text NOT NULL,
  audio_url text,
  priority integer NOT NULL DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_times CHECK (end_time IS NULL OR start_time < end_time)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_player_sessions_store ON player_sessions(store_id);
CREATE INDEX IF NOT EXISTS idx_emergency_queue_store ON emergency_queue(store_id);
CREATE INDEX IF NOT EXISTS idx_emergency_queue_active ON emergency_queue(is_active, start_time);

-- Enable RLS
ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_queue ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to manage player sessions"
  ON player_sessions FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage emergency queue"
  ON emergency_queue FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to broadcast player session updates
CREATE OR REPLACE FUNCTION broadcast_player_session_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Broadcast the update to the store-specific channel
  PERFORM pg_notify(
    'store_player_' || NEW.store_id::text,
    json_build_object(
      'store_id', NEW.store_id,
      'current_track_id', NEW.current_track_id,
      'status', NEW.status,
      'volume', NEW.volume,
      'is_muted', NEW.is_muted,
      'timestamp', NEW.last_updated
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for broadcasting player session updates
CREATE TRIGGER broadcast_player_session_update_trigger
  AFTER INSERT OR UPDATE ON player_sessions
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_player_session_update();

-- Create function to check for active emergency broadcasts
CREATE OR REPLACE FUNCTION check_emergency_broadcasts(store_id_param uuid)
RETURNS TABLE (
  id uuid,
  message text,
  audio_url text,
  priority integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    eq.id,
    eq.message,
    eq.audio_url,
    eq.priority
  FROM
    emergency_queue eq
  WHERE
    eq.store_id = store_id_param
    AND eq.is_active = true
    AND eq.start_time <= now()
    AND (eq.end_time IS NULL OR eq.end_time > now())
  ORDER BY
    eq.priority DESC, eq.start_time ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;