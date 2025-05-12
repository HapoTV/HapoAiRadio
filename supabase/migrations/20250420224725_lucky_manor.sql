/*
  # Add analytics functions
  
  1. New Functions
    - `get_top_tracks_for_playlist` - Returns the most played tracks for a playlist in a store
    - `update_store_analytics` - Updates store analytics based on track plays
    - `update_playlist_analytics` - Updates playlist analytics based on track plays
  
  2. Triggers
    - Add trigger on track_plays to update analytics
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
$$ LANGUAGE plpgsql;

-- Function to update store analytics
CREATE OR REPLACE FUNCTION update_store_analytics()
RETURNS TRIGGER AS $$
DECLARE
  store_id_var uuid;
  genre_var text;
  hour_var integer;
BEGIN
  -- Get the store ID from the new track play
  store_id_var := NEW.store_id;
  
  -- Get the hour of the day
  hour_var := EXTRACT(HOUR FROM NEW.played_at)::integer;
  
  -- Get the genre from the track
  SELECT genre INTO genre_var FROM tracks WHERE id = NEW.track_id;
  
  -- Update or insert store analytics
  INSERT INTO store_analytics (
    store_id,
    total_plays,
    unique_tracks,
    peak_hours,
    popular_genres,
    created_at,
    updated_at
  )
  VALUES (
    store_id_var,
    1, -- Initial play count
    1, -- Initial unique track count
    ARRAY[hour_var], -- Initial peak hour
    jsonb_build_object(COALESCE(genre_var, 'Unknown'), 1), -- Initial genre count
    NOW(),
    NOW()
  )
  ON CONFLICT (store_id)
  DO UPDATE SET
    total_plays = store_analytics.total_plays + 1,
    -- Add hour to peak_hours array if not already present
    peak_hours = CASE 
      WHEN hour_var = ANY(store_analytics.peak_hours) THEN store_analytics.peak_hours
      ELSE array_append(store_analytics.peak_hours, hour_var)
    END,
    -- Update genre distribution
    popular_genres = CASE
      WHEN store_analytics.popular_genres ? COALESCE(genre_var, 'Unknown') THEN
        jsonb_set(
          store_analytics.popular_genres,
          ARRAY[COALESCE(genre_var, 'Unknown')],
          to_jsonb((store_analytics.popular_genres->>COALESCE(genre_var, 'Unknown'))::integer + 1)
        )
      ELSE
        store_analytics.popular_genres || jsonb_build_object(COALESCE(genre_var, 'Unknown'), 1)
    END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update playlist analytics
CREATE OR REPLACE FUNCTION update_playlist_analytics()
RETURNS TRIGGER AS $$
DECLARE
  playlist_id_var uuid;
  genre_var text;
  hour_var integer;
BEGIN
  -- Get the playlist ID from the new track play
  playlist_id_var := NEW.playlist_id;
  
  -- If no playlist ID, exit
  IF playlist_id_var IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get the hour of the day
  hour_var := EXTRACT(HOUR FROM NEW.played_at)::integer;
  
  -- Get the genre from the track
  SELECT genre INTO genre_var FROM tracks WHERE id = NEW.track_id;
  
  -- Update or insert playlist analytics
  INSERT INTO playlist_analytics (
    playlist_id,
    total_plays,
    avg_completion_rate,
    skip_rate,
    genre_distribution,
    peak_play_hours,
    created_at,
    updated_at
  )
  VALUES (
    playlist_id_var,
    1, -- Initial play count
    1.0, -- Initial completion rate (100%)
    0.0, -- Initial skip rate (0%)
    jsonb_build_object(COALESCE(genre_var, 'Unknown'), 1), -- Initial genre count
    ARRAY[hour_var], -- Initial peak hour
    NOW(),
    NOW()
  )
  ON CONFLICT (playlist_id)
  DO UPDATE SET
    total_plays = playlist_analytics.total_plays + 1,
    -- Add hour to peak_play_hours array if not already present
    peak_play_hours = CASE 
      WHEN hour_var = ANY(playlist_analytics.peak_play_hours) THEN playlist_analytics.peak_play_hours
      ELSE array_append(playlist_analytics.peak_play_hours, hour_var)
    END,
    -- Update genre distribution
    genre_distribution = CASE
      WHEN playlist_analytics.genre_distribution ? COALESCE(genre_var, 'Unknown') THEN
        jsonb_set(
          playlist_analytics.genre_distribution,
          ARRAY[COALESCE(genre_var, 'Unknown')],
          to_jsonb((playlist_analytics.genre_distribution->>COALESCE(genre_var, 'Unknown'))::integer + 1)
        )
      ELSE
        playlist_analytics.genre_distribution || jsonb_build_object(COALESCE(genre_var, 'Unknown'), 1)
    END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for track plays to update analytics
CREATE TRIGGER update_store_analytics_on_play
  AFTER INSERT ON track_plays
  FOR EACH ROW
  EXECUTE FUNCTION update_store_analytics();

CREATE TRIGGER update_playlist_analytics_on_play
  AFTER INSERT ON track_plays
  FOR EACH ROW
  EXECUTE FUNCTION update_playlist_analytics();