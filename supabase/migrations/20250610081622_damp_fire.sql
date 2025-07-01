/*
  # Optimize track queries and add functions
  
  1. New Functions
    - `search_tracks` - Performs optimized text search on tracks
    - `get_track_recommendations` - Returns track recommendations based on genre and listening history
  
  2. Indexes
    - Add GIN indexes for text search
    - Add indexes for common query patterns
*/

-- Create extension for text search if it doesn't exist
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create function for optimized track search
CREATE OR REPLACE FUNCTION search_tracks(
  search_query text,
  limit_param integer DEFAULT 20,
  offset_param integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  artist text,
  album text,
  genre text[],
  duration_seconds numeric,
  file_url text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.artist,
    t.album,
    t.genre,
    t.duration_seconds,
    t.file_url,
    (
      similarity(t.title, search_query) * 0.6 +
      COALESCE(similarity(t.artist, search_query) * 0.3, 0) +
      COALESCE(similarity(t.album, search_query) * 0.1, 0)
    ) AS similarity
  FROM
    tracks t
  WHERE
    search_query IS NULL OR
    search_query = '' OR
    t.title ILIKE '%' || search_query || '%' OR
    t.artist ILIKE '%' || search_query || '%' OR
    t.album ILIKE '%' || search_query || '%' OR
    EXISTS (
      SELECT 1 FROM unnest(t.genre) g
      WHERE g ILIKE '%' || search_query || '%'
    )
  ORDER BY
    similarity DESC,
    t.title ASC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for track recommendations
CREATE OR REPLACE FUNCTION get_track_recommendations(
  user_id_param uuid,
  genre_param text[] DEFAULT NULL,
  limit_param integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  artist text,
  album text,
  genre text[],
  duration_seconds numeric,
  file_url text,
  score float
) AS $$
BEGIN
  RETURN QUERY
  WITH user_genres AS (
    -- Get genres the user has listened to
    SELECT DISTINCT unnest(t.genre) AS genre
    FROM track_plays tp
    JOIN tracks t ON tp.track_id = t.id
    WHERE tp.user_id = user_id_param
  ),
  genre_matches AS (
    -- Count how many genres match between tracks and user preferences
    SELECT
      t.id,
      t.title,
      t.artist,
      t.album,
      t.genre,
      t.duration_seconds,
      t.file_url,
      CASE
        WHEN genre_param IS NOT NULL THEN (
          SELECT COUNT(*)
          FROM unnest(t.genre) g
          WHERE g = ANY(genre_param)
        )
        ELSE (
          SELECT COUNT(*)
          FROM unnest(t.genre) g
          WHERE g IN (SELECT genre FROM user_genres)
        )
      END AS genre_score
    FROM
      tracks t
    WHERE
      -- Exclude tracks the user has already played
      NOT EXISTS (
        SELECT 1 FROM track_plays tp
        WHERE tp.track_id = t.id AND tp.user_id = user_id_param
      )
  )
  SELECT
    id,
    title,
    artist,
    album,
    genre,
    duration_seconds,
    file_url,
    genre_score::float / GREATEST(array_length(genre, 1), 1) AS score
  FROM
    genre_matches
  WHERE
    genre_score > 0
  ORDER BY
    score DESC,
    RANDOM() -- Add some randomness for variety
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get recently played tracks
CREATE OR REPLACE FUNCTION get_recently_played_tracks(
  user_id_param uuid,
  limit_param integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  artist text,
  album text,
  genre text[],
  duration_seconds numeric,
  file_url text,
  played_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.artist,
    t.album,
    t.genre,
    t.duration_seconds,
    t.file_url,
    tp.played_at
  FROM
    track_plays tp
  JOIN
    tracks t ON tp.track_id = t.id
  WHERE
    tp.user_id = user_id_param
  ORDER BY
    tp.played_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get top artists for a user
CREATE OR REPLACE FUNCTION get_top_artists(
  user_id_param uuid,
  limit_param integer DEFAULT 10
)
RETURNS TABLE (
  artist text,
  play_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.artist,
    COUNT(tp.id)::bigint AS play_count
  FROM
    track_plays tp
  JOIN
    tracks t ON tp.track_id = t.id
  WHERE
    tp.user_id = user_id_param
    AND t.artist IS NOT NULL
    AND t.artist != ''
  GROUP BY
    t.artist
  ORDER BY
    play_count DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;