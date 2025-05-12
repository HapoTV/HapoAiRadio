/*
  # Add RPC functions for analytics
  
  1. New Functions
    - `get_top_tracks_for_store` - Returns the most played tracks for a store
    - `get_top_tracks_for_playlist` - Returns the most played tracks for a playlist
    - `get_store_analytics_by_date` - Returns analytics for a store by date range
  
  2. Security
    - Functions are accessible to authenticated users
*/

-- Function to get top tracks for a store
CREATE OR REPLACE FUNCTION get_top_tracks_for_store(
  store_id_param uuid,
  limit_param integer DEFAULT 10
)
RETURNS TABLE (
  track_id uuid,
  title text,
  artist text,
  play_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id AS track_id,
    t.title,
    t.artist,
    COUNT(tp.id)::bigint AS play_count
  FROM 
    track_plays tp
  JOIN 
    tracks t ON tp.track_id = t.id
  WHERE 
    tp.store_id = store_id_param
  GROUP BY 
    t.id, t.title, t.artist
  ORDER BY 
    play_count DESC
  LIMIT 
    limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get store analytics by date range
CREATE OR REPLACE FUNCTION get_store_analytics_by_date(
  store_id_param uuid,
  start_date_param timestamptz,
  end_date_param timestamptz
)
RETURNS TABLE (
  date date,
  total_plays bigint,
  unique_tracks bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(tp.played_at) AS date,
    COUNT(tp.id)::bigint AS total_plays,
    COUNT(DISTINCT tp.track_id)::bigint AS unique_tracks
  FROM 
    track_plays tp
  WHERE 
    tp.store_id = store_id_param
    AND tp.played_at >= start_date_param
    AND tp.played_at <= end_date_param
  GROUP BY 
    DATE(tp.played_at)
  ORDER BY 
    date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get hourly play distribution for a store
CREATE OR REPLACE FUNCTION get_store_hourly_distribution(
  store_id_param uuid,
  start_date_param timestamptz,
  end_date_param timestamptz
)
RETURNS TABLE (
  hour integer,
  play_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM tp.played_at)::integer AS hour,
    COUNT(tp.id)::bigint AS play_count
  FROM 
    track_plays tp
  WHERE 
    tp.store_id = store_id_param
    AND tp.played_at >= start_date_param
    AND tp.played_at <= end_date_param
  GROUP BY 
    hour
  ORDER BY 
    hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get genre distribution for a store
CREATE OR REPLACE FUNCTION get_store_genre_distribution(
  store_id_param uuid,
  start_date_param timestamptz,
  end_date_param timestamptz
)
RETURNS TABLE (
  genre text,
  play_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(t.genre, 'Unknown') AS genre,
    COUNT(tp.id)::bigint AS play_count
  FROM 
    track_plays tp
  JOIN 
    tracks t ON tp.track_id = t.id
  WHERE 
    tp.store_id = store_id_param
    AND tp.played_at >= start_date_param
    AND tp.played_at <= end_date_param
  GROUP BY 
    genre
  ORDER BY 
    play_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;