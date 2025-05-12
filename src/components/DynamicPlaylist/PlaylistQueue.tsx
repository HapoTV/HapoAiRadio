import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { supabase } from '../../lib/supabase';
import type { QueuedTrack } from '../../types/radio';
import { MusicalNoteIcon, SparklesIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Props {
  playlistId: string;
  currentTrack: QueuedTrack | null;
  onQueueUpdate: (tracks: QueuedTrack[]) => void;
}

export default function PlaylistQueue({ playlistId, currentTrack, onQueueUpdate }: Props) {
  const [queuedTracks, setQueuedTracks] = useState<QueuedTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (playlistId) {
      fetchQueue();
    }
  }, [playlistId]);

  const fetchQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('playlist_queue')
        .select(`
          id,
          track_id,
          position,
          source_type,
          source_playlist_id,
          tracks (
            id,
            title,
            artist,
            duration,
            genre
          ),
          playlists (
            id,
            name
          )
        `)
        .eq('playlist_id', playlistId)
        .order('position');

      if (error) throw error;

      const formattedTracks = data.map(item => ({
        ...item.tracks,
        queueId: item.id,
        position: item.position,
        sourceType: item.source_type,
        sourcePlaylist: item.playlists
      }));

      setQueuedTracks(formattedTracks);
      onQueueUpdate(formattedTracks);
    } catch (error) {
      console.error('Error fetching queue:', error);
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(queuedTracks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const updatedTracks = items.map((track, index) => ({
      ...track,
      position: index
    }));

    setQueuedTracks(updatedTracks);

    try {
      const updates = updatedTracks.map(track => ({
        id: track.queueId,
        position: track.position
      }));

      const { error } = await supabase
        .from('playlist_queue')
        .upsert(updates);

      if (error) throw error;
      onQueueUpdate(updatedTracks);
    } catch (error) {
      console.error('Error updating queue:', error);
      toast.error('Failed to update queue');
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    try {
      const { error } = await supabase
        .from('playlist_queue')
        .delete()
        .eq('id', trackId);

      if (error) throw error;

      setQueuedTracks(tracks => {
        const updated = tracks.filter(t => t.queueId !== trackId);
        onQueueUpdate(updated);
        return updated;
      });

      toast.success('Track removed from queue');
    } catch (error) {
      console.error('Error removing track:', error);
      toast.error('Failed to remove track');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-primary-700 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-primary-50">Queue</h3>
        <span className="text-sm text-primary-400">
          {queuedTracks.length} tracks
        </span>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="queue">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-2"
            >
              {queuedTracks.map((track, index) => (
                <Draggable
                  key={track.queueId}
                  draggableId={track.queueId}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`
                        flex items-center justify-between p-4 rounded-lg
                        ${currentTrack?.id === track.id ? 'bg-primary-600' : 'bg-primary-700'}
                        ${snapshot.isDragging ? 'opacity-50' : ''}
                        ${track.sourceType === 'auto' ? 'border border-primary-500' : ''}
                      `}
                    >
                      <div className="flex items-center space-x-4 min-w-0">
                        {track.sourceType === 'auto' ? (
                          <SparklesIcon className="h-5 w-5 text-primary-500" />
                        ) : (
                          <MusicalNoteIcon className="h-5 w-5 text-primary-400" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-primary-50 truncate">
                            {track.title}
                          </p>
                          <p className="text-xs text-primary-400 truncate">
                            {track.artist} • {track.sourcePlaylist?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-primary-400">
                          {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                        </span>
                        <button
                          onClick={() => handleRemoveTrack(track.queueId)}
                          className="text-primary-400 hover:text-status-error transition-colors"
                        >
                          Remove
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

      {queuedTracks.length === 0 && (
        <div className="text-center py-8 text-primary-400">
          No tracks in queue
        </div>
      )}
    </div>
  );
}