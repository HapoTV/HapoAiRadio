import { supabase } from './supabase';
import { format } from 'date-fns';

// Track play recording with store validation
export const recordTrackPlay = async (
  trackId: string,
  storeId: string,
  playlistId?: string
) => {
  try {
    // First verify the store exists to prevent foreign key constraint errors
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .single();

    if (storeError || !storeData) {
      console.error('Store validation failed:', storeError?.message || 'Store not found');
      return false;
    }

    // Now that we've verified the store exists, record the play
    const { error } = await supabase
      .from('track_plays')
      .insert({
        track_id: trackId,
        store_id: storeId,
        playlist_id: playlistId,
        played_at: new Date().toISOString()
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error recording track play:', error);
    return false;
  }
};

// Get store analytics
export const getStoreAnalytics = async (storeId: string, dateRange: string = '7d') => {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    if (dateRange === '7d') {
      startDate.setDate(endDate.getDate() - 7);
    } else if (dateRange === '30d') {
      startDate.setDate(endDate.getDate() - 30);
    } else if (dateRange === '90d') {
      startDate.setDate(endDate.getDate() - 90);
    }
    
    const { data, error } = await supabase
      .from('track_plays')
      .select(`
        id,
        played_at,
        tracks (
          id,
          title,
          artist,
          genre
        ),
        playlists (
          id,
          name
        )
      `)
      .eq('store_id', storeId)
      .gte('played_at', startDate.toISOString())
      .lte('played_at', endDate.toISOString())
      .order('played_at', { ascending: false });

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error getting store analytics:', error);
    throw error;
  }
};

// Get playlist analytics
export const getPlaylistAnalytics = async (playlistId: string, dateRange: string = '7d') => {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    if (dateRange === '7d') {
      startDate.setDate(endDate.getDate() - 7);
    } else if (dateRange === '30d') {
      startDate.setDate(endDate.getDate() - 30);
    } else if (dateRange === '90d') {
      startDate.setDate(endDate.getDate() - 90);
    }
    
    const { data, error } = await supabase
      .from('track_plays')
      .select(`
        id,
        played_at,
        tracks (
          id,
          title,
          artist,
          genre
        )
      `)
      .eq('playlist_id', playlistId)
      .gte('played_at', startDate.toISOString())
      .lte('played_at', endDate.toISOString())
      .order('played_at', { ascending: false });

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error getting playlist analytics:', error);
    throw error;
  }
};

// Generate CSV for store analytics
export const generateStoreAnalyticsCSV = async (storeId: string, dateRange: string = '7d') => {
  try {
    const data = await getStoreAnalytics(storeId, dateRange);
    
    if (!data || data.length === 0) {
      throw new Error('No data available for export');
    }
    
    // Create CSV content
    const csvContent = [
      ['Date', 'Time', 'Track', 'Artist', 'Genre', 'Playlist'],
      ...data.map(play => [
        format(new Date(play.played_at), 'yyyy-MM-dd'),
        format(new Date(play.played_at), 'HH:mm:ss'),
        play.tracks?.title || 'Unknown Track',
        play.tracks?.artist || 'Unknown Artist',
        play.tracks?.genre || 'Unknown Genre',
        play.playlists?.name || 'N/A'
      ])
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return csvContent;
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw error;
  }
};

// Get top tracks for a store
export const getTopTracksForStore = async (storeId: string, limit: number = 10) => {
  try {
    try {
      // Try using RPC function with proper GROUP BY
      const { data, error } = await supabase.rpc(
        'get_top_tracks_for_store',
        { 
          store_id_param: storeId,
          limit_param: limit
        }
      );
      
      if (error) throw error;
      return data;
    } catch (rpcError) {
      console.error('RPC error, falling back to manual aggregation:', rpcError);
      
      // Fallback to manual aggregation if RPC fails
      const { data, error } = await supabase
        .from('track_plays')
        .select(`
          track_id,
          tracks (id, title, artist)
        `)
        .eq('store_id', storeId);
        
      if (error) throw error;
      
      // Manually count plays by track
      const trackCounts: Record<string, { track_id: string, title: string, artist: string, play_count: number }> = {};
      
      data.forEach(play => {
        if (!trackCounts[play.track_id]) {
          trackCounts[play.track_id] = {
            track_id: play.track_id,
            title: play.tracks?.title || 'Unknown Track',
            artist: play.tracks?.artist || 'Unknown Artist',
            play_count: 0
          };
        }
        trackCounts[play.track_id].play_count++;
      });
      
      return Object.values(trackCounts)
        .sort((a, b) => b.play_count - a.play_count)
        .slice(0, limit);
    }
  } catch (error) {
    console.error('Error getting top tracks:', error);
    throw error;
  }
};

// Get real-time analytics updates
export const subscribeToAnalyticsUpdates = (callback: () => void) => {
  const subscription = supabase
    .channel('track_plays_changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'track_plays'
    }, () => {
      callback();
    })
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
};