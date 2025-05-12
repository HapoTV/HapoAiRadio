import React from 'react';
import { useState, useCallback } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverEvent,
  DragStartEvent,
  useSensors,
  useSensor,
  PointerSensor,
  closestCenter
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  XMarkIcon, 
  MusicalNoteIcon,
  PlayIcon,
  TrashIcon
} from '@heroicons/react/24/solid';
import type { Track } from '../../types';
import { useMusicStore } from '../../store/musicStore';
import toast from 'react-hot-toast';

interface QueueItemProps {
  track: Track;
  index: number;
  isCurrentTrack: boolean;
  onRemove: (index: number) => void;
  onPlay: (track: Track) => void;
}

function QueueItem({ track, index, isCurrentTrack, onRemove, onPlay }: QueueItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: `${track.id}-${index}` });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };
  
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        flex items-center justify-between p-3 rounded-lg 
        ${isCurrentTrack ? 'bg-primary-600' : 'bg-primary-700'} 
        hover:bg-primary-600/80 transition-colors cursor-grab
      `}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay(track);
          }}
          className="p-2 rounded-full bg-primary-500/30 hover:bg-primary-500/50 transition-colors"
          aria-label="Play"
        >
          <PlayIcon className="h-4 w-4 text-primary-50" />
        </button>
        
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-primary-50 truncate">
            {track.title}
          </p>
          <p className="text-xs text-primary-400 truncate">
            {track.artist || 'Unknown Artist'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <span className="text-xs text-primary-400">
          {formatDuration(track.duration)}
        </span>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
          className="p-1 text-primary-400 hover:text-status-error"
          aria-label="Remove from queue"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface PlayQueueProps {
  className?: string;
}

export default function PlayQueue({ className = '' }: PlayQueueProps) {
  const { 
    currentTrack, 
    queue, 
    setCurrentTrack, 
    addToQueue, 
    removeFromQueue, 
    reorderQueue,
    clearQueue
  } = useMusicStore();
  
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);
  
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;
    
    if (active.id !== over.id) {
      // Extract indices from the composite IDs (format: "trackId-index")
      const activeIdParts = (active.id as string).split('-');
      const overIdParts = (over.id as string).split('-');
      
      if (activeIdParts.length > 1 && overIdParts.length > 1) {
        const oldIndex = parseInt(activeIdParts[activeIdParts.length - 1]);
        const newIndex = parseInt(overIdParts[overIdParts.length - 1]);
        
        reorderQueue(oldIndex, newIndex);
      }
    }
  }, [reorderQueue]);
  
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    // Handle dropping a library track into the queue
    if (active.id !== over.id && !active.id.toString().includes('-')) {
      const trackId = active.id as string;
      const track = active.data.current as Track;
      
      if (track) {
        addToQueue(track);
        toast.success(`Added "${track.title}" to queue`);
      }
    }
  }, [addToQueue]);
  
  const handlePlay = useCallback((track: Track) => {
    setCurrentTrack(track);
  }, [setCurrentTrack]);
  
  const handleRemove = useCallback((index: number) => {
    removeFromQueue(index);
  }, [removeFromQueue]);
  
  const getTotalDuration = useCallback(() => {
    return queue.reduce((total, track) => total + track.duration, 0);
  }, [queue]);
  
  const formatTotalDuration = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);
  
  return (
    <div className={`bg-primary-800 rounded-xl p-6 shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium text-primary-50">Play Queue</h2>
          <p className="text-sm text-primary-400">
            {queue.length} {queue.length === 1 ? 'track' : 'tracks'} • {formatTotalDuration(getTotalDuration())}
          </p>
        </div>
        
        {queue.length > 0 && (
          <button
            onClick={clearQueue}
            className="p-2 text-primary-400 hover:text-status-error"
            aria-label="Clear queue"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        {queue.length > 0 ? (
          <SortableContext
            items={queue.map((track, index) => `${track.id}-${index}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {queue.map((track, index) => (
                <QueueItem
                  key={`${track.id}-${index}`}
                  track={track}
                  index={index}
                  isCurrentTrack={currentTrack?.id === track.id}
                  onRemove={handleRemove}
                  onPlay={handlePlay}
                />
              ))}
            </div>
          </SortableContext>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-primary-400">
            <MusicalNoteIcon className="h-12 w-12 mb-4" />
            <p>Your queue is empty</p>
            <p className="text-sm mt-2">Drag tracks here to add them to the queue</p>
          </div>
        )}
      </DndContext>
    </div>
  );
}