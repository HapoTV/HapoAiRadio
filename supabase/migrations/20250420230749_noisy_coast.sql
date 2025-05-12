/*
  # Add RPC functions for analytics
  
  1. New Functions
    - get_top_tracks_for_playlist: Returns top tracks for a specific playlist in a store
    - get_playlist_analytics_by_date: Returns daily analytics for a playlist
    - get_store_playlist_summary: Returns summary of all playlists for a store
  
  2. Security
    - Functions are marked as SECURITY DEFINER to run with owner privileges
*/

-- Function to get top tracks for a playlist in a store
CREATE OR REPLACE FUNCTION get_top_tracks_for_playlist(
  playlist_id_param uuid,
  store_id_param uuid,
  limit_param integer DEFAULT 5
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
    tp.playlist_id = playlist_id_param
    AND tp.store_id = store_id_param
  GROUP BY 
    t.id, t.title, t.artist
  ORDER BY 
    play_count DESC
  LIMIT 
    limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get playlist analytics by date
CREATE OR REPLACE FUNCTION get_playlist_analytics_by_date(
  playlist_id_param uuid,
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
    tp.playlist_id = playlist_id_param
    AND tp.played_at >= start_date_param
    AND tp.played_at <= end_date_param
  GROUP BY 
    DATE(tp.played_at)
  ORDER BY 
    date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get store playlist summary
CREATE OR REPLACE FUNCTION get_store_playlist_summary(
  store_id_param uuid
)
RETURNS TABLE (
  playlist_id uuid,
  playlist_name text,
  track_count bigint,
  play_count bigint,
  last_played timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS playlist_id,
    p.name AS playlist_name,
    COUNT(DISTINCT pt.track_id)::bigint AS track_count,
    COUNT(DISTINCT tp.id)::bigint AS play_count,
    MAX(tp.played_at) AS last_played
  FROM 
    playlists p
  LEFT JOIN 
    playlist_tracks pt ON p.id = pt.playlist_id
  LEFT JOIN 
    track_plays tp ON p.id = tp.playlist_id AND tp.store_id = store_id_param
  WHERE 
    p.store_id = store_id_param
  GROUP BY 
    p.id, p.name
  ORDER BY 
    last_played DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get hourly play distribution for a playlist
CREATE OR REPLACE FUNCTION get_playlist_hourly_distribution(
  playlist_id_param uuid,
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
    tp.playlist_id = playlist_id_param
    AND tp.played_at >= start_date_param
    AND tp.played_at <= end_date_param
  GROUP BY 
    hour
  ORDER BY 
    hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;