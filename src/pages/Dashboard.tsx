import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Store, StoreAnalytics, PlaylistAnalytics } from '../types';
import toast from 'react-hot-toast';
import { 
  ChartBarIcon, 
  ArrowDownTrayIcon, 
  BuildingStorefrontIcon,
  MusicalNoteIcon,
  ArrowPathIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Dashboard() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeAnalytics, setStoreAnalytics] = useState<Record<string, StoreAnalytics>>({});
  const [playlistAnalytics, setPlaylistAnalytics] = useState<PlaylistAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<number>(7); // Default to 7 days
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [dailyPlayCounts, setDailyPlayCounts] = useState<any[]>([]);
  const [totalPlays, setTotalPlays] = useState<number>(0);
  const [activeStores, setActiveStores] = useState<number>(0);
  const [topPlaylists, setTopPlaylists] = useState<any[]>([]);
  const [genreDistribution, setGenreDistribution] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchDashboardData();
    
    // Subscribe to real-time updates
    const storeSubscription = supabase
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
        fetchDashboardData(true);
      })
      .subscribe();

    return () => {
      storeSubscription.unsubscribe();
      trackPlaysSubscription.unsubscribe();
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    // When date range changes, refresh data
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      
      // Fetch stores
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .order('name');
      
      if (storesError) throw storesError;
      setStores(storesData || []);
      setActiveStores(storesData?.filter(store => store.status === 'online').length || 0);
      
      // If no store is selected, select the first one
      if (!selectedStore && storesData && storesData.length > 0) {
        setSelectedStore(storesData[0].id);
      }
      
      // Fetch store analytics
      const storeAnalyticsData: Record<string, StoreAnalytics> = {};
      let totalPlayCount = 0;
      
      await Promise.all(storesData?.map(async (store) => {
        try {
          const { data: analytics, error: analyticsError } = await supabase
            .from('store_analytics')
            .select('*')
            .eq('store_id', store.id)
            .single();
          
          if (analyticsError && analyticsError.code !== 'PGRST116') throw analyticsError;
          
          if (analytics) {
            storeAnalyticsData[store.id] = analytics;
            totalPlayCount += analytics.total_plays;
          }
        } catch (error) {
          console.error(`Error fetching analytics for store ${store.id}:`, error);
        }
      }) || []);
      
      setStoreAnalytics(storeAnalyticsData);
      setTotalPlays(totalPlayCount);
      
      // Fetch playlist analytics
      const { data: playlistData, error: playlistError } = await supabase
        .from('playlist_analytics')
        .select('*')
        .order('total_plays', { ascending: false });
      
      if (playlistError) throw playlistError;
      setPlaylistAnalytics(playlistData || []);
      
      // Calculate top playlists
      const topPlaylistsData = await fetchTopPlaylists();
      setTopPlaylists(topPlaylistsData);
      
      // Calculate daily play counts for the selected date range
      const dailyData = await fetchDailyPlayCounts(dateRange);
      setDailyPlayCounts(dailyData);
      
      // Calculate genre distribution
      const genreData = calculateGenreDistribution(playlistData || []);
      setGenreDistribution(genreData);
      
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      
      if (!silent) {
        setError(error.message || 'Failed to load dashboard data');
        toast.error('Failed to load dashboard data. Please try refreshing the page.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const fetchTopPlaylists = async () => {
    try {
      // Get playlists with their analytics
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          store_id,
          playlist_analytics (
            total_plays
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Format data for display
      return (data || [])
        .filter(playlist => playlist.playlist_analytics && playlist.playlist_analytics.total_plays > 0)
        .map(playlist => ({
          id: playlist.id,
          name: playlist.name,
          storeId: playlist.store_id,
          plays: playlist.playlist_analytics?.total_plays || 0
        }))
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 5); // Top 5 playlists
    } catch (error) {
      console.error('Error fetching top playlists:', error);
      return [];
    }
  };

  const fetchDailyPlayCounts = async (days: number) => {
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, days - 1);
      
      // Create array of dates for the range
      const dateArray = [];
      for (let i = 0; i < days; i++) {
        const date = subDays(endDate, i);
        dateArray.unshift(date);
      }
      
      // Get play counts for each day
      const dailyCounts = await Promise.all(dateArray.map(async (date) => {
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        const { count, error } = await supabase
          .from('track_plays')
          .select('id', { count: 'exact' })
          .gte('played_at', dayStart.toISOString())
          .lte('played_at', dayEnd.toISOString());
        
        if (error) throw error;
        
        return {
          date: format(date, 'MMM dd'),
          count: count || 0
        };
      }));
      
      return dailyCounts;
    } catch (error) {
      console.error('Error fetching daily play counts:', error);
      return [];
    }
  };

  const calculateGenreDistribution = (playlistAnalytics: PlaylistAnalytics[]) => {
    // Combine genre distributions from all playlists
    const genreCounts: Record<string, number> = {};
    
    playlistAnalytics.forEach(playlist => {
      if (playlist.genre_distribution) {
        Object.entries(playlist.genre_distribution).forEach(([genre, count]) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + (count as number);
        });
      }
    });
    
    // Convert to array format for charts
    return Object.entries(genreCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 genres
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

  const toggleRefresh = useCallback(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
      toast.success('Auto-refresh disabled');
    } else {
      const interval = window.setInterval(() => {
        fetchDashboardData(true);
      }, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
      toast.success('Auto-refresh enabled (30s)');
    }
  }, [refreshInterval]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="mb-4 text-status-error">{error}</div>
        <button
          onClick={() => fetchDashboardData()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-primary-50">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-primary-400 text-sm">
            <ClockIcon className="h-4 w-4" />
            <span>Last updated: {format(lastUpdated, 'MMM d, h:mm:ss a')}</span>
          </div>
          <button
            onClick={() => fetchDashboardData()}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-50 bg-primary-700 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Refresh
          </button>
          <button
            onClick={toggleRefresh}
            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-50 ${
              refreshInterval 
                ? 'bg-primary-600 hover:bg-primary-500' 
                : 'bg-primary-700 hover:bg-primary-600'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
          >
            {refreshInterval ? 'Disable Auto-refresh' : 'Enable Auto-refresh'}
          </button>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(parseInt(e.target.value))}
            className="bg-primary-700 border border-primary-600 rounded-md px-3 py-2 text-sm text-primary-50"
          >
            <option value="7">Last 7 Days</option>
            <option value="14">Last 14 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-primary-800 rounded-lg p-6 shadow-lg border border-primary-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-400 text-sm">Total Plays</p>
              <p className="text-2xl font-semibold text-primary-50 mt-1">{totalPlays.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-primary-700/50 rounded-full">
              <ChartBarIcon className="h-6 w-6 text-primary-400" />
            </div>
          </div>
          <div className="mt-4 text-sm text-primary-400">
            Across all stores
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-primary-800 rounded-lg p-6 shadow-lg border border-primary-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-400 text-sm">Active Stores</p>
              <p className="text-2xl font-semibold text-primary-50 mt-1">{activeStores} / {stores.length}</p>
            </div>
            <div className="p-3 bg-primary-700/50 rounded-full">
              <BuildingStorefrontIcon className="h-6 w-6 text-primary-400" />
            </div>
          </div>
          <div className="mt-4 text-sm text-primary-400">
            {activeStores > 0 ? `${Math.round((activeStores / stores.length) * 100)}% online` : 'No active stores'}
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-primary-800 rounded-lg p-6 shadow-lg border border-primary-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-400 text-sm">Active Playlists</p>
              <p className="text-2xl font-semibold text-primary-50 mt-1">{playlistAnalytics.length}</p>
            </div>
            <div className="p-3 bg-primary-700/50 rounded-full">
              <MusicalNoteIcon className="h-6 w-6 text-primary-400" />
            </div>
          </div>
          <div className="mt-4 text-sm text-primary-400">
            {playlistAnalytics.reduce((sum, playlist) => sum + playlist.total_plays, 0).toLocaleString()} total plays
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-primary-800 rounded-lg p-6 shadow-lg border border-primary-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-400 text-sm">Daily Average</p>
              <p className="text-2xl font-semibold text-primary-50 mt-1">
                {dailyPlayCounts.length > 0 
                  ? Math.round(dailyPlayCounts.reduce((sum, day) => sum + day.count, 0) / dailyPlayCounts.length).toLocaleString()
                  : '0'}
              </p>
            </div>
            <div className="p-3 bg-primary-700/50 rounded-full">
              <ClockIcon className="h-6 w-6 text-primary-400" />
            </div>
          </div>
          <div className="mt-4 text-sm text-primary-400">
            Plays per day
          </div>
        </motion.div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-primary-800 rounded-lg p-6 shadow-lg border border-primary-700"
        >
          <h2 className="text-lg font-medium text-primary-50 mb-4">Daily Play Counts</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyPlayCounts}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: '#F9FAFB',
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-primary-800 rounded-lg p-6 shadow-lg border border-primary-700"
        >
          <h2 className="text-lg font-medium text-primary-50 mb-4">Genre Distribution</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genreDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {genreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
      
      {/* Store Status and Top Playlists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-primary-800 rounded-lg shadow-lg border border-primary-700"
        >
          <div className="p-6 border-b border-primary-700">
            <h2 className="text-lg font-medium text-primary-50">Store Status</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-primary-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-400 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-400 uppercase tracking-wider">
                    Plays
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-700">
                {stores.map((store) => (
                  <tr key={store.id} className="hover:bg-primary-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-50">
                      {store.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        store.status === 'online'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {store.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-300">
                      {storeAnalytics[store.id]?.total_plays.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-300">
                      <button
                        onClick={() => downloadCSV(store.id)}
                        className="inline-flex items-center text-primary-400 hover:text-primary-300"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                        Export
                      </button>
                    </td>
                  </tr>
                ))}
                
                {stores.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-primary-400">
                      No stores found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-primary-800 rounded-lg shadow-lg border border-primary-700"
        >
          <div className="p-6 border-b border-primary-700">
            <h2 className="text-lg font-medium text-primary-50">Top Playlists</h2>
          </div>
          <div className="p-6">
            {topPlaylists.length > 0 ? (
              <div className="space-y-4">
                {topPlaylists.map((playlist, index) => (
                  <div key={playlist.id} className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary-700 flex items-center justify-center mr-4">
                      <span className="text-primary-400 font-semibold">{index + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-primary-50 truncate">{playlist.name}</p>
                      <div className="mt-1 w-full bg-primary-700 rounded-full h-2">
                        <div 
                          className="bg-primary-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (playlist.plays / (topPlaylists[0]?.plays || 1)) * 100)}%` }}
                        ></div>
                      </div>
                      <p className="mt-1 text-xs text-primary-400">{playlist.plays.toLocaleString()} plays</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-primary-400">
                No playlist data available
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}