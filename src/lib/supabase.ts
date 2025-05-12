import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
  global: {
    headers: {
      'X-Client-Info': 'music-platform-mvp',
    },
  },
});

// Add error event listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    // Clear any cached data
    localStorage.clear();
  }
});

// Track API usage using realtime channels
const channel = supabase.channel('db-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
  }, (payload) => {
    console.debug('Supabase Event:', payload);
  })
  .subscribe();

// Helper functions
export const queries = {
  // Tracks
  getTracks: () => 
    supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false }),

  getTrackById: (id: string) =>
    supabase
      .from('tracks')
      .select('*')
      .eq('id', id)
      .single(),

  // Playlists
  getPlaylists: () =>
    supabase
      .from('playlists')
      .select('*')
      .order('created_at', { ascending: false }),

  getPlaylistById: (id: string) =>
    supabase
      .from('playlists')
      .select(`
        *,
        tracks:playlist_tracks(
          track_id,
          position,
          tracks(*)
        )
      `)
      .eq('id', id)
      .single(),

  // Stores
  getStores: () =>
    supabase
      .from('stores')
      .select('*')
      .order('name'),

  getStoreById: (id: string) =>
    supabase
      .from('stores')
      .select(`
        *,
        playlists(*)
      `)
      .eq('id', id)
      .single(),

  // Analytics
  getStoreAnalytics: (storeId: string) =>
    supabase
      .from('store_analytics')
      .select('*')
      .eq('store_id', storeId)
      .single(),

  getPlaylistAnalytics: (playlistId: string) =>
    supabase
      .from('playlist_analytics')
      .select('*')
      .eq('playlist_id', playlistId)
      .single(),
};

export const mutations = {
  // Tracks
  createTrack: (track: Omit<Track, 'id' | 'created_at'>) =>
    supabase
      .from('tracks')
      .insert(track)
      .select()
      .single(),

  updateTrack: (id: string, track: Partial<Track>) =>
    supabase
      .from('tracks')
      .update(track)
      .eq('id', id)
      .select()
      .single(),

  deleteTrack: (id: string) =>
    supabase
      .from('tracks')
      .delete()
      .eq('id', id),

  // Playlists
  createPlaylist: (playlist: Omit<Playlist, 'id' | 'created_at' | 'updated_at'>) =>
    supabase
      .from('playlists')
      .insert(playlist)
      .select()
      .single(),

  updatePlaylist: (id: string, playlist: Partial<Playlist>) =>
    supabase
      .from('playlists')
      .update(playlist)
      .eq('id', id)
      .select()
      .single(),

  deletePlaylist: (id: string) =>
    supabase
      .from('playlists')
      .delete()
      .eq('id', id),

  // Stores
  createStore: (store: Omit<Store, 'id' | 'created_at'>) =>
    supabase
      .from('stores')
      .insert(store)
      .select()
      .single(),

  updateStore: (id: string, store: Partial<Store>) =>
    supabase
      .from('stores')
      .update(store)
      .eq('id', id)
      .select()
      .single(),

  deleteStore: (id: string) =>
    supabase
      .from('stores')
      .delete()
      .eq('id', id),
};

export const subscriptions = {
  // Track store status changes
  onStoreStatusChange: (storeId: string, callback: (payload: any) => void) =>
    supabase
      .channel(`store-${storeId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'stores',
        filter: `id=eq.${storeId}`,
      }, callback)
      .subscribe(),

  // Track playlist changes
  onPlaylistChange: (playlistId: string, callback: (payload: any) => void) =>
    supabase
      .channel(`playlist-${playlistId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'playlist_tracks',
        filter: `playlist_id=eq.${playlistId}`,
      }, callback)
      .subscribe(),
};