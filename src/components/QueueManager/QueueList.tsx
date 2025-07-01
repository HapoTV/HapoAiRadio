import React, { useState, useCallback, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { format } from 'date-fns';
import { useAudio } from '../../contexts/AudioContext';
import { 
  XMarkIcon, 
  MusicalNoteIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';
import type { Track } from '../../types';
import toast from 'react-hot-toast';

interface SavePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

function SavePlaylistModal({ isOpen, onClose, onSave }: SavePlaylistModalProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }
    
    setSaving(true);
    try {
      await onSave(name);
      setName('');
      onClose();
    } catch (error) {
      console.error('Error saving playlist:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-primary-800 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-primary-50 mb-4">Save Queue as Playlist</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter playlist name"
            className="w-full bg-primary-700 border border-primary-600 rounded-lg px-4 py-2 text-primary-50 mb-4"
          />
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-primary-400 hover:text-primary-300"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function QueueList() {
  const { 
    currentTrack,
    queue,
    isPlaying,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    setCurrentTrack,
    togglePlayPause,
    getTotalQueueDuration,
    saveQueueAsPlaylist
  } = useAudio();
  
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  useEffect(() => {
    // Listen for toggle-queue event from Header component
    const handleToggleQueue = () => {
      // This would be handled by the parent component that controls queue visibility
      document.dispatchEvent(new CustomEvent('queue-toggled'));
    };
    
    document.addEventListener('toggle-queue', handleToggleQueue);
    return () => {
      document.removeEventListener('toggle-queue', handleToggleQueue);
    };
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItemId(null);
    
    if (!over) return;
    
    if (active.id !== over.id) {
      const oldIndex = queue.findIndex((track) => track.id === active.id);
      const newIndex = queue.findIndex((track) => track.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderQueue(oldIndex, newIndex);
      }
    }
  }, [queue, reorderQueue]);

  const handleDragStart = useCallback((event: DragEndEvent) => {
    setDraggedItemId(event.active.id as string);
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const handlePlayTrack = useCallback((track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      setCurrentTrack(track);
    }
  }, [currentTrack, togglePlayPause, setCurrentTrack]);

  const totalDuration = getTotalQueueDuration();
  const totalTracks = queue.length + (currentTrack ? 1 : 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-primary-700">
        <div>
          <h3 className="text-lg font-medium text-primary-50">Queue</h3>
          <p className="text-sm text-primary-400">
            {totalTracks} {totalTracks === 1 ? 'track' : 'tracks'} • {formatDuration(totalDuration)}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSaveModal(true)}
            className="p-2 text-primary-400 hover:text-primary-300"
            title="Save as playlist"
            disabled={totalTracks === 0}
            aria-label="Save as playlist"
          >
            <BookmarkIcon className="h-5 w-5" />
          </button>
          <button
            onClick={clearQueue}
            className="p-2 text-primary-400 hover:text-status-error"
            title="Clear queue"
            disabled={totalTracks === 0}
            aria-label="Clear queue"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {currentTrack && (
          <div className="p-4 border-b border-primary-700">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handlePlayTrack(currentTrack)}
                className="p-2 text-primary-400 hover:text-primary-300"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <PauseIcon className="h-5 w-5 text-primary-500" />
                ) : (
                  <PlayIcon className="h-5 w-5 text-primary-500" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-primary-50 font-medium truncate">
                  {currentTrack.title}
                </p>
                <p className="text-sm text-primary-400 truncate">
                  {currentTrack.artist || 'Unknown Artist'}
                </p>
              </div>
              <span className="text-sm text-primary-400">
                {formatDuration(currentTrack.duration)}
              </span>
            </div>
          </div>
        )}

        <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
          <SortableContext
            items={queue.map(track => track.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1 p-2">
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-primary-400 p-8">
                  <MusicalNoteIcon className="h-12 w-12 mb-4" />
                  <p className="text-center">Your queue is empty. Add some tracks to get started!</p>
                </div>
              ) : (
                queue.map((track, index) => (
                  <div
                    key={`${track.id}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-primary-700 hover:bg-primary-600 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <button
                        onClick={() => handlePlayTrack(track)}
                        className="p-2 text-primary-400 hover:text-primary-300"
                        aria-label="Play track"
                      >
                        <PlayIcon className="h-5 w-5" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-primary-50 font-medium truncate">
                          {track.title}
                        </p>
                        <p className="text-sm text-primary-400 truncate">
                          {track.artist || 'Unknown Artist'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-primary-400">
                        {formatDuration(track.duration)}
                      </span>
                      <button
                        onClick={() => removeFromQueue(index)}
                        className="p-2 text-primary-400 hover:text-status-error"
                        aria-label="Remove from queue"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SortableContext>

          <DragOverlay>
            {draggedItemId ? (
              <div className="p-3 rounded-lg bg-primary-600 shadow-lg border border-primary-500">
                {queue.find(track => track.id === draggedItemId)?.title || 'Track'}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <SavePlaylistModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={saveQueueAsPlaylist}
      />
    </div>
  );
}