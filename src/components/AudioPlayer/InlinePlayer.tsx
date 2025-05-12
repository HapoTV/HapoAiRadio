import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import { useAudio } from '../../contexts/AudioContext';
import type { Track } from '../../types';

interface Props {
  track: Track;
  className?: string;
}

export default function InlinePlayer({ track, className = '' }: Props) {
  const { currentTrack, isPlaying, setCurrentTrack, togglePlayPause } = useAudio();
  
  const isCurrentTrack = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      setCurrentTrack(track);
    }
  };

  return (
    <button
      onClick={handlePlay}
      className={`inline-flex items-center space-x-2 p-2 rounded-lg hover:bg-primary-700/50 transition-colors ${className}`}
    >
      {isCurrentTrack && isPlaying ? (
        <PauseIcon className="h-6 w-6 text-primary-50" />
      ) : (
        <PlayIcon className="h-6 w-6 text-primary-50" />
      )}
      <span className="text-sm text-primary-50">
        {isCurrentTrack && isPlaying ? 'Pause' : 'Play'}
      </span>
    </button>
  );
}