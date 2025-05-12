import { useState, useCallback, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useImmer } from 'use-immer';
import { format } from 'date-fns';
import type { QueuedTrack, SchedulingRule, SchedulingConflict } from '../../types/radio';
import { TrackList } from './TrackList';
import { QueuedTrackList } from './QueuedTrackList';
import { SchedulingRules } from './SchedulingRules';
import SearchInput from '../Search/SearchInput';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Props {
  playlistId?: string;
  storeId?: string;
  onSave: (queue: QueuedTrack[]) => void;
}

export default function RadioQueueBuilder({ playlistId, storeId, onSave }: Props) {
  const [availableTracks, setAvailableTracks] = useState<QueuedTrack[]>([]);
  const [queuedTracks, updateQueuedTracks] = useImmer<QueuedTrack[]>([]);
  const [rules, setRules] = useState<SchedulingRule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | undefined>(playlistId);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (selectedPlaylist) {
      fetchPlaylistTracks(selectedPlaylist);
    } else {
      fetchAllTracks();
    }
  }, [selectedPlaylist]);

  const fetchPlaylistTracks = async (playlistId: string) => {
    try {
      const { data, error } = await supabase
        .from('playlist_tracks')
        .select(`
          track_id,
          tracks (*)
        `)
        .eq('playlist_id', playlistId)
        .order('position');

      if (error) throw error;

      const tracks = data
        .map(item => ({
          ...item.tracks,
          queueId: crypto.randomUUID(),
          sourceType: 'auto', // Changed from 'playlist' to 'auto'
          sourcePlaylist: { id: playlistId },
        }))
        .filter(track => track !== null);

      setAvailableTracks(tracks);
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      toast.error('Failed to load tracks');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('title');

      if (error) throw error;

      const tracks = data.map(track => ({
        ...track,
        queueId: crypto.randomUUID(),
        sourceType: 'user', // Changed from 'library' to 'user'
      }));

      setAvailableTracks(tracks);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast.error('Failed to load tracks');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    if (active.id !== over.id) {
      updateQueuedTracks((draft) => {
        const oldIndex = draft.findIndex((track) => track.queueId === active.id);
        const newIndex = draft.findIndex((track) => track.queueId === over.id);
        return arrayMove(draft, oldIndex, newIndex);
      });
    }

    setActiveId(null);
  };

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleAddToQueue = (track: QueuedTrack) => {
    const newTrack = { 
      ...track, 
      queueId: crypto.randomUUID(),
      scheduledTime: new Date().toISOString(),
    };
    updateQueuedTracks((draft) => {
      draft.push(newTrack);
    });
  };

  const handleRemoveFromQueue = (queueId: string) => {
    updateQueuedTracks((draft) => {
      const index = draft.findIndex((track) => track.queueId === queueId);
      if (index !== -1) {
        draft.splice(index, 1);
      }
    });
  };

  const handleSave = async () => {
    if (!storeId) {
      toast.error('Please select a store first');
      return;
    }

    // Check for critical conflicts
    const hasErrors = queuedTracks.some(track => 
      track.conflicts?.some(conflict => conflict.severity === 'error')
    );

    if (hasErrors) {
      toast.error('Please resolve scheduling conflicts before saving');
      return;
    }

    setSaving(true);
    try {
      // Create a new playlist with the queue
      const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .insert([{
          name: `Queue - ${format(new Date(), 'MMM d, yyyy HH:mm')}`,
          store_id: storeId,
          description: 'Auto-generated queue from Radio Manager'
        }])
        .select()
        .single();

      if (playlistError) throw playlistError;

      // Add tracks to the playlist
      const playlistTracks = queuedTracks.map((track, index) => ({
        playlist_id: playlist.id,
        track_id: track.id,
        position: index
      }));

      const { error: tracksError } = await supabase
        .from('playlist_tracks')
        .insert(playlistTracks);

      if (tracksError) throw tracksError;

      // Add to queue
      const queueItems = queuedTracks.map((track, index) => ({
        playlist_id: playlist.id,
        track_id: track.id,
        position: index,
        source_type: track.sourceType, // Now using the correct source_type values ('user', 'auto', or 'store')
        source_playlist_id: track.sourcePlaylist?.id,
        metadata: {
          scheduledTime: track.scheduledTime,
          conflicts: track.conflicts
        }
      }));

      const { error: queueError } = await supabase
        .from('playlist_queue')
        .insert(queueItems);

      if (queueError) throw queueError;

      toast.success('Queue saved successfully');
      onSave(queuedTracks);
    } catch (error: any) {
      console.error('Error saving queue:', error);
      toast.error(error.message || 'Failed to save queue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full gap-6">
      <div className="w-1/3 bg-primary-800 rounded-xl p-6">
        <h2 className="text-lg font-medium text-primary-50 mb-4">Music Library</h2>
        <SearchInput
          onSearch={setSearchQuery}
          placeholder="Search tracks..."
          className="mb-4"
        />
        <TrackList
          tracks={availableTracks}
          onTrackSelect={handleAddToQueue}
          searchQuery={searchQuery}
        />
      </div>

      <div className="flex-1 bg-primary-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-primary-50">Queue</h2>
          <button
            onClick={handleSave}
            disabled={queuedTracks.length === 0 || saving}
            className="px-4 py-2 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Queue'}
          </button>
        </div>

        <DndContext
          sensors={sensors}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
        >
          <SortableContext
            items={queuedTracks.map(t => t.queueId)}
            strategy={verticalListSortingStrategy}
          >
            <QueuedTrackList
              tracks={queuedTracks}
              onRemove={handleRemoveFromQueue}
            />
          </SortableContext>

          <DragOverlay>
            {activeId ? (
              <div className="bg-primary-700 p-4 rounded-lg shadow-lg">
                {queuedTracks.find(t => t.queueId === activeId)?.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <div className="w-1/4 bg-primary-800 rounded-xl p-6">
        <h2 className="text-lg font-medium text-primary-50 mb-4">Scheduling Rules</h2>
        <SchedulingRules
          rules={rules}
          onChange={setRules}
        />
      </div>
    </div>
  );
}