import React from 'react';
import { useState } from 'react';
import { MegaphoneIcon, PlayIcon, PauseIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import GlassmorphicCard from '../GlassmorphicCard';
import EditCommercialPlaylistModal from './EditCommercialPlaylistModal';
import CommercialPlaylistEditor from './CommercialPlaylistEditor';
import { useAudio } from '../../contexts/AudioContext';
import { CommercialLibrary } from '../components/CommercialLibrary';
// Ensure path reflects the correct directory structure

interface Props {
  playlists: any[];
  onRefresh: () => void;
  onPlay: (playlistId: string) => void;
}

export default function CommercialPlaylistGrid({ playlists, onRefresh, onPlay }: Props) {
  const [editingPlaylist, setEditingPlaylist] = useState<any | null>(null);
  const [showTrackEditor, setShowTrackEditor] = useState(false);
  const { currentPlaylistId, isPlaying } = useAudio();

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      const { error } = await supabase
        .from('ad_schedules')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;

      toast.success('Ad schedule deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting ad schedule:', error);
      toast.error('Failed to delete ad schedule');
    }
  };

  if (playlists.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-medium text-primary-50 mb-4">Ad Schedules</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {playlists.map((playlist) => (
              <GlassmorphicCard
                key={playlist.id}
                className={`
                  group relative aspect-square overflow-hidden
                  ${currentPlaylistId === playlist.id ? 'ring-2 ring-primary-500' : ''}
                `}
              >
                <div className="absolute inset-0 flex items-center justify-center bg-primary-700">
                  <MegaphoneIcon className="h-12 w-12 text-primary-500" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-primary-900/90 via-primary-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-sm font-medium text-primary-50 truncate">
                      {playlist.is_enabled ? 'Enabled' : 'Disabled'} Schedule
                    </p>
                    {playlist.interval_minutes && (
                      <p className="text-xs text-primary-300 mt-1">
                        Every {playlist.interval_minutes} minutes
                      </p>
                    )}
                    <div className="mt-2 flex items-center space-x-2">
                      <button
                        onClick={() => onPlay(playlist.id)}
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
                        <MegaphoneIcon className="h-4 w-4 text-primary-50" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this ad schedule?')) {
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
        <EditCommercialPlaylistModal
          isOpen={true}
          onClose={() => setEditingPlaylist(null)}
          onSuccess={onRefresh}
          playlist={editingPlaylist}
        />
      )}

      {editingPlaylist && showTrackEditor && (
        <CommercialPlaylistEditor
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