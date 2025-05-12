/*
  # Fix store_analytics table
  
  1. Changes
    - Add unique constraint on store_id to prevent duplicates
    - Add proper indexes for performance
    - Update trigger to handle edge cases
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add unique constraint on store_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'store_analytics_store_id_key' 
    AND conrelid = 'store_analytics'::regclass
  ) THEN
    ALTER TABLE store_analytics ADD CONSTRAINT store_analytics_store_id_key UNIQUE (store_id);
  END IF;
END $$;

-- Add unique constraint on playlist_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'playlist_analytics_playlist_id_key' 
    AND conrelid = 'playlist_analytics'::regclass
  ) THEN
    ALTER TABLE playlist_analytics ADD CONSTRAINT playlist_analytics_playlist_id_key UNIQUE (playlist_id);
  END IF;
END $$;

-- Improve the handle_track_play function to better handle edge cases
CREATE OR REPLACE FUNCTION handle_track_play()
RETURNS TRIGGER AS $$
DECLARE
  store_id_var uuid;
  playlist_id_var uuid;
  track_id_var uuid;
  genre_var text;
  hour_var integer;
  unique_tracks_count integer;
BEGIN
  -- Get variables from the new record
  store_id_var := NEW.store_id;
  playlist_id_var := NEW.playlist_id;
  track_id_var := NEW.track_id;
  
  -- Get the hour of the day
  hour_var := EXTRACT(HOUR FROM NEW.played_at)::integer;
  
  -- Get the genre from the track
  SELECT genre INTO genre_var FROM tracks WHERE id = track_id_var;
  
  -- Count unique tracks for this store
  SELECT COUNT(DISTINCT track_id) INTO unique_tracks_count
  FROM track_plays 
  WHERE store_id = store_id_var;
  
  -- Update store analytics
  IF store_id_var IS NOT NULL THEN
    -- Insert or update store analytics
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
      unique_tracks_count, -- Count of unique tracks
      ARRAY[hour_var], -- Initial peak hour
      jsonb_build_object(COALESCE(genre_var, 'Unknown'), 1), -- Initial genre count
      NOW(),
      NOW()
    )
    ON CONFLICT (store_id)
    DO UPDATE SET
      total_plays = store_analytics.total_plays + 1,
      unique_tracks = unique_tracks_count,
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
  END IF;
  
  -- Update playlist analytics
  IF playlist_id_var IS NOT NULL THEN
    -- Insert or update playlist analytics
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;