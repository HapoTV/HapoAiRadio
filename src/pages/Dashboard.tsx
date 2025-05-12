import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Store } from '../types';
import toast from 'react-hot-toast';
import { ChartBarIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface StoreAnalytics {
  store_id: string;
  track_id: string;
  track_title: string;
  play_count: number;
}

export default function Dashboard() {
  const [stores, setStores] = useState<Store[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, StoreAnalytics[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  useEffect(() => {
    fetchStores();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('stores')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'stores' 
      }, payload => {
        if (payload.eventType === 'UPDATE') {
          setStores(current => 
            current.map(store => 
              store.id === payload.new.id ? { ...store, ...payload.new } : store
            )
          );
        }
      })
      .subscribe();

    // Subscribe to track_plays changes
    const trackPlaysSubscription = supabase
      .channel('track_plays')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'track_plays'
      }, () => {
        // Refresh analytics when new plays are recorded
        fetchStores(true);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      trackPlaysSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedStore) {
      fetchStoreAnalytics(selectedStore);
    }
  }, [selectedStore]);

  const fetchStores = async (silent = false) => {
    try {
      setError(null);
      const { data, error: supabaseError } = await supabase
        .from('stores')
        .select('*')
        .order('name');
      
      if (supabaseError) throw supabaseError;
      if (data === null) throw new Error('No data received from the server');

      setStores(data);

      // Fetch analytics for all stores
      const analyticsData: Record<string, StoreAnalytics[]> = {};
      await Promise.all(data.map(async (store) => {
        analyticsData[store.id] = await fetchStoreAnalytics(store.id, true);
      }));
      setAnalytics(analyticsData);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      
      if (!silent) {
        setError(error.message || 'Failed to load stores');
        toast.error('Failed to load stores. Please try refreshing the page.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const fetchStoreAnalytics = async (storeId: string, silent = false): Promise<StoreAnalytics[]> => {
    try {
      try {
        // Try using RPC function with proper GROUP BY
        const { data, error } = await supabase.rpc(
          'get_top_tracks_for_store',
          { 
            store_id_param: storeId,
            limit_param: 5
          }
        );
        
        if (error) throw error;
        
        if (data) {
          return data.map((item: any) => ({
            store_id: storeId,
            track_id: item.track_id,
            track_title: item.title,
            play_count: item.play_count
          }));
        }
      } catch (rpcError) {
        console.error('RPC error, falling back to manual aggregation:', rpcError);
      }

      // Fallback to manual aggregation if RPC fails
      const { data, error } = await supabase
        .from('track_plays')
        .select(`
          store_id,
          track_id,
          tracks (
            title
          )
        `)
        .eq('store_id', storeId);

      if (error) throw error;

      // Group and count plays by track
      const playsByTrack: Record<string, StoreAnalytics> = {};
      
      if (data && data.length > 0) {
        data.forEach(play => {
          const trackId = play.track_id;
          if (!playsByTrack[trackId]) {
            playsByTrack[trackId] = {
              store_id: play.store_id,
              track_id: trackId,
              track_title: play.tracks?.title || 'Unknown Track',
              play_count: 0
            };
          }
          playsByTrack[trackId].play_count++;
        });
      }

      return Object.values(playsByTrack);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      if (!silent) {
        toast.error('Failed to load analytics');
      }
      return [];
    }
  };

  const downloadCSV = useCallback(async (storeId: string) => {
    try {
      const store = stores.find(s => s.id === storeId);
      if (!store) return;

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

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${store.name.replace(/\s+/g, '-')}-play-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('CSV file downloaded successfully');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast.error('Failed to download CSV');
    }
  }, [stores]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-primary-800 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-primary-800 p-6 rounded-lg">
              <div className="h-6 bg-primary-700 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-primary-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="mb-4 text-status-error">{error}</div>
        <button
          onClick={() => fetchStores()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-primary-50 mb-6">Store Status Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map((store) => (
          <div
            key={store.id}
            className="bg-primary-800 shadow rounded-lg p-6 border border-primary-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-primary-50">{store.name}</h2>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  store.status === 'online'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {store.status}
              </span>
            </div>
            
            <p className="text-sm text-primary-400 mb-4">{store.location}</p>

            <div className="border-t border-primary-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-primary-200">Analytics</h3>
                <button
                  onClick={() => downloadCSV(store.id)}
                  className="inline-flex items-center text-sm text-primary-400 hover:text-primary-300"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                  Download CSV
                </button>
              </div>

              {analytics[store.id]?.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {analytics[store.id].map((stat) => (
                    <div key={stat.track_id} className="flex items-center justify-between text-sm">
                      <span className="text-primary-300 truncate flex-1">{stat.track_title}</span>
                      <span className="text-primary-200 font-medium ml-2">{stat.play_count} plays</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-primary-400">No play history yet</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}