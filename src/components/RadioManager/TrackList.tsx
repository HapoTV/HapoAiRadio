import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { QueuedTrack } from '../../types/radio';
import { PlusIcon } from '@heroicons/react/24/outline';

interface Props {
  tracks: QueuedTrack[];
  onTrackSelect: (track: QueuedTrack) => void;
  searchQuery: string;
}

export function TrackList({ tracks, onTrackSelect, searchQuery }: Props) {
  const filteredTracks = useMemo(() => {
    if (!searchQuery) return tracks;

    const query = searchQuery.toLowerCase();
    return tracks.filter(track => 
      track.title.toLowerCase().includes(query) ||
      track.artist?.toLowerCase().includes(query) ||
      track.genre?.toLowerCase().includes(query)
    );
  }, [tracks, searchQuery]);

  return (
    <div className="space-y-2 h-[calc(100vh-280px)] overflow-y-auto">
      {filteredTracks.map((track) => (
        <motion.div
          key={track.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center justify-between p-3 bg-primary-700 rounded-lg hover:bg-primary-600 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-primary-50 truncate">
              {track.title}
            </p>
            <p className="text-xs text-primary-400 truncate">
              {track.artist} • {track.genre || 'Unknown Genre'}
            </p>
          </div>
          <button
            onClick={() => onTrackSelect(track)}
            className="ml-4 p-1 text-primary-400 hover:text-primary-300 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </motion.div>
      ))}
    </div>
  );
}

export default TrackList;
