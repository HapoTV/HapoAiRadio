import { supabase } from './supabase';
import type { Track } from '../types';

interface PlayerState {
  storeId: string;
  currentTrackId: string | null;
  status: 'playing' | 'paused' | 'stopped' | 'loading';
  volume: number;
  isMuted: boolean;
  timestamp: string;
}

export async function syncPlayerState(state: PlayerState): Promise<void> {
  try {
    const { error } = await supabase
      .from('player_sessions')
      .upsert({
        store_id: state.storeId,
        current_track_id: state.currentTrackId,
        status: state.status,
        volume: state.volume,
        is_muted: state.isMuted,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'store_id'
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error syncing player state:', error);
    throw error;
  }
}

export function subscribeToPlayerCommands(
  storeId: string,
  onCommand: (command: string, payload: any) => void
): () => void {
  const channel = supabase
    .channel(`store_player_${storeId}`)
    .on('broadcast', { event: 'command' }, (payload) => {
      onCommand(payload.payload.command, payload.payload.payload);
    })
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

export async function sendPlayerCommand(
  storeId: string,
  command: string,
  payload: any = {}
): Promise<void> {
  try {
    await supabase
      .channel(`store_player_${storeId}`)
      .send({
        type: 'broadcast',
        event: 'command',
        payload: {
          command,
          payload
        }
      });
  } catch (error) {
    console.error('Error sending player command:', error);
    throw error;
  }
}

export async function getPlayerState(storeId: string): Promise<PlayerState | null> {
  try {
    const { data, error } = await supabase
      .from('player_sessions')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return null;
      }
      throw error;
    }

    return {
      storeId: data.store_id,
      currentTrackId: data.current_track_id,
      status: data.status,
      volume: data.volume,
      isMuted: data.is_muted,
      timestamp: data.last_updated
    };
  } catch (error) {
    console.error('Error getting player state:', error);
    throw error;
  }
}

export async function checkEmergencyBroadcasts(storeId: string): Promise<{
  hasEmergency: boolean;
  message?: string;
  audioUrl?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('emergency_queue')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .lte('start_time', new Date().toISOString())
      .or(`end_time.is.null,end_time.gt.${new Date().toISOString()}`)
      .order('priority', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        hasEmergency: true,
        message: data[0].message,
        audioUrl: data[0].audio_url
      };
    }

    return { hasEmergency: false };
  } catch (error) {
    console.error('Error checking emergency broadcasts:', error);
    return { hasEmergency: false };
  }
}

export async function createEmergencyBroadcast(
  storeId: string,
  message: string,
  audioUrl?: string,
  priority: number = 10
): Promise<void> {
  try {
    const { error } = await supabase
      .from('emergency_queue')
      .insert([{
        store_id: storeId,
        message,
        audio_url: audioUrl,
        priority,
        start_time: new Date().toISOString(),
        is_active: true,
        created_by: supabase.auth.getUser().then(({ data }) => data.user?.id)
      }]);

    if (error) throw error;
  } catch (error) {
    console.error('Error creating emergency broadcast:', error);
    throw error;
  }
}

// Radio API integration
export async function getStoreRadioQueue(storeId: string): Promise<Track[]> {
  try {
    const { data, error } = await supabase
      .from('playlist_queue')
      .select(`
        id,
        position,
        tracks (*)
      `)
      .eq('playlist_id', storeId)
      .order('position');

    if (error) throw error;

    return data.map(item => item.tracks);
  } catch (error) {
    console.error('Error fetching radio queue:', error);
    throw error;
  }
}

export async function sendPlayerHeartbeat(
  storeId: string, 
  status: 'online' | 'offline',
  currentTrackId?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('stores')
      .update({ 
        status,
        last_heartbeat: new Date().toISOString()
      })
      .eq('id', storeId);

    if (error) throw error;

    // If we have a current track, update the player session too
    if (currentTrackId) {
      await syncPlayerState({
        storeId,
        currentTrackId,
        status: 'playing',
        volume: 100,
        isMuted: false,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error sending player heartbeat:', error);
    throw error;
  }
}

// Cache the next N tracks locally
export function cacheTracksLocally(tracks: Track[]): void {
  try {
    localStorage.setItem('cached_tracks', JSON.stringify(tracks));
  } catch (error) {
    console.error('Error caching tracks locally:', error);
  }
}

// Get cached tracks for offline failover
export function getCachedTracks(): Track[] {
  try {
    const cachedTracks = localStorage.getItem('cached_tracks');
    return cachedTracks ? JSON.parse(cachedTracks) : [];
  } catch (error) {
    console.error('Error getting cached tracks:', error);
    return [];
  }
}