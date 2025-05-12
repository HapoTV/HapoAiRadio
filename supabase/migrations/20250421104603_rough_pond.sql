/*
  # Fix track analytics queries
  
  1. Changes
    - Create proper RPC functions for track analytics that handle GROUP BY correctly
    - Fix the SQL aggregation error with track_id and count
    - Provide backward compatibility for existing code
  
  2. Security
    - Functions are marked as SECURITY DEFINER to run with owner privileges
    - Maintain existing RLS policies
*/

-- Create or replace function to get top tracks for a store with proper aggregation
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
    tp.track_id,
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
    tp.track_id, t.title, t.artist
  ORDER BY 
    play_count DESC
  LIMIT 
    limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to get top tracks for a playlist with proper aggregation
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
    tp.track_id,
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
    tp.track_id, t.title, t.artist
  ORDER BY 
    play_count DESC
  LIMIT 
    limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to get playlist analytics by date with proper aggregation
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

-- Create or replace function to get store playlist summary with proper aggregation
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