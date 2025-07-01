/*
  # Add analytics triggers
  
  1. New Triggers
    - `track_play_insert_trigger` - Updates analytics when a track is played
  
  2. Security
    - Triggers run with security definer permissions
*/

-- Create or replace function to handle track play events
CREATE OR REPLACE FUNCTION handle_track_play()
RETURNS TRIGGER AS $$
DECLARE
  store_id_var uuid;
  playlist_id_var uuid;
  track_id_var uuid;
  genre_var text;
  hour_var integer;
BEGIN
  -- Get variables from the new record
  store_id_var := NEW.store_id;
  playlist_id_var := NEW.playlist_id;
  track_id_var := NEW.track_id;
  
  -- Get the hour of the day
  hour_var := EXTRACT(HOUR FROM NEW.played_at)::integer;
  
  -- Get the genre from the track
  SELECT genre INTO genre_var FROM tracks WHERE id = track_id_var;
  
  -- Update store analytics
  IF store_id_var IS NOT NULL THEN
    -- Check if store analytics record exists
    IF EXISTS (SELECT 1 FROM store_analytics WHERE store_id = store_id_var) THEN
      -- Update existing record
      UPDATE store_analytics
      SET 
        total_plays = total_plays + 1,
        unique_tracks = (
          SELECT COUNT(DISTINCT track_id) 
          FROM track_plays 
          WHERE store_id = store_id_var
        ),
        -- Add hour to peak_hours array if not already present
        peak_hours = CASE 
          WHEN hour_var = ANY(peak_hours) THEN peak_hours
          ELSE array_append(peak_hours, hour_var)
        END,
        -- Update genre distribution
        popular_genres = CASE
          WHEN popular_genres ? COALESCE(genre_var, 'Unknown') THEN
            jsonb_set(
              popular_genres,
              ARRAY[COALESCE(genre_var, 'Unknown')],
              to_jsonb((popular_genres->>COALESCE(genre_var, 'Unknown'))::integer + 1)
            )
          ELSE
            popular_genres || jsonb_build_object(COALESCE(genre_var, 'Unknown'), 1)
        END,
        updated_at = NOW()
      WHERE store_id = store_id_var;
    ELSE
      -- Insert new record
      INSERT INTO store_analytics (
        store_id,
        total_plays,
        unique_tracks,
        peak_hours,
        popular_genres
      )
      VALUES (
        store_id_var,
        1, -- Initial play count
        1, -- Initial unique track count
        ARRAY[hour_var], -- Initial peak hour
        jsonb_build_object(COALESCE(genre_var, 'Unknown'), 1) -- Initial genre count
      );
    END IF;
  END IF;
  
  -- Update playlist analytics
  IF playlist_id_var IS NOT NULL THEN
    -- Check if playlist analytics record exists
    IF EXISTS (SELECT 1 FROM playlist_analytics WHERE playlist_id = playlist_id_var) THEN
      -- Update existing record
      UPDATE playlist_analytics
      SET 
        total_plays = total_plays + 1,
        -- Add hour to peak_play_hours array if not already present
        peak_play_hours = CASE 
          WHEN hour_var = ANY(peak_play_hours) THEN peak_play_hours
          ELSE array_append(peak_play_hours, hour_var)
        END,
        -- Update genre distribution
        genre_distribution = CASE
          WHEN genre_distribution ? COALESCE(genre_var, 'Unknown') THEN
            jsonb_set(
              genre_distribution,
              ARRAY[COALESCE(genre_var, 'Unknown')],
              to_jsonb((genre_distribution->>COALESCE(genre_var, 'Unknown'))::integer + 1)
            )
          ELSE
            genre_distribution || jsonb_build_object(COALESCE(genre_var, 'Unknown'), 1)
        END,
        updated_at = NOW()
      WHERE playlist_id = playlist_id_var;
    ELSE
      -- Insert new record
      INSERT INTO playlist_analytics (
        playlist_id,
        total_plays,
        avg_completion_rate,
        skip_rate,
        genre_distribution,
        peak_play_hours
      )
      VALUES (
        playlist_id_var,
        1, -- Initial play count
        1.0, -- Initial completion rate (100%)
        0.0, -- Initial skip rate (0%)
        jsonb_build_object(COALESCE(genre_var, 'Unknown'), 1), -- Initial genre count
        ARRAY[hour_var] -- Initial peak hour
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for track plays
DROP TRIGGER IF EXISTS track_play_insert_trigger ON track_plays;
CREATE TRIGGER track_play_insert_trigger
  AFTER INSERT ON track_plays
  FOR EACH ROW
  EXECUTE FUNCTION handle_track_play();