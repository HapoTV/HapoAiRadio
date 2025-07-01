import React from 'react';
import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { TrashIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import type { Track } from '../../types';
import toast from 'react-hot-toast';
import PlaylistSegments from './PlaylistSegments';
import AdBreakScheduler from './AdBreakScheduler';
import SchedulePatternEditor from './SchedulePatternEditor';
import EmergencyOverrideManager from './EmergencyOverrideManager';

interface PlaylistTrack {
  id: string;
  track: Track;
  position: number;
}

interface Props {
  playlistId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PlaylistEditor({ playlistId, onClose, onUpdate }: Props) {
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'tracks' | 'segments' | 'scheduling'>('tracks');

  useEffect(() => {
    fetchPlaylistTracks();
  }, [playlistId]);

  const fetchPlaylistTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('playlist_tracks')
        .select(`
          id,
          position,
          tracks (*)
        `)
        .eq('playlist_id', playlistId)
        .order('position');

      if (error) throw error;

      const formattedTracks = data.map(item => ({
        id: item.id,
        track: item.tracks as Track,
        position: item.position
      }));

      setTracks(formattedTracks);
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      toast.error('Failed to load playlist tracks');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(tracks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const updatedTracks = items.map((item, index) => ({
      ...item,
      position: index
    }));

    setTracks(updatedTracks);

    try {
      setSaving(true);
      const updates = updatedTracks.map(track => ({
        id: track.id,
        position: track.position
      }));

      const { error } = await supabase
        .from('playlist_tracks')
        .upsert(updates);

      if (error) throw error;
      toast.success('Track order updated');
      onUpdate();
    } catch (error) {
      console.error('Error updating track positions:', error);
      toast.error('Failed to update track order');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('playlist_tracks')
        .delete()
        .eq('id', trackId);

      if (error) throw error;

      setTracks(tracks.filter(t => t.id !== trackId));
      toast.success('Track removed from playlist');
      onUpdate();
    } catch (error) {
      console.error('Error removing track:', error);
      toast.error('Failed to remove track');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-primary-700 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-primary-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('tracks')}
            className={`
              border-b-2 py-4 px-1 text-sm font-medium
              ${activeTab === 'tracks'
                ? 'border-primary-500 text-primary-50'
                : 'border-transparent text-primary-400 hover:text-primary-300 hover:border-primary-300'
              }
            `}
          >
            Tracks
          </button>
          <button
            onClick={() => setActiveTab('segments')}
            className={`
              border-b-2 py-4 px-1 text-sm font-medium
              ${activeTab === 'segments'
                ? 'border-primary-500 text-primary-50'
                : 'border-transparent text-primary-400 hover:text-primary-300 hover:border-primary-300'
              }
            `}
          >
            Segments
          </button>
          <button
            onClick={() => setActiveTab('scheduling')}
            className={`
              border-b-2 py-4 px-1 text-sm font-medium
              ${activeTab === 'scheduling'
                ? 'border-primary-500 text-primary-50'
                : 'border-transparent text-primary-400 hover:text-primary-300 hover:border-primary-300'
              }
            `}
          >
            Scheduling
          </button>
        </nav>
      </div>

      {activeTab === 'tracks' && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="playlist">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {tracks.map((item, index) => (
                  <Draggable
                    key={item.id}
                    draggableId={item.id}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="flex items-center justify-between bg-primary-700 p-4 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <span className="text-primary-400">{index + 1}</span>
                          <div>
                            <p className="text-primary-50 font-medium">{item.track.title}</p>
                            <p className="text-primary-400 text-sm">
                              {item.track.artist || 'Unknown Artist'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveTrack(item.id)}
                          disabled={saving}
                          className="p-2 text-status-error hover:text-status-errorHover disabled:opacity-50"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {activeTab === 'segments' && (
        <PlaylistSegments
          playlistId={playlistId}
          onUpdate={onUpdate}
        />
      )}

      {activeTab === 'scheduling' && (
        <div className="space-y-8">
          <AdBreakScheduler
            segmentId={playlistId}
            onUpdate={onUpdate}
          />
          <SchedulePatternEditor
            segmentId={playlistId}
            onUpdate={onUpdate}
          />
          <EmergencyOverrideManager
            onUpdate={onUpdate}
          />
        </div>
      )}

      <div className="flex justify-end space-x-4 pt-4 border-t border-primary-700">
        <button
          onClick={onClose}
          className="px-4 py-2 text-primary-200 hover:text-primary-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}