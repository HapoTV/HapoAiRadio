import { supabase } from './supabase';
import type { Playlist } from '../types';

export async function createPlaylistRelationship(
  sourcePlaylistId: string,
  relatedPlaylistId: string,
  type: 'similar' | 'inspired' | 'store_specific' | 'auto_generated',
  metadata?: Record<string, any>
) {
  try {
    const { data, error } = await supabase
      .from('playlist_relationships')
      .insert([{
        source_playlist_id: sourcePlaylistId,
        related_playlist_id: relatedPlaylistId,
        relationship_type: type,
        metadata
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating playlist relationship:', error);
    throw error;
  }
}

export async function getRelatedPlaylists(playlistId: string) {
  try {
    const { data, error } = await supabase
      .from('playlist_relationships')
      .select(`
        relationship_type,
        relationship_strength,
        metadata,
        related_playlist:related_playlist_id (
          id,
          name,
          description,
          cover_url
        )
      `)
      .eq('source_playlist_id', playlistId)
      .order('relationship_strength', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching related playlists:', error);
    throw error;
  }
}

export async function updatePlaylistRelationship(
  sourcePlaylistId: string,
  relatedPlaylistId: string,
  updates: {
    type?: 'similar' | 'inspired' | 'store_specific' | 'auto_generated';
    metadata?: Record<string, any>;
  }
) {
  try {
    const { error } = await supabase
      .from('playlist_relationships')
      .update(updates)
      .match({ 
        source_playlist_id: sourcePlaylistId, 
        related_playlist_id: relatedPlaylistId 
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error updating playlist relationship:', error);
    throw error;
  }
}

export async function deletePlaylistRelationship(
  sourcePlaylistId: string,
  relatedPlaylistId: string
) {
  try {
    const { error } = await supabase
      .from('playlist_relationships')
      .delete()
      .match({ 
        source_playlist_id: sourcePlaylistId, 
        related_playlist_id: relatedPlaylistId 
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting playlist relationship:', error);
    throw error;
  }
}

export async function findSimilarPlaylists(playlistId: string, limit = 5) {
  try {
    const { data: tracks, error: tracksError } = await supabase
      .from('playlist_tracks')
      .select('track_id')
      .eq('playlist_id', playlistId);

    if (tracksError) throw tracksError;

    const trackIds = tracks.map(t => t.track_id);

    // Find playlists with similar tracks
    const { data: similar, error: similarError } = await supabase
      .from('playlist_tracks')
      .select(`
        playlist_id,
        playlists (
          id,
          name,
          description,
          cover_url
        ),
        count(*) as common_tracks
      `)
      .in('track_id', trackIds)
      .neq('playlist_id', playlistId)
      .groupBy('playlist_id, playlists.id')
      .order('common_tracks', { ascending: false })
      .limit(limit);

    if (similarError) throw similarError;

    return similar.map(s => ({
      ...s.playlists,
      commonTracks: s.common_tracks
    }));
  } catch (error) {
    console.error('Error finding similar playlists:', error);
    throw error;
  }
}