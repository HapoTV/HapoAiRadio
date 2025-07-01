import { supabase } from './supabase';
import { format, parseISO, startOfDay, endOfDay, subDays } from 'date-fns';
import { cachedQuery } from './caching';

// Types for dashboard data
export interface DashboardStats {
  totalTracks: number;
  activePlaylists: number;
  activeStores: number;
  todaysPlays: number;
  trackGrowth: number;
  storeGrowth: number;
  playlistGrowth: number;
  playsGrowth: number;
}

export interface StoreStatus {
  id: string;
  name: string;
  status: 'online' | 'offline';
  currentTrack?: {
    title: string;
    artist: string;
  };
}

export interface PlayData {
  date: string;
  name?: string;
  count: number;
}

export interface PlaylistRanking {
  id: string;
  name: string;
  playCount: number;
  storeCount: number;
}

export interface StoreRanking {
  id: string;
  name: string;
  playCount: number;
  playlistCount: number;
}

// Get overall dashboard stats
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Use cached query for better performance
    const cacheKey = 'dashboard_stats';
    
    // Fetch track count
    const { data: trackData, error: trackError } = await cachedQuery(
      () => supabase.from('tracks').select('*', { count: 'exact', head: true }),
      `${cacheKey}_tracks`,
      5 * 60 * 1000 // 5 minutes cache
    );
    
    if (trackError) throw trackError;
    
    // Fetch active playlists
    const { data: playlists, error: playlistError } = await cachedQuery(
      () => supabase.from('playlists').select('id'),
      `${cacheKey}_playlists`,
      5 * 60 * 1000
    );
    
    if (playlistError) throw playlistError;
    
    // Fetch active stores
    const { data: stores, error: storeError } = await cachedQuery(
      () => supabase.from('stores').select('id, status'),
      `${cacheKey}_stores`,
      60 * 1000 // 1 minute cache for more frequent updates
    );
    
    if (storeError) throw storeError;
    
    const activeStores = stores?.filter(store => store.status === 'online').length || 0;
    
    // Fetch today's plays
    const today = startOfDay(new Date());
    
    const { count: todaysPlayCount, error: playsError } = await supabase
      .from('track_plays')
      .select('*', { count: 'exact', head: true })
      .gte('played_at', today.toISOString());
    
    if (playsError) throw playsError;
    
    // Fetch yesterday's plays for comparison
    const yesterday = subDays(today, 1);
    
    const { count: yesterdaysPlayCount, error: yesterdayError } = await supabase
      .from('track_plays')
      .select('*', { count: 'exact', head: true })
      .gte('played_at', startOfDay(yesterday).toISOString())
      .lt('played_at', endOfDay(yesterday).toISOString());
    
    if (yesterdayError) throw yesterdayError;
    
    // Calculate growth percentages
    const playsGrowth = yesterdaysPlayCount 
      ? Math.round(((todaysPlayCount - yesterdaysPlayCount) / yesterdaysPlayCount) * 100) 
      : 0;
    
    // For other growth metrics, we would need historical data
    // Using placeholder values for now
    return {
      totalTracks: trackData.count || 0,
      activePlaylists: playlists?.length || 0,
      activeStores: activeStores,
      todaysPlays: todaysPlayCount || 0,
      trackGrowth: 12, // Placeholder
      storeGrowth: 5,  // Placeholder
      playlistGrowth: 8, // Placeholder
      playsGrowth: playsGrowth
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
}

// Get store statuses with current track info
export async function getStoreStatuses(): Promise<StoreStatus[]> {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select(`
        id,
        name,
        status,
        player_sessions (
          current_track_id,
          tracks (
            title,
            artist
          )
        )
      `)
      .order('name');
    
    if (error) throw error;
    
    const statuses: StoreStatus[] = data?.map(store => ({
      id: store.id,
      name: store.name,
      status: store.status as 'online' | 'offline',
      currentTrack: store.player_sessions?.[0]?.tracks ? {
        title: store.player_sessions[0].tracks.title,
        artist: store.player_sessions[0].tracks.artist || 'Unknown Artist'
      } : undefined
    })) || [];
    
    return statuses;
  } catch (error) {
    console.error('Error fetching store statuses:', error);
    throw error;
  }
}

// Get play data for a specific date range
export async function getPlayData(startDate: Date, endDate: Date): Promise<PlayData[]> {
  try {
    const { data, error } = await supabase
      .from('track_plays')
      .select('played_at')
      .gte('played_at', startDate.toISOString())
      .lte('played_at', endDate.toISOString());
    
    if (error) throw error;
    
    // Count plays per day
    const playCounts: Record<string, number> = {};
    
    data?.forEach(play => {
      const date = format(parseISO(play.played_at), 'yyyy-MM-dd');
      playCounts[date] = (playCounts[date] || 0) + 1;
    });
    
    // Convert to array format
    const playData = Object.entries(playCounts).map(([date, count]) => ({
      date,
      count
    }));
    
    // Sort by date
    playData.sort((a, b) => a.date.localeCompare(b.date));
    
    return playData;
  } catch (error) {
    console.error('Error fetching play data:', error);
    throw error;
  }
}

// Get top playlists by play count
export async function getTopPlaylists(limit: number = 5): Promise<PlaylistRanking[]> {
  try {
    // This would ideally use a database function or view
    // For now, we'll use a simple query and process the data
    const { data, error } = await supabase
      .from('track_plays')
      .select(`
        playlist_id,
        playlists (
          id,
          name
        ),
        store_id
      `)
      .not('playlist_id', 'is', null);
    
    if (error) throw error;
    
    // Count plays per playlist and track which stores played them
    const playlistData: Record<string, { 
      name: string, 
      playCount: number, 
      stores: Set<string> 
    }> = {};
    
    data?.forEach(play => {
      if (play.playlist_id && play.playlists) {
        const playlistId = play.playlist_id;
        
        if (!playlistData[playlistId]) {
          playlistData[playlistId] = {
            name: play.playlists.name,
            playCount: 0,
            stores: new Set()
          };
        }
        
        playlistData[playlistId].playCount += 1;
        
        if (play.store_id) {
          playlistData[playlistId].stores.add(play.store_id);
        }
      }
    });
    
    // Convert to array and sort
    const rankings = Object.entries(playlistData)
      .map(([id, data]) => ({
        id,
        name: data.name,
        playCount: data.playCount,
        storeCount: data.stores.size
      }))
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, limit);
    
    return rankings;
  } catch (error) {
    console.error('Error fetching top playlists:', error);
    throw error;
  }
}

// Get top stores by play count
export async function getTopStores(limit: number = 5): Promise<StoreRanking[]> {
  try {
    // This would ideally use a database function or view
    // For now, we'll use a simple query and process the data
    const { data, error } = await supabase
      .from('track_plays')
      .select(`
        store_id,
        stores (
          id,
          name
        ),
        playlist_id
      `)
      .not('store_id', 'is', null);
    
    if (error) throw error;
    
    // Count plays per store and track which playlists were played
    const storeData: Record<string, { 
      name: string, 
      playCount: number, 
      playlists: Set<string> 
    }> = {};
    
    data?.forEach(play => {
      if (play.store_id && play.stores) {
        const storeId = play.store_id;
        
        if (!storeData[storeId]) {
          storeData[storeId] = {
            name: play.stores.name,
            playCount: 0,
            playlists: new Set()
          };
        }
        
        storeData[storeId].playCount += 1;
        
        if (play.playlist_id) {
          storeData[storeId].playlists.add(play.playlist_id);
        }
      }
    });
    
    // Convert to array and sort
    const rankings = Object.entries(storeData)
      .map(([id, data]) => ({
        id,
        name: data.name,
        playCount: data.playCount,
        playlistCount: data.playlists.size
      }))
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, limit);
    
    return rankings;
  } catch (error) {
    console.error('Error fetching top stores:', error);
    throw error;
  }
}

// Subscribe to real-time updates
export function subscribeToUpdates(callback: () => void): () => void {
  // Set up real-time subscriptions
  const trackPlaysChannel = supabase
    .channel('track_plays_changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'track_plays'
    }, callback)
    .subscribe();
  
  const storesChannel = supabase
    .channel('stores_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'stores'
    }, callback)
    .subscribe();
  
  const playerSessionsChannel = supabase
    .channel('player_sessions_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'player_sessions'
    }, callback)
    .subscribe();
  
  // Return unsubscribe function
  return () => {
    trackPlaysChannel.unsubscribe();
    storesChannel.unsubscribe();
    playerSessionsChannel.unsubscribe();
  };
}