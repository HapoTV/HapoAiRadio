import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { StoreAnalytics, PlaylistAnalytics, Store, Playlist, Track } from '../types';
import {
  DashboardMetrics,
  PlaylistEngagement,
  StorePerformance,
  GenreDistribution,
  StorePlaylistAnalytics
} from '../components/Analytics';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface StorePlaylistData {
  storeId: string;
  storeName: string;
  playlists: {
    id: string;
    name: string;
    trackCount: number;
    totalPlays: number;
    topTracks: {
      id: string;
      title: string;
      artist: string;
      playCount: number;
    }[];
  }[];
}

export default function Analytics() {
  const [storeAnalytics, setStoreAnalytics] = useState<StoreAnalytics[]>([]);
  const [playlistAnalytics, setPlaylistAnalytics] = useState<PlaylistAnalytics[]>([]);
  const [storePlaylistData, setStorePlaylistData] = useState<StorePlaylistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  useEffect(() => {
    fetchAnalytics();
    
    // Set up real-time refresh
    const interval = window.setInterval(() => {
      fetchAnalytics(true);
    }, 60000); // Refresh every minute
    
    return () => {
      if (interval) window.clearInterval(interval);
      if (refreshInterval) window.clearInterval(refreshInterval);
    };
  }, [dateRange]);

  const fetchAnalytics = async (silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      // First check if store_analytics table exists
      const { error: tableCheckError } = await supabase
        .from('store_analytics')
        .select('id')
        .limit(1);
      
      if (tableCheckError) {
        // If table doesn't exist, use mock data for now
        console.warn('Store analytics table not found, using mock data');
        setStoreAnalytics([
          {
            store_id: 'mock-1',
            total_plays: 120,
            unique_tracks: 45,
            peak_hours: [14, 15, 16],
            popular_genres: [{ genre: 'Pop', count: 50 }, { genre: 'Rock', count: 30 }],
            updated_at: new Date().toISOString()
          },
          {
            store_id: 'mock-2',
            total_plays: 85,
            unique_tracks: 32,
            peak_hours: [12, 13, 17],
            popular_genres: [{ genre: 'Jazz', count: 40 }, { genre: 'Classical', count: 25 }],
            updated_at: new Date().toISOString()
          }
        ]);
      } else {
        // Table exists, fetch real data
        const { data: storeData, error: storeError } = await supabase
          .from('store_analytics')
          .select('*')
          .order('updated_at', { ascending: false });

        if (storeError) throw storeError;
        setStoreAnalytics(storeData || []);
      }

      // Check if playlist_analytics table exists
      const { error: playlistTableCheckError } = await supabase
        .from('playlist_analytics')
        .select('id')
        .limit(1);
      
      if (playlistTableCheckError) {
        // If table doesn't exist, use mock data for now
        console.warn('Playlist analytics table not found, using mock data');
        setPlaylistAnalytics([
          {
            playlist_id: 'mock-1',
            total_plays: 75,
            avg_completion_rate: 0.82,
            skip_rate: 0.15,
            genre_distribution: { 'Pop': 30, 'Rock': 25, 'Electronic': 20 },
            peak_play_hours: [14, 15, 18],
            updated_at: new Date().toISOString()
          },
          {
            playlist_id: 'mock-2',
            total_plays: 60,
            avg_completion_rate: 0.75,
            skip_rate: 0.22,
            genre_distribution: { 'Jazz': 35, 'Classical': 25 },
            peak_play_hours: [12, 19, 20],
            updated_at: new Date().toISOString()
          }
        ]);
      } else {
        // Table exists, fetch real data
        const { data: playlistData, error: playlistError } = await supabase
          .from('playlist_analytics')
          .select('*')
          .order('updated_at', { ascending: false });

        if (playlistError) throw playlistError;
        setPlaylistAnalytics(playlistData || []);
      }

      // Fetch store and playlist data for detailed analytics
      await fetchStorePlaylistData();
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      if (!silent) {
        toast.error('Failed to load analytics data');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchStorePlaylistData = async () => {
    try {
      // Get all stores
      const { data: stores, error: storeError } = await supabase
        .from('stores')
        .select('id, name');
      
      if (storeError) throw storeError;
      
      if (!stores || stores.length === 0) {
        setStorePlaylistData([]);
        return;
      }
      
      // For each store, get playlists and track play data
      const storeData: StorePlaylistData[] = [];
      
      for (const store of stores) {
        // Get playlists for this store
        const { data: playlists, error: playlistError } = await supabase
          .from('playlists')
          .select('id, name')
          .eq('store_id', store.id);
        
        if (playlistError) throw playlistError;
        
        if (!playlists || playlists.length === 0) {
          storeData.push({
            storeId: store.id,
            storeName: store.name,
            playlists: []
          });
          continue;
        }
        
        const playlistsData = [];
        
        for (const playlist of playlists) {
          // Get track count
          const { count: trackCount, error: trackCountError } = await supabase
            .from('playlist_tracks')
            .select('id', { count: 'exact' })
            .eq('playlist_id', playlist.id);
          
          if (trackCountError) throw trackCountError;
          
          // Get play count
          const { count: playCount, error: playCountError } = await supabase
            .from('track_plays')
            .select('id', { count: 'exact' })
            .eq('playlist_id', playlist.id)
            .eq('store_id', store.id);
          
          if (playCountError) throw playCountError;
          
          // Get top tracks
          try {
            // Try RPC function with proper GROUP BY
            const { data: topTracksData, error: rpcError } = await supabase.rpc(
              'get_top_tracks_for_playlist',
              { 
                playlist_id_param: playlist.id,
                store_id_param: store.id,
                limit_param: 5
              }
            );

            if (rpcError) throw rpcError;

            const topTracks = topTracksData.map(item => ({
              id: item.track_id,
              title: item.title,
              artist: item.artist || 'Unknown Artist',
              playCount: item.play_count
            }));

            playlistsData.push({
              id: playlist.id,
              name: playlist.name,
              trackCount: trackCount || 0,
              totalPlays: playCount || 0,
              topTracks
            });
          } catch (rpcError) {
            console.error('RPC error, falling back to manual aggregation:', rpcError);
            
            // Fallback to manual aggregation if RPC fails
            const { data: trackPlaysData, error: queryError } = await supabase
              .from('track_plays')
              .select(`
                track_id,
                tracks (id, title, artist)
              `)
              .eq('playlist_id', playlist.id)
              .eq('store_id', store.id);

            if (queryError) throw queryError;

            // Manually count plays by track
            const trackPlayCounts: Record<string, { id: string, title: string, artist: string, count: number }> = {};
            
            if (trackPlaysData) {
              trackPlaysData.forEach(item => {
                if (!trackPlayCounts[item.track_id]) {
                  trackPlayCounts[item.track_id] = {
                    id: item.track_id,
                    title: item.tracks?.title || 'Unknown Track',
                    artist: item.tracks?.artist || 'Unknown Artist',
                    count: 0
                  };
                }
                trackPlayCounts[item.track_id].count++;
              });
            }
            
            const topTracks = Object.values(trackPlayCounts)
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
              .map(item => ({
                id: item.id,
                title: item.title,
                artist: item.artist,
                playCount: item.count
              }));

            playlistsData.push({
              id: playlist.id,
              name: playlist.name,
              trackCount: trackCount || 0,
              totalPlays: playCount || 0,
              topTracks
            });
          }
        }
        
        storeData.push({
          storeId: store.id,
          storeName: store.name,
          playlists: playlistsData
        });
      }
      
      setStorePlaylistData(storeData);
      
    } catch (error) {
      console.error('Error fetching store playlist data:', error);
      toast.error('Failed to load store playlist data');
    }
  };

  const handleDownloadCSV = useCallback(async (storeId: string) => {
    try {
      const store = storePlaylistData.find(s => s.storeId === storeId);
      if (!store) {
        toast.error('Store data not found');
        return;
      }
      
      // Get all track plays for this store
      const { data, error } = await supabase
        .from('track_plays')
        .select(`
          played_at,
          tracks (
            title,
            artist
          ),
          playlists (
            name
          )
        `)
        .eq('store_id', storeId)
        .order('played_at', { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast.error('No play data available for export');
        return;
      }

      // Create CSV content
      const csvContent = [
        ['Date', 'Time', 'Track', 'Artist', 'Playlist'],
        ...data.map(play => [
          format(new Date(play.played_at), 'yyyy-MM-dd'),
          format(new Date(play.played_at), 'HH:mm:ss'),
          play.tracks?.title || 'Unknown Track',
          play.tracks?.artist || 'Unknown Artist',
          play.playlists?.name || 'N/A'
        ])
      ]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${store.storeName.replace(/\s+/g, '-')}-play-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('CSV file downloaded successfully');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast.error('Failed to download CSV');
    }
  }, [storePlaylistData]);

  const toggleRefresh = useCallback(() => {
    if (refreshInterval) {
      window.clearInterval(refreshInterval);
      setRefreshInterval(null);
      toast.success('Auto-refresh disabled');
    } else {
      const interval = window.setInterval(() => {
        fetchAnalytics(true);
      }, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
      toast.success('Auto-refresh enabled (30s)');
    }
  }, [refreshInterval]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-primary-800 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-96 bg-primary-800 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary-50">Analytics Dashboard</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => fetchAnalytics()}
            className="px-4 py-2 bg-primary-700 text-primary-50 rounded-lg hover:bg-primary-600"
          >
            Refresh Data
          </button>
          <button
            onClick={toggleRefresh}
            className={`px-4 py-2 rounded-lg ${
              refreshInterval 
                ? 'bg-primary-600 text-primary-50 hover:bg-primary-500' 
                : 'bg-primary-700 text-primary-50 hover:bg-primary-600'
            }`}
          >
            {refreshInterval ? 'Disable Auto-refresh' : 'Enable Auto-refresh'}
          </button>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-2 text-primary-50"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      <DashboardMetrics
        storeAnalytics={storeAnalytics}
        playlistAnalytics={playlistAnalytics}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StorePerformance analytics={storeAnalytics} />
        <PlaylistEngagement analytics={playlistAnalytics} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GenreDistribution analytics={playlistAnalytics} />
      </div>
      
      <StorePlaylistAnalytics 
        storeData={storePlaylistData}
        onDownloadCSV={handleDownloadCSV}
      />
    </div>
  );
}