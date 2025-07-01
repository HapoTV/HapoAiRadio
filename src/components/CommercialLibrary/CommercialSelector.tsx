import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { Advertisement } from '../../types';
import { MagnifyingGlassIcon, CheckIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
import debounce from 'lodash.debounce';
import { CommercialLibrary } from '../components/CommercialLibrary';
// Ensure path reflects the correct directory structure

interface Props {
  selectedCommercials: string[];
  onCommercialSelect: (commercialIds: string[]) => void;
  mode?: 'single' | 'multi';
}

export default function CommercialSelector({ selectedCommercials, onCommercialSelect, mode = 'single' }: Props) {
  const [commercials, setCommercials] = useState<Advertisement[]>([]);
  const [filteredCommercials, setFilteredCommercials] = useState<Advertisement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>(selectedCommercials);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchCommercials();
  }, []);

  useEffect(() => {
    filterCommercials();
  }, [searchQuery, commercials]);

  useEffect(() => {
    // Clean up audio when component unmounts
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const fetchCommercials = async () => {
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('status', 'active')
        .order('title');

      if (error) throw error;
      setCommercials(data || []);
      setFilteredCommercials(data || []);
    } catch (error) {
      console.error('Error fetching commercials:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCommercials = debounce(() => {
    if (!searchQuery.trim()) {
      setFilteredCommercials(commercials);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = commercials.filter(commercial => 
      commercial.title.toLowerCase().includes(query)
    );
    setFilteredCommercials(filtered);
  }, 300);

  const handleCommercialSelect = (commercialId: string) => {
    if (mode === 'single') {
      onCommercialSelect([commercialId]);
      return;
    }

    const newSelected = selected.includes(commercialId)
      ? selected.filter(id => id !== commercialId)
      : [...selected, commercialId];
    
    setSelected(newSelected);
  };

  const handlePlayPause = (commercial: Advertisement, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent commercial selection when clicking play/pause

    if (currentlyPlaying === commercial.id) {
      // If this commercial is currently playing, pause it
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentlyPlaying(null);
    } else {
      // If another commercial is playing, stop it
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Create new audio element for the selected commercial
      const audio = new Audio(commercial.file_url);
      audioRef.current = audio;

      // Add event listener for when the commercial ends
      audio.addEventListener('ended', () => {
        setCurrentlyPlaying(null);
      });

      // Play the new commercial
      audio.play();
      setCurrentlyPlaying(commercial.id);
    }
  };

  const handleSubmit = () => {
    if (selected.length > 0) {
      onCommercialSelect(selected);
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
          placeholder="Search commercials..."
          className="w-full pl-10 pr-4 py-2 bg-primary-700 border border-primary-600 rounded-lg text-primary-50 placeholder-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredCommercials.map((commercial) => (
          <div
            key={commercial.id}
            onClick={() => handleCommercialSelect(commercial.id)}
            className={`
              flex items-center justify-between p-4 rounded-lg cursor-pointer
              ${selected.includes(commercial.id)
                ? 'bg-primary-600'
                : 'bg-primary-700 hover:bg-primary-600'
              }
            `}
          >
            <div className="flex items-center space-x-4">
              <button
                onClick={(e) => handlePlayPause(commercial, e)}
                className="p-2 rounded-full bg-primary-500/50 hover:bg-primary-500 transition-colors"
              >
                {currentlyPlaying === commercial.id ? (
                  <PauseIcon className="h-4 w-4 text-primary-50" />
                ) : (
                  <PlayIcon className="h-4 w-4 text-primary-50" />
                )}
              </button>
              <div>
                <p className="text-primary-50 font-medium">{commercial.title}</p>
                <p className="text-primary-400 text-sm">
                  {Math.floor(commercial.duration / 60)}:{String(commercial.duration % 60).padStart(2, '0')}
                </p>
              </div>
            </div>
            {selected.includes(commercial.id) && (
              <CheckIcon className="h-5 w-5 text-primary-300" />
            )}
          </div>
        ))}
        {filteredCommercials.length === 0 && (
          <p className="text-center text-primary-400 py-4">No commercials found</p>
        )}
      </div>

      {mode === 'multi' && (
        <div className="flex justify-end pt-4 border-t border-primary-700">
          <button
            onClick={handleSubmit}
            disabled={selected.length === 0}
            className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Selected Commercials
          </button>
        </div>
      )}
    </div>
  );
}