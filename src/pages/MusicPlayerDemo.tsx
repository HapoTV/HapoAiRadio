import React, { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
} from '@dnd-kit/core';
import { 
  MusicPlayer, 
  TrackLibrary, 
  PlayQueue,
  CommercialLibrary
} from '../components/MusicPlayer';
import { useMusicStore } from '../store/musicStore';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function MusicPlayerDemo() {
  const { currentTrack, playQueue } = useMusicStore();

  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const { data: stores, error } = await supabase
          .from('stores')
          .select('id, name');
        if (error) {
          console.error('Error fetching stores:', error);
          return;
        }
        setStores(stores);

        if (stores.length > 0) {
          setSelectedStoreId(stores[0].id);
        }
      } catch (error) {
        console.error('Error fetching stores:', error);
      }
    };

    fetchStores();
  }, []);

  const handleStoreChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStoreId(event.target.value);
  };

  const handleSaveQueue = async () => {
    if (!selectedStoreId) {
      toast.error('Please select a store first');
      return;
    }

    if (!playQueue || !Array.isArray(playQueue) || playQueue.length === 0) {
      toast.error('No tracks in the queue to save');
      return;
    }
    
    try {
      const tracksToSave = playQueue.map(track => ({
        store_id: selectedStoreId,
        track_id: track.id,
        added_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('store_radio_player')
        .insert(tracksToSave);

      if (error) throw error;
      toast.success('PlayQueue saved successfully to Radio Player');
    } catch (error) {
      console.error('Failed to save playQueue:', error);
      toast.error('Failed to save PlayQueue');
    }
  };

  useEffect(() => {
    if (!currentTrack || !selectedStoreId) return;

    const recordPlay = async () => {
      try {
        const { data: store, error } = await supabase
          .from('stores')
          .select('id')
          .eq('id', selectedStoreId)
          .single();
        if (error) {
          console.error('Error verifying store:', error);
          return;
        }
        if (store) {
          await supabase.from('track_plays').insert({
            track_id: currentTrack.id,
            store_id: selectedStoreId,
            played_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Failed to record track play:', error);
      }
    };

    recordPlay();
  }, [currentTrack, selectedStoreId]);

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-primary-50 text-center mb-6">Music Player</h1>

      {/* Store search + selection */}
      <div className="mb-8 space-y-4">
        <label htmlFor="storeFilter" className="text-primary-400 block">
          Search & Select Store
        </label>
        <input
          type="text"
          id="storeFilter"
          placeholder="Type to filter stores..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="w-full px-4 py-2 bg-primary-800 text-primary-100 rounded-lg"
        />

        <select
          id="storeSelect"
          value={selectedStoreId || ''}
          onChange={handleStoreChange}
          className="w-full mt-1 px-4 py-2 bg-primary-700 text-primary-50 rounded-lg"
        >
          {stores
            .filter((store) => store.name.toLowerCase().includes(filterText.toLowerCase()))
            .map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
        </select>

        <button
          onClick={handleSaveQueue}
          className="w-full px-4 py-2 mt-6 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500"
        >
          Save Queue
        </button>
      </div>

      <DndContext sensors={sensors}>
        <div className="space-y-6 bg-primary-800 p-6 rounded-lg shadow-lg">
          <MusicPlayer />
          <PlayQueue className="mt-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <TrackLibrary />
            <CommercialLibrary />
          </div>
        </div>

        <DragOverlay>
          {currentTrack && (
            <div className="p-3 rounded-lg bg-primary-600 shadow-lg border border-primary-500 w-64">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-700 rounded flex items-center justify-center flex-shrink-0">
                  <div className="text-lg text-primary-500">♪</div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-primary-50 truncate">
                    {currentTrack.title}
                  </p>
                  <p className="text-xs text-primary-400 truncate">
                    {currentTrack.artist || 'Unknown Artist'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}