/*
  # Add Subscriber Management Tables

  1. Changes
    - Add IF NOT EXISTS to all table creation statements
    - Add IF NOT EXISTS to all index creation statements
    - Add OR REPLACE to function creation
    - Add IF NOT EXISTS to trigger creation
    - Add IF NOT EXISTS to policy creation
    - Add IF NOT EXISTS to view creation

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users

  Note: This migration is designed to be idempotent and safe to run multiple times
*/

-- Create subscribers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_type text NOT NULL CHECK (subscription_type IN ('basic', 'premium', 'family')),
  subscription_status text NOT NULL CHECK (subscription_status IN ('active', 'expired', 'cancelled')),
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  last_login timestamptz,
  total_listening_hours numeric DEFAULT 0,
  favorite_genres text[],
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_subscription_dates CHECK (end_date IS NULL OR end_date > start_date)
);

-- Create listening_stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.listening_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES public.subscribers(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours numeric NOT NULL CHECK (hours >= 0),
  peak_hour integer CHECK (peak_hour >= 0 AND peak_hour < 24),
  UNIQUE (subscriber_id, date)
);

-- Create content_engagement table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.content_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES public.subscribers(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('playlist', 'podcast', 'interview')),
  content_id uuid NOT NULL,
  play_count integer NOT NULL DEFAULT 0,
  total_duration numeric NOT NULL DEFAULT 0,
  last_played timestamptz DEFAULT now()
);

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscribers_user_id') THEN
    CREATE INDEX idx_subscribers_user_id ON public.subscribers(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscribers_subscription_status') THEN
    CREATE INDEX idx_subscribers_subscription_status ON public.subscribers(subscription_status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_listening_stats_date') THEN
    CREATE INDEX idx_listening_stats_date ON public.listening_stats(date);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_content_engagement_content') THEN
    CREATE INDEX idx_content_engagement_content ON public.content_engagement(content_type, content_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_engagement ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscribers' 
    AND policyname = 'Users can view their own subscriber data'
  ) THEN
    CREATE POLICY "Users can view their own subscriber data"
      ON public.subscribers FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'listening_stats' 
    AND policyname = 'Users can view their own listening stats'
  ) THEN
    CREATE POLICY "Users can view their own listening stats"
      ON public.listening_stats FOR SELECT TO authenticated
      USING (
        subscriber_id IN (
          SELECT id FROM public.subscribers WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'content_engagement' 
    AND policyname = 'Users can view their own content engagement'
  ) THEN
    CREATE POLICY "Users can view their own content engagement"
      ON public.content_engagement FOR SELECT TO authenticated
      USING (
        subscriber_id IN (
          SELECT id FROM public.subscribers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create or replace view for subscriber metrics
CREATE OR REPLACE VIEW subscriber_metrics AS
SELECT
  COUNT(*) as total_subscribers,
  COUNT(*) FILTER (WHERE subscription_status = 'active') as active_subscribers,
  ROUND(
    (COUNT(*) FILTER (WHERE subscription_status = 'cancelled')::numeric / 
    NULLIF(COUNT(*), 0)::numeric) * 100,
    2
  ) as churn_rate,
  ROUND(AVG(total_listening_hours), 2) as average_listening_hours,
  subscription_type,
  COUNT(*) as type_count
FROM public.subscribers
GROUP BY subscription_type;

-- Create or replace function to update listening hours
CREATE OR REPLACE FUNCTION update_subscriber_listening_hours()
RETURNS trigger AS $$
BEGIN
  UPDATE public.subscribers
  SET total_listening_hours = (
    SELECT COALESCE(SUM(hours), 0)
    FROM public.listening_stats
    WHERE subscriber_id = NEW.subscriber_id
  )
  WHERE id = NEW.subscriber_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_listening_hours_trigger'
  ) THEN
    CREATE TRIGGER update_listening_hours_trigger
      AFTER INSERT OR UPDATE ON public.listening_stats
      FOR EACH ROW
      EXECUTE FUNCTION update_subscriber_listening_hours();
  END IF;
END $$;