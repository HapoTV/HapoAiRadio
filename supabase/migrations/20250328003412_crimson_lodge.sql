/*
  # Search Optimization

  1. New Functions and Indexes
    - Add text search capabilities to tracks, playlists, and stores
    - Create indexes for improved search performance
    - Add functions for search suggestions and analytics

  2. Search Analytics
    - Create table for tracking search metrics
    - Add triggers for automatic analytics updates

  3. Security
    - Enable RLS for new tables
    - Add appropriate policies
*/

-- Enable the pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create search indexes
CREATE INDEX IF NOT EXISTS idx_tracks_title_trgm ON tracks USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tracks_artist_trgm ON tracks USING gin (artist gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_playlists_name_trgm ON playlists USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_stores_name_trgm ON stores USING gin (name gin_trgm_ops);

-- Create search_analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  result_count integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL,
  selected_result_id text,
  selected_result_type text,
  created_at timestamptz DEFAULT now()
);

-- Create search_suggestions table
CREATE TABLE IF NOT EXISTS search_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  weight integer NOT NULL DEFAULT 1,
  last_used timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create unique index on query to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_suggestions_query ON search_suggestions (lower(query));

-- Create function to update search suggestions
CREATE OR REPLACE FUNCTION update_search_suggestions()
RETURNS trigger AS $$
BEGIN
  INSERT INTO search_suggestions (query, weight)
  VALUES (NEW.query, 1)
  ON CONFLICT (lower(query))
  DO UPDATE SET
    weight = search_suggestions.weight + 1,
    last_used = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update search suggestions
CREATE TRIGGER update_search_suggestions_trigger
AFTER INSERT ON search_analytics
FOR EACH ROW
EXECUTE FUNCTION update_search_suggestions();

-- Enable RLS
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own search analytics"
ON search_analytics FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own search analytics"
ON search_analytics FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Everyone can read search suggestions"
ON search_suggestions FOR SELECT TO authenticated
USING (true);

-- Create function to clean up old search analytics
CREATE OR REPLACE FUNCTION cleanup_old_search_analytics()
RETURNS void AS $$
BEGIN
  DELETE FROM search_analytics
  WHERE created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for search metrics
CREATE MATERIALIZED VIEW search_metrics AS
SELECT
  date_trunc('hour', created_at) as time_bucket,
  count(*) as total_searches,
  avg(duration_ms) as avg_duration,
  count(NULLIF(result_count, 0)) as searches_with_results,
  count(selected_result_id) as searches_with_selection
FROM search_analytics
WHERE created_at > now() - interval '7 days'
GROUP BY date_trunc('hour', created_at)
ORDER BY date_trunc('hour', created_at) DESC;

-- Create index on the materialized view
CREATE UNIQUE INDEX ON search_metrics (time_bucket);

-- Create function to refresh search metrics
CREATE OR REPLACE FUNCTION refresh_search_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY search_metrics;
END;
$$ LANGUAGE plpgsql;