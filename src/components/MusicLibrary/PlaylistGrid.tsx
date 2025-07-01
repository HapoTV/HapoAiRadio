import React from 'react';
import { useState } from 'react';
import { MusicalNoteIcon, PlayIcon, PauseIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Playlist } from '../../types';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import GlassmorphicCard from '../GlassmorphicCard';
import EditPlaylistModal from './EditPlaylistModal';
import PlaylistTrackEditor from './PlaylistTrackEditor';
import PlaylistDisplay from './PlaylistDisplay';
import { useAudio } from '../../contexts/AudioContext';

interface Props {
  playlists: Playlist[];
  onRefresh: () => void;
  onPlay: (playlistId: string) => void;
}

export default function PlaylistGrid({ playlists, onRefresh, onPlay }: Props) {
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [showTrackEditor, setShowTrackEditor] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const { currentTrack: globalCurrentTrack, isPlaying, currentPlaylistId } = useAudio();

  const handlePlayPlaylist = async (playlistId: string) => {
    try {
      // Find the playlist in the list
      const playlist = playlists.find(p => p.id === playlistId);
      if (playlist) {
        setActivePlaylist(playlist);
      }
      
      // Call the parent's onPlay handler
      onPlay(playlistId);
    } catch (error) {
      console.error('Error playing playlist:', error);
      toast.error('Failed to play playlist');
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      // If there's a cover image, delete it first
      const { data: playlist } = await supabase
        .from('playlists')
        .select('cover_url')
        .eq('id', playlistId)
        .single();

      if (playlist?.cover_url) {
        const coverPath = playlist.cover_url.split('/playlist-covers/')[1];
        if (coverPath) {
          await supabase.storage
            .from('playlist-covers')
            .remove([coverPath]);
        }
      }

      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;

      toast.success('Playlist deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Failed to delete playlist');
    }
  };

  const handleQueueUpdate = (updatedQueue: any[]) => {
    setQueue(updatedQueue);
  };

  if (playlists.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-8">
        {activePlaylist && currentTrack && (
          <PlaylistDisplay
            currentTrack={currentTrack}
            queue={queue}
            onQueueUpdate={handleQueueUpdate}
          />
        )}

        <div>
          <h2 className="text-lg font-medium text-primary-50 mb-4">Playlists</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {playlists.map((playlist) => (
              <GlassmorphicCard
                key={playlist.id}
                className={`
                  group relative aspect-square overflow-hidden
                  ${currentPlaylistId === playlist.id ? 'ring-2 ring-primary-500' : ''}
                `}
              >
                {playlist.cover_url ? (
                  <img
                    src={playlist.cover_url}
                    alt={playlist.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary-700">
                    <MusicalNoteIcon className="h-12 w-12 text-primary-500" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-primary-900/90 via-primary-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-sm font-medium text-primary-50 truncate">
                      {playlist.name}
                    </p>
                    {playlist.description && (
                      <p className="text-xs text-primary-300 mt-1 line-clamp-2">
                        {playlist.description}
                      </p>
                    )}
                    {playlist.store_id && (
                      <p className="text-xs text-primary-400 mt-1">
                        Store Playlist
                      </p>
                    )}
                    <div className="mt-2 flex items-center space-x-2">
                      <button
                        onClick={() => handlePlayPlaylist(playlist.id)}
                        className="p-2 rounded-full bg-primary-500/80 hover:bg-primary-400/80 transition-colors"
                      >
                        {currentPlaylistId === playlist.id && isPlaying ? (
                          <PauseIcon className="h-4 w-4 text-primary-50" />
                        ) : (
                          <PlayIcon className="h-4 w-4 text-primary-50" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingPlaylist(playlist);
                          setShowTrackEditor(false);
                        }}
                        className="p-2 rounded-full bg-primary-600/80 hover:bg-primary-500/80 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4 text-primary-50" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingPlaylist(playlist);
                          setShowTrackEditor(true);
                        }}
                        className="p-2 rounded-full bg-primary-600/80 hover:bg-primary-500/80 transition-colors"
                      >
                        <MusicalNoteIcon className="h-4 w-4 text-primary-50" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this playlist?')) {
                            handleDeletePlaylist(playlist.id);
                          }
                        }}
                        className="p-2 rounded-full bg-status-errorBg hover:bg-status-error/80 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4 text-primary-50" />
                      </button>
                    </div>
                  </div>
                </div>
              </GlassmorphicCard>
            ))}
          </div>
        </div>
      </div>

      {editingPlaylist && !showTrackEditor && (
        <EditPlaylistModal
          isOpen={true}
          onClose={() => setEditingPlaylist(null)}
          onSuccess={onRefresh}
          playlist={editingPlaylist}
        />
      )}

      {editingPlaylist && showTrackEditor && (
        <PlaylistTrackEditor
          isOpen={true}
          onClose={() => {
            setEditingPlaylist(null);
            setShowTrackEditor(false);
          }}
          playlistId={editingPlaylist.id}
          onUpdate={onRefresh}
        />
      )}
    </>
  );
}