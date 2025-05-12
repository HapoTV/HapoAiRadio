import React from 'react';
import { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useDebounce } from 'use-debounce';
import { MagnifyingGlassIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';
import type { Track } from '../../types';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Props {
  tracks: Track[];
  onTrackReorder?: (tracks: Track[]) => void;
  onTrackDelete?: (trackId: string) => void;
}

export default function TrackList({ tracks: initialTracks, onTrackReorder, onTrackDelete }: Props) {
  const [tracks, setTracks] = useState(initialTracks);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);

  const handleDragEnd = useCallback((result: any) => {
    if (!result.destination) return;

    const reorderedTracks = Array.from(tracks);
    const [movedTrack] = reorderedTracks.splice(result.source.index, 1);
    reorderedTracks.splice(result.destination.index, 0, movedTrack);

    setTracks(reorderedTracks);
    if (onTrackReorder) {
      onTrackReorder(reorderedTracks);
    }
  }, [tracks, onTrackReorder]);

  const handleDelete = async (trackId: string, fileUrl: string) => {
    try {
      // Delete file from storage
      const filePath = fileUrl.split('/tracks/')[1];
      if (!filePath) throw new Error('Invalid file URL');

      const { error: storageError } = await supabase.storage
        .from('tracks')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete track from database
      const { error: dbError } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (dbError) throw dbError;

      // Update local state
      setTracks(tracks.filter(t => t.id !== trackId));
      if (onTrackDelete) {
        onTrackDelete(trackId);
      }

      toast.success('Track deleted successfully');
    } catch (error: any) {
      console.error('Error deleting track:', error);
      toast.error(error.message || 'Failed to delete track');
    }
  };

  // Filter tracks based on search query
  const filteredTracks = tracks.filter(track => {
    if (!debouncedQuery) return true;
    
    const query = debouncedQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(query) ||
      (track.artist && track.artist.toLowerCase().includes(query)) ||
      (track.genre && track.genre.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-4">
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

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="tracks">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {filteredTracks.map((track, index) => (
                <Draggable
                  key={track.id}
                  draggableId={track.id}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`
                        flex items-center justify-between p-4 rounded-lg
                        ${snapshot.isDragging ? 'bg-primary-600' : 'bg-primary-700'}
                        transition-colors duration-200
                      `}
                    >
                      <div className="flex items-center space-x-4">
                        <MusicalNoteIcon className="h-5 w-5 text-primary-400" />
                        <div>
                          <p className="text-primary-50 font-medium">{track.title}</p>
                          <p className="text-primary-400 text-sm">
                            {track.artist || 'Unknown Artist'}
                            {track.genre && ` • ${track.genre}`}
                          </p>
                        </div>
                      </div>
                      {onTrackDelete && (
                        <button
                          onClick={() => handleDelete(track.id, track.file_url)}
                          className="text-status-error hover:text-status-errorHover transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {filteredTracks.length === 0 && (
        <p className="text-center text-primary-400 py-4">
          {searchQuery ? 'No tracks found' : 'No tracks available'}
        </p>
      )}
    </div>
  );
}