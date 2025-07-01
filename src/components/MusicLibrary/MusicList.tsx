import React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { TrashIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
import type { Track } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAudio } from '../../contexts/AudioContext';
import toast from 'react-hot-toast';
import { cachedQuery } from '../../lib/caching';
import { handleError, displayError } from '../../lib/errorHandling';

interface Props {
  tracks: Track[];
  onPlay: (track: Track) => void;
  onDelete: () => void;
  currentTrack?: Track | null;
  isPlaying?: boolean;
  searchQuery?: string;
  genreFilter?: string;
}

export default function MusicList({ 
  tracks, 
  onPlay, 
  onDelete, 
  currentTrack, 
  isPlaying,
  searchQuery = '',
  genreFilter = ''
}: Props) {
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>(tracks);
  const [isLoading, setIsLoading] = useState(false);
  
  // Apply filters when tracks, searchQuery, or genreFilter changes
  useEffect(() => {
    setIsLoading(true);
    
    // If we have a search query or genre filter, use the optimized search function
    if (searchQuery || genreFilter) {
      const fetchFilteredTracks = async () => {
        try {
          const cacheKey = `tracks_search_${searchQuery}_${genreFilter}`;
          
          const { data, error } = await cachedQuery(
            () => {
              let query = supabase.rpc('search_tracks', { search_query: searchQuery });
              
              // Apply genre filter if provided
              if (genreFilter) {
                query = query.contains('genre', [genreFilter]);
              }
              
              return query;
            },
            cacheKey,
            30000 // 30 seconds cache
          );
          
          if (error) throw error;
          setFilteredTracks(data || []);
        } catch (error) {
          const appError = handleError(error);
          displayError(appError);
          setFilteredTracks([]); // Fallback to empty array on error
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchFilteredTracks();
    } else {
      // Otherwise, just use the provided tracks
      setFilteredTracks(tracks);
      setIsLoading(false);
    }
  }, [tracks, searchQuery, genreFilter]);
  
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
      const appError = handleError(error);
      displayError(appError);
    } finally {
      setDeletingTrackId(null);
    }
  }, [onDelete]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-primary-700 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-medium text-primary-50 mb-4">Music Library</h2>
      <div className="bg-primary-800 shadow-sm ring-1 ring-primary-700 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-primary-700">
          <thead>
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-primary-50 sm:pl-6">Title</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-primary-50">Artist</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-primary-50">Album</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-primary-50">Genre</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-primary-50">Duration</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-700">
            {filteredTracks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-primary-400">
                  {searchQuery || genreFilter 
                    ? 'No tracks match your search criteria' 
                    : 'No tracks available. Upload some tracks to get started.'}
                </td>
              </tr>
            ) : (
              filteredTracks.map((track) => (
                <tr key={track.id} className="hover:bg-primary-700/50">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-primary-50 sm:pl-6">
                    {track.title}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-primary-400">
                    {track.artist || 'Unknown Artist'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-primary-400">
                    {track.album || '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-primary-400">
                    {Array.isArray(track.genre) && track.genre.length > 0
                      ? track.genre.join(', ')
                      : '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-primary-400">
                    {Math.floor(track.duration_seconds / 60)}:{String(Math.floor(track.duration_seconds % 60)).padStart(2, '0')}
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