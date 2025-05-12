import { useAudio } from '../../contexts/AudioContext';
import { QueueListIcon } from '@heroicons/react/24/outline';
import type { Track } from '../../types';

interface Props {
  track: Track;
  className?: string;
}

export default function QueueButton({ track, className = '' }: Props) {
  const { addToQueue } = useAudio();

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        addToQueue(track);
      }}
      className={`inline-flex items-center space-x-2 p-2 rounded-lg hover:bg-primary-700/50 transition-colors ${className}`}
      title="Add to queue"
    >
      <QueueListIcon className="h-5 w-5 text-primary-400" />
      <span className="text-sm text-primary-400">Add to queue</span>
    </button>
  );
}