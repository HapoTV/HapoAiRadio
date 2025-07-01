import React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Track, Playlist } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import { 
  MusicLibraryContainer, 
  SearchBar, 
  MusicList, 
  FilterPanel, 
  PlaybackControls, 
  AddMusicForm, 
  PlaylistGrid 
} from '../components/MusicLibrary';
import AudioPlayer from '../components/AudioPlayer';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';
import CreatePlaylistModal from '../components/MusicLibrary/CreatePlaylistModal';

export default function MusicLibrary() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<Track[]>([]);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);
  const { currentTrack, setCurrentTrack, isPlaying, togglePlayPause } = useAudio();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch tracks and playlists in parallel
      const [tracksResponse, playlistsResponse] = await Promise.all([
        supabase.from('tracks').select('*').order('created_at', { ascending: false }),
        supabase.from('playlists').select('*').order('created_at', { ascending: false })
      ]);

      if (tracksResponse.error) throw tracksResponse.error;
      if (playlistsResponse.error) throw playlistsResponse.error;

      setTracks(tracksResponse.data || []);
      setPlaylists(playlistsResponse.data || []);
    } catch (error) {
      console.error('Error fetching library data:', error);
      toast.error('Failed to load music library');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleGenreFilter = (genre: string) => {
    setSelectedGenre(genre);
  };

  const handlePlayTrack = (track: Track) => {
    // If the same track is already playing, toggle play/pause
    if (currentTrack?.id === track.id) {
      togglePlayPause();
      return;
    }
    
    // Otherwise, play the new track
    setCurrentTrack(track);
    setCurrentPlaylist([track]);
    setCurrentPlaylistId(null);
    setCurrentStoreId(null);
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

  const handlePlayPlaylist = async (playlistId: string) => {
    try {
      // If we're already playing this playlist, don't reload it
      if (currentPlaylistId === playlistId && isPlaying) {
        togglePlayPause();
        return;
      }
      
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

      // Stop current playback if a different playlist is selected
      if (currentPlaylistId !== playlistId) {
        setCurrentPlaylist(playlistTracks);
        setCurrentPlaylistId(playlistId);
        setCurrentStoreId(playlist.store_id || null);
        
        // Start playing the first track with store and playlist context
        setCurrentTrack(playlistTracks[0], playlist.store_id, playlistId);
      } else if (!isPlaying) {
        // If it's the same playlist but paused, resume playback
        togglePlayPause();
      }
    } catch (error) {
      console.error('Error loading playlist:', error);
      toast.error('Failed to load playlist');
    }
  };

  const handleTrackDelete = async () => {
    await fetchData();
  };

  const handleUploadSuccess = async () => {
    await fetchData();
    toast.success('Track uploaded successfully');
  };

  // Filter tracks based on search query and selected genre
  const filteredTracks = tracks.filter(track => {
    const matchesSearch = 
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (track.artist && track.artist.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesGenre = 
      !selectedGenre || 
      (track.genre && track.genre.toLowerCase() === selectedGenre.toLowerCase());
    
    return matchesSearch && matchesGenre;
  });

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
          <AddMusicForm onUploadSuccess={handleUploadSuccess} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-64">
          <FilterPanel 
            selectedGenre={selectedGenre} 
            onGenreChange={handleGenreFilter} 
          />
        </div>
        
        <div className="flex-1 space-y-6">
          <SearchBar onSearch={handleSearch} />
          
          <PlaylistGrid
            playlists={playlists}
            onRefresh={fetchData}
            onPlay={handlePlayPlaylist}
          />

          <MusicList
            tracks={filteredTracks}
            onPlay={handlePlayTrack}
            onDelete={handleTrackDelete}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
          />
        </div>
      </div>

      {currentPlaylist.length > 0 && (
        <div className="mt-8">
          <PlaybackControls 
            tracks={currentPlaylist}
            onTrackEnd={handleTrackEnd}
            storeId={currentStoreId || undefined}
            playlistId={currentPlaylistId || undefined}
          />
        </div>
      )}

      <CreatePlaylistModal
        isOpen={showCreatePlaylist}
        onClose={() => setShowCreatePlaylist(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}