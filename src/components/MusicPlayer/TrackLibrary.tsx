import React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  PlayIcon, 
  PauseIcon, 
  MagnifyingGlassIcon,
  QueueListIcon
} from '@heroicons/react/24/solid';
import type { Track } from '../../types';
import { useMusicStore } from '../../store/musicStore';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { debounce } from 'lodash';
import React from 'react';

// Helper function to format durations
const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

interface TrackItemProps {
  track: Track;
  isPlaying: boolean;
  isCurrentTrack: boolean;
  onPlay: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
}

const TrackItem = React.memo(({ track, isPlaying, isCurrentTrack, onPlay, onAddToQueue }: TrackItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: track.id });

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
          aria-label={isPlaying && isCurrentTrack ? "Pause" : "Play"}
        >
          {isPlaying && isCurrentTrack ? (
            <PauseIcon className="h-4 w-4 text-primary-50" />
          ) : (
            <PlayIcon className="h-4 w-4 text-primary-50" />
          )}
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
            onAddToQueue(track);
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

interface TrackLibraryProps {
  className?: string;
}

export default function TrackLibrary({ className = '' }: TrackLibraryProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
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

  // Fetch tracks from Supabase
  useEffect(() => {
    const fetchTracks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('tracks')
          .select('*')
          .order('title');

        if (error) throw error;

        setTracks(data || []);
        setFilteredTracks(data || []);
      } catch (err) {
        console.error('Error fetching tracks:', err);
        setError('Failed to load tracks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTracks();
  }, []);

  // Debounced search query handler
  const debouncedSearch = useCallback(debounce((query: string) => {
    if (!query.trim()) {
      setFilteredTracks(tracks);
      return;
    }

    const filtered = tracks.filter(track => 
      track.title.toLowerCase().includes(query.toLowerCase()) ||
      (track.artist && track.artist.toLowerCase().includes(query.toLowerCase())) ||
      (track.genre && track.genre.toLowerCase().includes(query.toLowerCase()))
    );

    setFilteredTracks(filtered);
  }, 300), [tracks]);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handlePlay = useCallback((track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      setCurrentTrack(track);
    }
  }, [currentTrack, togglePlayPause, setCurrentTrack]);

  const handleAddToQueue = useCallback((track: Track) => {
    addToQueue(track);
    toast.success(`Added "${track.title}" to queue`);
  }, [addToQueue]);

  if (isLoading) {
    return (
      <div className={`bg-primary-800 rounded-xl p-6 shadow-lg ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-primary-50">Music Library</h2>
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
        <h2 className="text-lg font-medium text-primary-50">Music Library</h2>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracks..."
            className="pl-9 pr-4 py-2 bg-primary-700 border border-primary-600 rounded-lg text-primary-50 placeholder-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {filteredTracks.length > 0 ? (
          filteredTracks.map(track => (
            <TrackItem
              key={track.id}
              track={track}
              isPlaying={isPlaying}
              isCurrentTrack={currentTrack?.id === track.id}
              onPlay={handlePlay}
              onAddToQueue={handleAddToQueue}
            />
          ))
        ) : (
          <div className="text-center py-8 text-primary-400">
            {searchQuery ? 'No tracks found matching your search' : 'No tracks available'}
          </div>
        )}
      </div>

      <p className="text-xs text-primary-400 mt-4">
        Drag tracks to the queue to add them
      </p>
    </div>
  );
}
