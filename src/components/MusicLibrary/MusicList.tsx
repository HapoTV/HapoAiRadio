import React from 'react';
import { useState, useCallback } from 'react';
import { TrashIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
import type { Track } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAudio } from '../../contexts/AudioContext';
import toast from 'react-hot-toast';

interface Props {
  tracks: Track[];
  onPlay: (track: Track) => void;
  onDelete: () => void;
  currentTrack?: Track | null;
  isPlaying?: boolean;
}

export default function MusicList({ tracks, onPlay, onDelete, currentTrack, isPlaying }: Props) {
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null);
  
  const handleDelete = useCallback(async (trackId: string, fileUrl: string) => {
    try {
      setDeletingTrackId(trackId);
      
      const { data: playlistTracks, error: checkError } = await supabase
        .from('playlist_tracks')
        .select('playlist_id')
        .eq('track_id', trackId);

      if (checkError) throw checkError;

      if (playlistTracks && playlistTracks.length > 0) {
        toast.error('Cannot delete track as it is used in one or more playlists');
        return;
      }

      const filePath = fileUrl.split('/tracks/')[1];
      if (!filePath) throw new Error('Invalid file URL');

      const { error: storageError } = await supabase.storage
        .from('tracks')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (dbError) throw dbError;

      toast.success('Track deleted successfully');
      onDelete();
    } catch (error: any) {
      console.error('Error deleting track:', error);
      toast.error(error.message || 'Failed to delete track');
    } finally {
      setDeletingTrackId(null);
    }
  }, [onDelete]);

  return (
    <div>
      <h2 className="text-lg font-medium text-primary-50 mb-4">Music Library</h2>
      <div className="bg-primary-800 shadow-sm ring-1 ring-primary-700 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-primary-700">
          <thead>
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-primary-50 sm:pl-6">Title</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-primary-50">Artist</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-primary-50">Duration</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-700">
            {tracks.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-primary-400">
                  No tracks available. Upload some tracks to get started.
                </td>
              </tr>
            ) : (
              tracks.map((track) => (
                <tr key={track.id} className="hover:bg-primary-700/50">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-primary-50 sm:pl-6">
                    {track.title}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-primary-400">
                    {track.artist || 'Unknown Artist'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-primary-400">
                    {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => onPlay(track)}
                        className="text-primary-400 hover:text-primary-300"
                        aria-label={currentTrack?.id === track.id && isPlaying ? "Pause" : "Play"}
                      >
                        {currentTrack?.id === track.id && isPlaying ? (
                          <span className="flex items-center">
                            <PauseIcon className="h-5 w-5 inline mr-1 text-primary-500" />
                            Pause
                          </span>
                        ) : (
                          <>
                            <PlayIcon className="h-5 w-5 inline mr-1" />
                            Play
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this track?')) {
                            handleDelete(track.id, track.file_url);
                          }
                        }}
                        disabled={deletingTrackId === track.id}
                        className={`text-status-error hover:text-status-errorHover ${deletingTrackId === track.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                        <span className="sr-only">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}