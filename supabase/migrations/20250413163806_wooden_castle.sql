/*
  # Message Queue System
  
  1. New Tables
    - `message_queues`
      - Stores queue configuration and metadata
    - `queue_messages`
      - Stores actual messages with status and retry info
    - `dead_letter_queue`
      - Stores failed messages after max retries
    - `queue_metrics`
      - Stores performance metrics and monitoring data
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create message_queues table
CREATE TABLE message_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  max_size integer NOT NULL DEFAULT 10000,
  message_timeout_seconds integer NOT NULL DEFAULT 30,
  max_retries integer NOT NULL DEFAULT 3,
  consumer_count integer NOT NULL DEFAULT 1,
  auto_scale_threshold integer NOT NULL DEFAULT 1000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_timeout CHECK (message_timeout_seconds > 0),
  CONSTRAINT valid_retries CHECK (max_retries >= 0),
  CONSTRAINT valid_consumers CHECK (consumer_count > 0),
  CONSTRAINT valid_size CHECK (max_size > 0),
  CONSTRAINT valid_threshold CHECK (auto_scale_threshold > 0)
);

-- Create queue_messages table
CREATE TABLE queue_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid REFERENCES message_queues(id) ON DELETE CASCADE,
  message jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority integer NOT NULL DEFAULT 0,
  retry_count integer NOT NULL DEFAULT 0,
  visible_after timestamptz DEFAULT now(),
  processing_started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  consumer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0)
);

-- Create dead_letter_queue table
CREATE TABLE dead_letter_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_message_id uuid REFERENCES queue_messages(id) ON DELETE SET NULL,
  queue_id uuid REFERENCES message_queues(id) ON DELETE CASCADE,
  message jsonb NOT NULL,
  error_message text NOT NULL,
  retry_count integer NOT NULL,
  last_retry_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create queue_metrics table
CREATE TABLE queue_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid REFERENCES message_queues(id) ON DELETE CASCADE,
  total_messages integer NOT NULL DEFAULT 0,
  processed_messages integer NOT NULL DEFAULT 0,
  failed_messages integer NOT NULL DEFAULT 0,
  avg_processing_time numeric NOT NULL DEFAULT 0,
  current_length integer NOT NULL DEFAULT 0,
  consumer_count integer NOT NULL DEFAULT 0,
  timestamp timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_queue_messages_status ON queue_messages(status, visible_after);
CREATE INDEX idx_queue_messages_queue ON queue_messages(queue_id);
CREATE INDEX idx_dead_letter_queue_queue ON dead_letter_queue(queue_id);
CREATE INDEX idx_queue_metrics_queue ON queue_metrics(queue_id);
CREATE INDEX idx_queue_metrics_timestamp ON queue_metrics(timestamp);

-- Enable RLS
ALTER TABLE message_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to manage queues"
  ON message_queues FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage messages"
  ON queue_messages FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read dead letter queue"
  ON dead_letter_queue FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read metrics"
  ON queue_metrics FOR SELECT TO authenticated
  USING (true);

-- Create function to update queue metrics
CREATE OR REPLACE FUNCTION update_queue_metrics()
RETURNS trigger AS $$
BEGIN
  INSERT INTO queue_metrics (
    queue_id,
    total_messages,
    processed_messages,
    failed_messages,
    current_length,
    avg_processing_time
  )
  SELECT
    NEW.queue_id,
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COUNT(*) FILTER (WHERE status IN ('pending', 'processing')),
    EXTRACT(epoch FROM AVG(
      CASE 
        WHEN status = 'completed' 
        THEN completed_at - processing_started_at 
      END
    ))
  FROM queue_messages
  WHERE queue_id = NEW.queue_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for metrics updates
CREATE TRIGGER update_queue_metrics_trigger
  AFTER INSERT OR UPDATE ON queue_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_queue_metrics();