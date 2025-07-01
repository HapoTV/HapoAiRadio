import React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Advertisement } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import { 
  SearchBar, 
  FilterPanel, 
  AddMusicForm, 
} from '../components/MusicLibrary';
import { 
  CommercialList,
  CommercialPlaylistGrid,
  CreateCommercialPlaylistModal,
  AddCommercialForm
} from '../components/CommercialLibrary';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';

// src/components/CommercialLibrary/CommercialLibrary.tsx
// CommercialLibrary.tsx
export default function CommercialLibrary() {
  const [commercials, setCommercials] = useState<Advertisement[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<Advertisement[]>([]);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);
  const { currentTrack, setCurrentTrack, isPlaying, togglePlayPause } = useAudio();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch commercials and playlists in parallel
      const [commercialsResponse, playlistsResponse] = await Promise.all([
        supabase.from('advertisements').select('*').order('created_at', { ascending: false }),
        supabase.from('ad_schedules').select('*').order('created_at', { ascending: false })
      ]);

      if (commercialsResponse.error) throw commercialsResponse.error;
      if (playlistsResponse.error) throw playlistsResponse.error;

      setCommercials(commercialsResponse.data || []);
      setPlaylists(playlistsResponse.data || []);
    } catch (error) {
      console.error('Error fetching library data:', error);
      toast.error('Failed to load commercial library');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
  };

  const handlePlayCommercial = (commercial: Advertisement) => {
    // If the same commercial is already playing, toggle play/pause
    if (currentTrack?.id === commercial.id) {
      togglePlayPause();
      return;
    }
    
    // Otherwise, play the new commercial
    setCurrentTrack({
      id: commercial.id,
      title: commercial.title,
      file_url: commercial.file_url,
      duration: commercial.duration
    });
    setCurrentPlaylist([commercial]);
    setCurrentPlaylistId(null);
    setCurrentStoreId(null);
  };

  const handleCommercialEnd = async (commercial: Advertisement) => {
    if (!currentPlaylistId || !currentStoreId) return;

    try {
      const { error } = await supabase
        .from('ad_plays')
        .insert({
          advertisement_id: commercial.id,
          store_id: currentStoreId,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error recording commercial play:', error);
    }
  };

  const handlePlayPlaylist = async (playlistId: string) => {
    try {
      // If we're already playing this playlist, don't reload it
      if (currentPlaylistId === playlistId && isPlaying) {
        togglePlayPause();
        return;
      }
      
      // Get the ads for this schedule
      const { data, error } = await supabase
        .from('ad_slots')
        .select(`
          position,
          advertisements (*)
        `)
        .eq('ad_schedule_id', playlistId)
        .order('position');

      if (error) throw error;

      const playlistCommercials = data
        .map(item => item.advertisements)
        .filter(commercial => commercial !== null);

      if (playlistCommercials.length === 0) {
        toast.error('This playlist has no commercials');
        return;
      }

      // Stop current playback if a different playlist is selected
      if (currentPlaylistId !== playlistId) {
        setCurrentPlaylist(playlistCommercials);
        setCurrentPlaylistId(playlistId);
        
        // Start playing the first commercial
        setCurrentTrack({
          id: playlistCommercials[0].id,
          title: playlistCommercials[0].title,
          file_url: playlistCommercials[0].file_url,
          duration: playlistCommercials[0].duration
        });
      } else if (!isPlaying) {
        // If it's the same playlist but paused, resume playback
        togglePlayPause();
      }
    } catch (error) {
      console.error('Error loading playlist:', error);
      toast.error('Failed to load playlist');
    }
  };

  const handleCommercialDelete = async () => {
    await fetchData();
  };

  const handleUploadSuccess = async () => {
    await fetchData();
    toast.success('Commercial uploaded successfully');
  };

  // Filter commercials based on search query and selected status
  const filteredCommercials = commercials.filter(commercial => {
    const matchesSearch = 
      commercial.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      !selectedStatus || 
      commercial.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
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
        <h1 className="text-2xl font-semibold text-primary-50">Commercial Library</h1>
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => setShowCreatePlaylist(true)}
            className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
            Create Ad Schedule
          </button>
          <AddCommercialForm onUploadSuccess={handleUploadSuccess} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-64">
          <FilterPanel 
            selectedGenre={selectedStatus} 
            onGenreChange={handleStatusFilter} 
          />
        </div>
        
        <div className="flex-1 space-y-6">
          <SearchBar onSearch={handleSearch} />
          
          <CommercialPlaylistGrid
            playlists={playlists}
            onRefresh={fetchData}
            onPlay={handlePlayPlaylist}
          />

          <CommercialList
            commercials={filteredCommercials}
            onPlay={handlePlayCommercial}
            onDelete={handleCommercialDelete}
            currentCommercial={currentTrack}
            isPlaying={isPlaying}
          />
        </div>
      </div>

      <CreateCommercialPlaylistModal
        isOpen={showCreatePlaylist}
        onClose={() => setShowCreatePlaylist(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}