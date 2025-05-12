import React from 'react';
import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { XMarkIcon, MusicalNoteIcon, TrashIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import type { Track } from '../../types';
import toast from 'react-hot-toast';
import TrackSelector from './TrackSelector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  playlistId: string;
  onUpdate: () => void;
}

interface PlaylistTrack {
  id: string;
  track: Track;
  position: number;
}

export default function PlaylistTrackEditor({ isOpen, onClose, playlistId, onUpdate }: Props) {
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTrackSelector, setShowTrackSelector] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPlaylistTracks();
    }
  }, [isOpen, playlistId]);

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
        playlist_id: playlistId,
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

  const handleAddTracks = async (selectedTrackIds: string[]) => {
    try {
      setSaving(true);
      const newTracks = selectedTrackIds.map((trackId, index) => ({
        playlist_id: playlistId,
        track_id: trackId,
        position: tracks.length + index
      }));

      const { error } = await supabase
        .from('playlist_tracks')
        .insert(newTracks);

      if (error) throw error;

      await fetchPlaylistTracks();
      setShowTrackSelector(false);
      toast.success('Tracks added to playlist');
      onUpdate();
    } catch (error) {
      console.error('Error adding tracks:', error);
      toast.error('Failed to add tracks');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-xl bg-primary-800 shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-primary-700">
            <Dialog.Title className="text-lg font-medium text-primary-50">
              Edit Playlist Tracks
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-primary-400 hover:text-primary-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-primary-700 rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowTrackSelector(true)}
                    className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
                  >
                    <MusicalNoteIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                    Add Tracks
                  </button>
                </div>

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

                {tracks.length === 0 && (
                  <div className="text-center py-8">
                    <MusicalNoteIcon className="mx-auto h-12 w-12 text-primary-600" />
                    <p className="mt-2 text-sm text-primary-400">
                      No tracks in this playlist. Click "Add Tracks" to get started.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </Dialog.Panel>
      </div>

      {showTrackSelector && (
        <Dialog
          open={true}
          onClose={() => setShowTrackSelector(false)}
          className="relative z-[60]"
        >
          <div className="fixed inset-0 bg-black/80" aria-hidden="true" />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-xl w-full rounded-xl bg-primary-800 shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-primary-700">
                <Dialog.Title className="text-lg font-medium text-primary-50">
                  Add Tracks
                </Dialog.Title>
                <button
                  type="button"
                  onClick={() => setShowTrackSelector(false)}
                  className="text-primary-400 hover:text-primary-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                <TrackSelector
                  selectedTracks={[]}
                  onTrackSelect={handleAddTracks}
                  mode="multi"
                />
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </Dialog>
  );
}