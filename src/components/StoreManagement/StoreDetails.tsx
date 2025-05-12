import React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Store, Playlist } from '../../types';
import { PlaylistGrid } from '../MusicLibrary';
import StoreForm from './StoreForm';
import toast from 'react-hot-toast';

export default function StoreDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchStoreData();
    }
  }, [id]);

  const fetchStoreData = async () => {
    try {
      const [storeResponse, playlistsResponse] = await Promise.all([
        supabase
          .from('stores')
          .select('*')
          .eq('id', id)
          .single(),
        supabase
          .from('playlists')
          .select('*')
          .eq('store_id', id)
          .order('created_at', { ascending: false }),
      ]);

      if (storeResponse.error) throw storeResponse.error;
      if (playlistsResponse.error) throw playlistsResponse.error;

      setStore(storeResponse.data);
      setPlaylists(playlistsResponse.data || []);
    } catch (error) {
      console.error('Error fetching store data:', error);
      toast.error('Failed to load store data');
      navigate('/stores');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = () => {
    fetchStoreData();
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-primary-800 rounded w-1/4"></div>
        <div className="h-64 bg-primary-800 rounded"></div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <p className="text-primary-400">Store not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-primary-50 mb-6">Store Details</h1>
        <div className="bg-primary-800 rounded-xl p-6">
          <StoreForm
            store={store}
            onSubmit={handleFormSubmit}
            onCancel={() => navigate('/stores')}
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-primary-50 mb-4">Store Playlists</h2>
        <PlaylistGrid
          playlists={playlists}
          onRefresh={fetchStoreData}
          onPlay={() => {}}
        />
      </div>
    </div>
  );
}