import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import type { QueuedTrack } from '../../types/radio';
import { XMarkIcon, ExclamationTriangleIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';

interface Props {
  tracks: QueuedTrack[];
  onRemove: (id: string) => void;
}

function SortableTrack({ track, onRemove }: { track: QueuedTrack; onRemove: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: track.queueId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isAd = track.sourceType === 'ad';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        flex items-center justify-between p-3 rounded-lg transition-all duration-200
        ${isAd ? 'bg-amber-900/50 border border-amber-500/50' : 'bg-primary-700'}
        ${track.conflicts?.length ? 'border border-status-error' : ''}
        hover:bg-opacity-90
      `}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center">
          {isAd ? (
            <span className="text-xs font-medium text-amber-500 bg-amber-900/50 px-2 py-0.5 rounded-full mr-2">
              AD
            </span>
          ) : (
            <SpeakerWaveIcon className="h-4 w-4 text-primary-400 mr-2" />
          )}
          <p className={`text-sm font-medium truncate ${isAd ? 'text-amber-500' : 'text-primary-50'}`}>
            {track.title}
          </p>
          {track.conflicts?.length > 0 && (
            <ExclamationTriangleIcon className="h-4 w-4 text-status-error ml-2" />
          )}
        </div>
        <div className="flex items-center mt-1">
          <p className="text-xs text-primary-400">
            {track.artist} • {track.genre || 'Unknown Genre'}
          </p>
          {track.sourcePlaylist && (
            <span className="ml-2 text-xs text-primary-500">
              From: {track.sourcePlaylist.name}
            </span>
          )}
        </div>
        {track.scheduledTime && (
          <p className="text-xs text-primary-300 mt-1">
            {format(new Date(track.scheduledTime), 'h:mm a')}
          </p>
        )}
        {track.conflicts?.map((conflict, index) => (
          <p
            key={index}
            className={`text-xs mt-1 ${
              conflict.severity === 'error' ? 'text-status-error' : 'text-status-warning'
            }`}
          >
            {conflict.message}
          </p>
        ))}
      </div>
      <button
        onClick={() => onRemove(track.queueId)}
        className="ml-4 p-1 text-primary-400 hover:text-status-error transition-colors"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

export function QueuedTrackList({ tracks, onRemove }: Props) {
  return (
    <div className="space-y-2 h-[calc(100vh-280px)] overflow-y-auto">
      {tracks.map((track) => (
        <SortableTrack
          key={track.queueId}
          track={track}
          onRemove={onRemove}
        />
      ))}
      {tracks.length === 0 && (
        <div className="text-center py-8 text-primary-400">
          Drag tracks here to build your queue
        </div>
      )}
    </div>
  );
}

export default QueuedTrackList;
