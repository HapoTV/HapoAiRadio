/*
  # Add Subscriber Management Tables

  1. New Tables
    - `subscribers`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `subscription_type` (text)
      - `subscription_status` (text)
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `last_login` (timestamptz)
      - `total_listening_hours` (numeric)
      - `favorite_genres` (text[])
      - `created_at` (timestamptz)

    - `listening_stats`
      - `id` (uuid, primary key)
      - `subscriber_id` (uuid, references subscribers)
      - `date` (date)
      - `hours` (numeric)
      - `peak_hour` (integer)

    - `content_engagement`
      - `id` (uuid, primary key)
      - `subscriber_id` (uuid, references subscribers)
      - `content_type` (text)
      - `content_id` (uuid)
      - `play_count` (integer)
      - `total_duration` (numeric)
      - `last_played` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create subscribers table
CREATE TABLE public.subscribers (
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

-- Create listening_stats table
CREATE TABLE public.listening_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES public.subscribers(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours numeric NOT NULL CHECK (hours >= 0),
  peak_hour integer CHECK (peak_hour >= 0 AND peak_hour < 24),
  UNIQUE (subscriber_id, date)
);

-- Create content_engagement table
CREATE TABLE public.content_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES public.subscribers(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('playlist', 'podcast', 'interview')),
  content_id uuid NOT NULL,
  play_count integer NOT NULL DEFAULT 0,
  total_duration numeric NOT NULL DEFAULT 0,
  last_played timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_subscribers_user_id ON public.subscribers(user_id);
CREATE INDEX idx_subscribers_subscription_status ON public.subscribers(subscription_status);
CREATE INDEX idx_listening_stats_date ON public.listening_stats(date);
CREATE INDEX idx_content_engagement_content ON public.content_engagement(content_type, content_id);

-- Enable RLS
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_engagement ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own subscriber data"
ON public.subscribers FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own listening stats"
ON public.listening_stats FOR SELECT TO authenticated
USING (
  subscriber_id IN (
    SELECT id FROM public.subscribers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own content engagement"
ON public.content_engagement FOR SELECT TO authenticated
USING (
  subscriber_id IN (
    SELECT id FROM public.subscribers WHERE user_id = auth.uid()
  )
);

-- Create view for subscriber metrics
CREATE VIEW subscriber_metrics AS
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

-- Create function to update listening hours
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

-- Create trigger for updating listening hours
CREATE TRIGGER update_listening_hours_trigger
AFTER INSERT OR UPDATE ON public.listening_stats
FOR EACH ROW
EXECUTE FUNCTION update_subscriber_listening_hours();