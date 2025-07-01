import React from 'react';
import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { supabase } from '../../lib/supabase';
import type { Track } from '../../types';
import toast from 'react-hot-toast';
import debounce from 'lodash.debounce';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PlaylistCreator({ isOpen, onClose, onSuccess }: Props) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTracks();
    }
  }, [isOpen]);

  useEffect(() => {
    filterTracks();
  }, [searchQuery, tracks]);

  const fetchTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('title');
      
      if (error) throw error;
      setTracks(data || []);
      setFilteredTracks(data || []);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast.error('Failed to load tracks');
    } finally {
      setLoading(false);
    }
  };

  const filterTracks = debounce(() => {
    if (!searchQuery.trim()) {
      setFilteredTracks(tracks);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = tracks.filter(track => 
      track.title.toLowerCase().includes(query) ||
      (track.artist && track.artist.toLowerCase().includes(query))
    );
    setFilteredTracks(filtered);
  }, 300);

  const handleTrackSelect = (track: Track) => {
    if (selectedTracks.some(t => t.id === track.id)) {
      setSelectedTracks(selectedTracks.filter(t => t.id !== track.id));
    } else {
      setSelectedTracks([...selectedTracks, track]);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(selectedTracks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSelectedTracks(items);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a playlist title');
      return;
    }
    if (selectedTracks.length === 0) {
      toast.error('Please select at least one track');
      return;
    }

    setSaving(true);
    try {
      // Create the playlist
      const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .insert([{ name: title }])
        .select()
        .single();

      if (playlistError) throw playlistError;

      // Add tracks to the playlist
      const playlistTracks = selectedTracks.map((track, index) => ({
        playlist_id: playlist.id,
        track_id: track.id,
        position: index,
      }));

      const { error: tracksError } = await supabase
        .from('playlist_tracks')
        .insert(playlistTracks);

      if (tracksError) throw tracksError;

      toast.success('Playlist created successfully');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error creating playlist:', error);
      toast.error(error.message || 'Failed to create playlist');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setSearchQuery('');
    setSelectedTracks([]);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full rounded-xl bg-primary-800 shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-primary-700">
            <Dialog.Title className="text-lg font-medium text-primary-50">
              Create New Playlist
            </Dialog.Title>
            <button
              type="button"
              onClick={handleClose}
              className="text-primary-400 hover:text-primary-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-primary-200">
                Playlist Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 placeholder:text-primary-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                placeholder="My Awesome Playlist"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tracks..."
                      className="w-full pl-10 pr-4 py-2 bg-primary-700 border border-primary-600 rounded-lg text-primary-50 placeholder-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="h-96 overflow-y-auto space-y-2">
                  {filteredTracks.map((track) => (
                    <div
                      key={track.id}
                      onClick={() => handleTrackSelect(track)}
                      className={`
                        flex items-center p-4 rounded-lg cursor-pointer
                        ${selectedTracks.some(t => t.id === track.id)
                          ? 'bg-primary-600'
                          : 'bg-primary-700 hover:bg-primary-600'
                        }
                      `}
                    >
                      <div>
                        <p className="text-primary-50 font-medium">{track.title}</p>
                        <p className="text-primary-400 text-sm">{track.artist || 'Unknown Artist'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-primary-200 mb-4">
                  Selected Tracks ({selectedTracks.length})
                </h3>
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="selected-tracks">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="h-96 overflow-y-auto space-y-2"
                      >
                        {selectedTracks.map((track, index) => (
                          <Draggable
                            key={track.id}
                            draggableId={track.id}
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="bg-primary-700 p-4 rounded-lg"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-primary-50 font-medium">{track.title}</p>
                                    <p className="text-primary-400 text-sm">{track.artist || 'Unknown Artist'}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleTrackSelect(track)}
                                    className="text-primary-400 hover:text-primary-300"
                                  >
                                    <XMarkIcon className="h-5 w-5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md bg-primary-700 px-3 py-2 text-sm font-semibold text-primary-50 shadow-sm hover:bg-primary-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`
                  rounded-md bg-primary-500 px-3 py-2 text-sm font-semibold text-primary-50 shadow-sm
                  hover:bg-primary-400 focus-visible:outline focus-visible:outline-2
                  focus-visible:outline-offset-2 focus-visible:outline-primary-500
                  ${saving ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {saving ? 'Creating...' : 'Create Playlist'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}