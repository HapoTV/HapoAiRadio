import React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Track, Playlist } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useAudio } from '../../contexts/AudioContext';
import SearchBar from './SearchBar';
import MusicList from './MusicList';
import PlaybackControls from './PlaybackControls';
import AddMusicForm from './AddMusicForm';
import PlaylistGrid from './PlaylistGrid';
import CreatePlaylistModal from './CreatePlaylistModal';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function MusicLibraryContainer() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPlaylist, setCurrentPlaylist] = useState<Track[]>([]);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const { setCurrentTrack } = useAudio();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      await Promise.all([
        fetchTracks(),
        fetchPlaylists(),
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load library data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTracks = async () => {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setTracks(data || []);
  };

  const fetchPlaylists = async () => {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setPlaylists(data || []);
  };

  const handleTrackEnd = async (track: Track) => {
    if (!currentPlaylistId || !currentStoreId) return;

    try {
      const { error } = await supabase
        .from('track_plays')
        .insert({
          track_id: track.id,
          store_id: currentStoreId,
          playlist_id: currentPlaylistId,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error recording track play:', error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handlePlayTrack = (track: Track) => {
    setCurrentTrack(track);
    setCurrentPlaylist([track]);
    setCurrentPlaylistId(null);
    setCurrentStoreId(null);
  };

  const handlePlayPlaylist = async (playlistId: string) => {
    try {
      // Get the playlist to find its store_id
      const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .select('store_id')
        .eq('id', playlistId)
        .single();
      
      if (playlistError) throw playlistError;
      
      // Get the tracks for this playlist
      const { data, error } = await supabase
        .from('playlist_tracks')
        .select(`
          track_id,
          tracks (*)
        `)
        .eq('playlist_id', playlistId)
        .order('position');

      if (error) throw error;

      const playlistTracks = data
        .map(item => item.tracks)
        .filter(track => track !== null);

      if (playlistTracks.length === 0) {
        toast.error('This playlist has no tracks');
        return;
      }

      setCurrentPlaylist(playlistTracks);
      setCurrentPlaylistId(playlistId);
      setCurrentStoreId(playlist.store_id || null);
      
      // Start playing the first track with store and playlist context
      setCurrentTrack(playlistTracks[0], playlist.store_id, playlistId);
    } catch (error) {
      console.error('Error loading playlist:', error);
      toast.error('Failed to load playlist');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-primary-800 rounded w-1/4"></div>
        <div className="h-12 bg-primary-800 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-primary-800 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary-50">Music Library</h1>
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => setShowCreatePlaylist(true)}
            className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
            Create Playlist
          </button>
          <AddMusicForm onUploadSuccess={fetchTracks} />
        </div>
      </div>

      <div className="space-y-6">
        <SearchBar onSearch={handleSearch} />
        
        <PlaylistGrid
          playlists={playlists}
          onRefresh={fetchPlaylists}
          onPlay={(playlistId) => handlePlayPlaylist(playlistId)}
        />

        <MusicList
          tracks={tracks.filter(track => 
            track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (track.artist && track.artist.toLowerCase().includes(searchQuery.toLowerCase()))
          )}
          onPlay={handlePlayTrack}
          onDelete={fetchTracks}
        />
      </div>

      <CreatePlaylistModal
        isOpen={showCreatePlaylist}
        onClose={() => setShowCreatePlaylist(false)}
        onSuccess={() => {
          fetchPlaylists();
          setSelectedTracks([]);
        }}
      />
    </div>
  );
}