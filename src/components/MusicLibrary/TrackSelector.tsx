import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { Track } from '../../types';
import { MagnifyingGlassIcon, CheckIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
import debounce from 'lodash.debounce';

interface Props {
  selectedTracks: string[];
  onTrackSelect: (trackIds: string[]) => void;
  mode?: 'single' | 'multi';
}

export default function TrackSelector({ selectedTracks, onTrackSelect, mode = 'single' }: Props) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>(selectedTracks);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchTracks();
  }, []);

  useEffect(() => {
    filterTracks();
  }, [searchQuery, tracks]);

  useEffect(() => {
    // Clean up audio when component unmounts
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const fetchTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('title');

      if (error) throw error;
      setTracks(data || []);
      setFilteredTracks(data || []);
    } catch (error) {
      console.error('Error fetching tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTracks = debounce(() => {
    if (!searchQuery.trim()) {
      setFilteredTracks(tracks);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = tracks.filter(track => 
      track.title.toLowerCase().includes(query) ||
      (track.artist && track.artist.toLowerCase().includes(query))
    );
    setFilteredTracks(filtered);
  }, 300);

  const handleTrackSelect = (trackId: string) => {
    if (mode === 'single') {
      onTrackSelect([trackId]);
      return;
    }

    const newSelected = selected.includes(trackId)
      ? selected.filter(id => id !== trackId)
      : [...selected, trackId];
    
    setSelected(newSelected);
  };

  const handlePlayPause = (track: Track, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent track selection when clicking play/pause

    if (currentlyPlaying === track.id) {
      // If this track is currently playing, pause it
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentlyPlaying(null);
    } else {
      // If another track is playing, stop it
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Create new audio element for the selected track
      const audio = new Audio(track.file_url);
      audioRef.current = audio;

      // Add event listener for when the track ends
      audio.addEventListener('ended', () => {
        setCurrentlyPlaying(null);
      });

      // Play the new track
      audio.play();
      setCurrentlyPlaying(track.id);
    }
  };

  const handleSubmit = () => {
    if (selected.length > 0) {
      onTrackSelect(selected);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-primary-700 rounded-lg"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-primary-700 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tracks..."
          className="w-full pl-10 pr-4 py-2 bg-primary-700 border border-primary-600 rounded-lg text-primary-50 placeholder-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredTracks.map((track) => (
          <div
            key={track.id}
            onClick={() => handleTrackSelect(track.id)}
            className={`
              flex items-center justify-between p-4 rounded-lg cursor-pointer
              ${selected.includes(track.id)
                ? 'bg-primary-600'
                : 'bg-primary-700 hover:bg-primary-600'
              }
            `}
          >
            <div className="flex items-center space-x-4">
              <button
                onClick={(e) => handlePlayPause(track, e)}
                className="p-2 rounded-full bg-primary-500/50 hover:bg-primary-500 transition-colors"
              >
                {currentlyPlaying === track.id ? (
                  <PauseIcon className="h-4 w-4 text-primary-50" />
                ) : (
                  <PlayIcon className="h-4 w-4 text-primary-50" />
                )}
              </button>
              <div>
                <p className="text-primary-50 font-medium">{track.title}</p>
                <p className="text-primary-400 text-sm">{track.artist || 'Unknown Artist'}</p>
              </div>
            </div>
            {selected.includes(track.id) && (
              <CheckIcon className="h-5 w-5 text-primary-300" />
            )}
          </div>
        ))}
        {filteredTracks.length === 0 && (
          <p className="text-center text-primary-400 py-4">No tracks found</p>
        )}
      </div>

      {mode === 'multi' && (
        <div className="flex justify-end pt-4 border-t border-primary-700">
          <button
            onClick={handleSubmit}
            disabled={selected.length === 0}
            className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Selected Tracks
          </button>
        </div>
      )}
    </div>
  );
}