import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAudio } from '../contexts/AudioContext';
import { RemoteControlPanel } from '../components/RemoteControl';
import { CommercialScheduler } from '../components/RemoteControl/CommercialScheduler';
import { PlayoutController } from '../components/PlayoutAutomation';
import { RadioPlayer } from '../components/RadioManager';
import { RadioGroup } from '../components/RemoteControl/RadioGroup';
import type { Store, Playlist } from '../types';
import toast from 'react-hot-toast';
import { getStorePlaylists } from '../lib/supabase';

const transmissionOptions = [
  { label: 'Live', value: 'live' },
  { label: 'Pre-Recorded', value: 'pre-recorded' },
];

export default function RadioControl() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [storePlaylists, setStorePlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [transmissionMode, setTransmissionMode] = useState('live');
  const { currentTrack } = useAudio();

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('stores').select('*').order('name');
        if (error) throw error;
        setStores(data || []);
        if (data && data.length > 0 && !selectedStore) {
          setSelectedStore(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching stores:', error);
        toast.error('Failed to load stores');
      } finally {
        setLoading(false);
      }
    };

    fetchStores();

    const subscription = supabase
      .channel('stores')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stores',
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

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedStore]);

  useEffect(() => {
    const fetchPlaylists = async () => {
      if (selectedStore) {
        try {
          const playlists = await getStorePlaylists(selectedStore);
          setStorePlaylists(playlists);
        } catch (error) {
          console.error('Error fetching store playlists:', error);
          toast.error('Failed to load store playlists');
          setStorePlaylists([]);
        }
      } else {
        setStorePlaylists([]);
      }
    };

    fetchPlaylists();
  }, [selectedStore]);

  const handleStoreChange = useCallback((storeId: string) => {
    setSelectedStore(storeId);
  }, []);

  const handleEmergencyBroadcast = useCallback(async () => {
    if (!selectedStore) {
      toast.error('Please select a store first');
      return;
    }

    try {
      const message = prompt('Enter emergency message:');
      if (!message) return;

      const { error } = await supabase.from('emergency_queue').insert([{
        store_id: selectedStore,
        message,
        priority: 10,
        start_time: new Date().toISOString(),
        is_active: true,
        created_by: supabase.auth.getUser().then(({ data }) => data.user?.id)
      }]);

      if (error) throw error;
      toast.success('Emergency broadcast sent');
    } catch (error) {
      console.error('Error sending emergency broadcast:', error);
      toast.error('Failed to send emergency broadcast');
    }
  }, [selectedStore]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-primary-800 rounded w-1/4"></div>
        <div className="h-64 bg-primary-800 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary-50">Radio Control</h1>
        <div className="flex items-center space-x-4">
          <select
            value={selectedStore || ''}
            onChange={(e) => handleStoreChange(e.target.value)}
            className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-2 text-primary-50"
          >
            <option value="">Select a store</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name} ({store.status})
              </option>
            ))}
          </select>
          
          <button
            onClick={handleEmergencyBroadcast}
            className="px-4 py-2 bg-status-errorBg text-status-error rounded-lg hover:bg-status-error/20"
          >
            Emergency Broadcast
          </button>
        </div>
      </div>

      <RadioGroup
        options={transmissionOptions}
        selectedValue={transmissionMode}
        onChange={setTransmissionMode}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RemoteControlPanel
          storeId={selectedStore || ''}
          status={{ isConnected: selectedStore !== null, lastPing: new Date() }}
        />
        <PlayoutController />
      </div>

      {selectedStore && <RadioPlayer storeId={selectedStore} storePlaylists={storePlaylists} autoConnect={false} />}
      {selectedStore && <CommercialScheduler storeId={selectedStore} />}

      <div className="bg-primary-800 rounded-xl p-6">
        <h2 className="text-lg font-medium text-primary-50 mb-4">Store Status</h2>
        
        <div className="overflow-hidden shadow ring-1 ring-primary-700 rounded-lg">
          <table className="min-w-full divide-y divide-primary-700">
            <thead className="bg-primary-800">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-primary-50 sm:pl-6">Store</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-50">Status</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-50">Now Playing</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-50">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-700 bg-primary-800">
              {stores.map((store) => (
                <tr key={store.id} className={selectedStore === store.id ? 'bg-primary-700' : ''}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-primary-50 sm:pl-6">{store.name}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      store.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {store.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-primary-400">
                    {selectedStore === store.id && currentTrack 
                      ? `${currentTrack.title} - ${currentTrack.artist || 'Unknown'}`
                      : 'Not available'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-primary-400">
                    {new Date().toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              
              {stores.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-sm text-center text-primary-400">
                    No stores available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}