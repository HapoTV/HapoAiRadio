import React, { useState, useEffect, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  PlayIcon, 
  PauseIcon, 
  MagnifyingGlassIcon,
  QueueListIcon
} from '@heroicons/react/24/solid';
import type { Advertisement } from '../../types';
import { useMusicStore } from '../../store/musicStore';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { debounce } from 'lodash';

// Helper function to format durations
const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

interface CommercialItemProps {
  commercial: Advertisement;
  isPlaying: boolean;
  isCurrentCommercial: boolean;
  onPlay: (commercial: Advertisement) => void;
  onAddToQueue: (commercial: Advertisement) => void;
}

const CommercialItem = React.memo(({ commercial, isPlaying, isCurrentCommercial, onPlay, onAddToQueue }: CommercialItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: commercial.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        flex items-center justify-between p-3 rounded-lg 
        ${isCurrentCommercial ? 'bg-primary-600' : 'bg-primary-700'} 
        hover:bg-primary-600/80 transition-colors cursor-grab
      `}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay(commercial);
          }}
          className="p-2 rounded-full bg-primary-500/30 hover:bg-primary-500/50 transition-colors"
          aria-label={isPlaying && isCurrentCommercial ? "Pause" : "Play"}
        >
          {isPlaying && isCurrentCommercial ? (
            <PauseIcon className="h-4 w-4 text-primary-50" />
          ) : (
            <PlayIcon className="h-4 w-4 text-primary-50" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-primary-50 truncate">
            {commercial.title}
          </p>
          <p className="text-xs text-primary-400 truncate">
            {formatDuration(commercial.duration)}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToQueue(commercial);
          }}
          className="p-1 text-primary-400 hover:text-primary-300"
          aria-label="Add to queue"
        >
          <QueueListIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

interface CommercialLibraryProps {
  className?: string;
}

export default function CommercialLibrary({ className = '' }: CommercialLibraryProps) {
  const [commercials, setCommercials] = useState<Advertisement[]>([]);
  const [filteredCommercials, setFilteredCommercials] = useState<Advertisement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { 
    currentTrack, 
    isPlaying, 
    setCurrentTrack, 
    togglePlayPause,
    addToQueue 
  } = useMusicStore();

  // Fetch commercials from Supabase
  useEffect(() => {
    const fetchCommercials = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('advertisements')
          .select('*')
          .eq('status', 'active')
          .order('title');

        if (error) throw error;

        setCommercials(data || []);
        setFilteredCommercials(data || []);
      } catch (err) {
        console.error('Error fetching commercials:', err);
        setError('Failed to load commercials');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommercials();
  }, []);

  // Debounced search query handler
  const debouncedSearch = useCallback(debounce((query: string) => {
    if (!query.trim()) {
      setFilteredCommercials(commercials);
      return;
    }

    const filtered = commercials.filter(commercial => 
      commercial.title.toLowerCase().includes(query.toLowerCase())
    );

    setFilteredCommercials(filtered);
  }, 300), [commercials]);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handlePlay = useCallback((commercial: Advertisement) => {
    // Convert Advertisement to Track format for the music store
    const commercialTrack = {
      id: commercial.id,
      title: commercial.title,
      artist: 'Commercial',
      duration: commercial.duration,
      file_url: commercial.file_url
    };

    if (currentTrack?.id === commercial.id) {
      togglePlayPause();
    } else {
      setCurrentTrack(commercialTrack);
    }
  }, [currentTrack, togglePlayPause, setCurrentTrack]);

  const handleAddToQueue = useCallback((commercial: Advertisement) => {
    // Convert Advertisement to Track format for the music store
    const commercialTrack = {
      id: commercial.id,
      title: commercial.title,
      artist: 'Commercial',
      duration: commercial.duration,
      file_url: commercial.file_url
    };

    addToQueue(commercialTrack);
    toast.success(`Added "${commercial.title}" to queue`);
  }, [addToQueue]);

  if (isLoading) {
    return (
      <div className={`bg-primary-800 rounded-xl p-6 shadow-lg ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-primary-50">Commercial Library</h2>
        </div>

        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-primary-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-primary-800 rounded-xl p-6 shadow-lg ${className}`}>
        <div className="text-center py-8">
          <p className="text-status-error mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-primary-800 rounded-xl p-6 shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-primary-50">Commercial Library</h2>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commercials..."
            className="pl-9 pr-4 py-2 bg-primary-700 border border-primary-600 rounded-lg text-primary-50 placeholder-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {filteredCommercials.length > 0 ? (
          filteredCommercials.map(commercial => (
            <CommercialItem
              key={commercial.id}
              commercial={commercial}
              isPlaying={isPlaying}
              isCurrentCommercial={currentTrack?.id === commercial.id}
              onPlay={handlePlay}
              onAddToQueue={handleAddToQueue}
            />
          ))
        ) : (
          <div className="text-center py-8 text-primary-400">
            {searchQuery ? 'No commercials found matching your search' : 'No commercials available'}
          </div>
        )}
      </div>

      <p className="text-xs text-primary-400 mt-4">
        Drag commercials to the queue to add them
      </p>
    </div>
  );
}