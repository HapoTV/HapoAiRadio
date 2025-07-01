import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAudio } from '../../contexts/AudioContext';
import { 
  PlayIcon, 
  PauseIcon, 
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  PlusIcon,
  ClockIcon,
  MusicalNoteIcon
} from '@heroicons/react/24/outline';
import { QueueButton } from '../QueueManager';
import toast from 'react-hot-toast';
import type { Track } from '../../types';

type SortOption = 'recent' | 'title-asc' | 'title-desc' | 'artist-asc' | 'artist-desc' | 'album-asc' | 'album-desc' | 'duration-asc' | 'duration-desc';

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

const ITEMS_PER_PAGE = 10; // Changed from 25 to 10
const ALPHABET = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function ScrollableMusicLibrary() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [displayedTracks, setDisplayedTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [activeAlphabetIndex, setActiveAlphabetIndex] = useState<number | null>(null);
  
  const { currentTrack, isPlaying, setCurrentTrack, togglePlayPause } = useAudio();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastTrackRef = useRef<HTMLDivElement | null>(null);

  // Initial data fetch
  useEffect(() => {
    fetchTracks();
    fetchGenres();
  }, []);

  // Apply filters and sorting when tracks, search, sort, or genre changes
  useEffect(() => {
    if (tracks.length > 0) {
      applyFiltersAndSort();
    }
  }, [tracks, searchQuery, sortOption, selectedGenre]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (loadingMore) return;
    
    if (observer.current) {
      observer.current.disconnect();
    }
    
    const callback = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreTracks();
      }
    };
    
    observer.current = new IntersectionObserver(callback, {
      rootMargin: '100px',
    });
    
    if (lastTrackRef.current) {
      observer.current.observe(lastTrackRef.current);
    }
    
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loadingMore, hasMore, displayedTracks]);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, ITEMS_PER_PAGE - 1);
      
      if (error) throw error;
      
      setTracks(data || []);
      setPage(1);
      setHasMore(data?.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast.error('Failed to load music library');
    } finally {
      setLoading(false);
    }
  };

  const fetchGenres = async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('genre');
      
      if (error) throw error;
      
      // Extract unique genres from the array of genre arrays
      const allGenres = data
        .flatMap(track => track.genre || [])
        .filter(Boolean);
      
      const uniqueGenres = [...new Set(allGenres)].sort();
      setGenres(uniqueGenres);
    } catch (error) {
      console.error('Error fetching genres:', error);
    }
  };

  const loadMoreTracks = async () => {
    if (loadingMore || !hasMore) return;
    
    try {
      setLoadingMore(true);
      
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setTracks(prevTracks => [...prevTracks, ...data]);
        setPage(prevPage => prevPage + 1);
        setHasMore(data.length === ITEMS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more tracks:', error);
      toast.error('Failed to load more tracks');
    } finally {
      setLoadingMore(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...tracks];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(track => 
        track.title.toLowerCase().includes(query) ||
        (track.artist && track.artist.toLowerCase().includes(query)) ||
        (track.album && track.album.toLowerCase().includes(query))
      );
    }
    
    // Apply genre filter
    if (selectedGenre) {
      filtered = filtered.filter(track => 
        track.genre && track.genre.includes(selectedGenre)
      );
    }
    
    // Apply sorting
    const sortConfig = getSortConfig(sortOption);
    filtered = sortTracks(filtered, sortConfig);
    
    setDisplayedTracks(filtered);
  };

  const getSortConfig = (option: SortOption): SortConfig => {
    switch (option) {
      case 'recent':
        return { key: 'created_at', direction: 'desc' };
      case 'title-asc':
        return { key: 'title', direction: 'asc' };
      case 'title-desc':
        return { key: 'title', direction: 'desc' };
      case 'artist-asc':
        return { key: 'artist', direction: 'asc' };
      case 'artist-desc':
        return { key: 'artist', direction: 'desc' };
      case 'album-asc':
        return { key: 'album', direction: 'asc' };
      case 'album-desc':
        return { key: 'album', direction: 'desc' };
      case 'duration-asc':
        return { key: 'duration_seconds', direction: 'asc' };
      case 'duration-desc':
        return { key: 'duration_seconds', direction: 'desc' };
      default:
        return { key: 'created_at', direction: 'desc' };
    }
  };

  const sortTracks = (tracksToSort: Track[], config: SortConfig) => {
    return [...tracksToSort].sort((a, b) => {
      const aValue = a[config.key] || '';
      const bValue = b[config.key] || '';
      
      if (config.direction === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSortChange = (option: SortOption) => {
    setSortOption(option);
  };

  const handleGenreSelect = (genre: string | null) => {
    setSelectedGenre(genre);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedGenre(null);
    setSortOption('recent');
  };

  const handlePlayTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      setCurrentTrack(track);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const jumpToLetter = (letter: string) => {
    if (letter === '#') {
      // Jump to tracks that start with numbers
      const trackIndex = displayedTracks.findIndex(track => 
        /^\d/.test(track.title.charAt(0))
      );
      if (trackIndex >= 0) {
        scrollToTrack(trackIndex);
      }
    } else {
      // Jump to tracks that start with the selected letter
      const trackIndex = displayedTracks.findIndex(track => 
        track.title.charAt(0).toUpperCase() === letter
      );
      if (trackIndex >= 0) {
        scrollToTrack(trackIndex);
      }
    }
  };

  const scrollToTrack = (index: number) => {
    const trackElements = document.querySelectorAll('.track-item');
    if (trackElements[index]) {
      trackElements[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getFirstLetterCount = () => {
    const letterCounts: Record<string, number> = { '#': 0 };
    ALPHABET.slice(1).forEach(letter => {
      letterCounts[letter] = 0;
    });

    displayedTracks.forEach(track => {
      const firstChar = track.title.charAt(0).toUpperCase();
      if (/[A-Z]/.test(firstChar) && letterCounts[firstChar] !== undefined) {
        letterCounts[firstChar]++;
      } else if (/\d/.test(firstChar)) {
        letterCounts['#']++;
      }
    });

    return letterCounts;
  };

  const letterCounts = getFirstLetterCount();

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-16 bg-primary-800 rounded-lg"></div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-20 bg-primary-800 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Alphabetical quick-jump sidebar - visible on medium screens and up */}
      <div className="hidden md:flex flex-col items-center py-4 px-2 bg-primary-800 rounded-lg mr-4 self-start sticky top-24">
        {ALPHABET.map((letter, index) => {
          const hasItems = letterCounts[letter] > 0;
          return (
            <button
              key={letter}
              onClick={() => {
                if (hasItems) {
                  jumpToLetter(letter);
                  setActiveAlphabetIndex(index);
                  setTimeout(() => setActiveAlphabetIndex(null), 1000);
                }
              }}
              className={`
                w-8 h-8 flex items-center justify-center rounded-full mb-1
                ${hasItems 
                  ? 'text-primary-50 hover:bg-primary-700 cursor-pointer' 
                  : 'text-primary-500 cursor-not-allowed'}
                ${activeAlphabetIndex === index ? 'bg-primary-600' : ''}
                transition-colors
              `}
              disabled={!hasItems}
            >
              {letter}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Fixed header with search and filters */}
        <div className="bg-primary-800 p-4 rounded-lg mb-4 sticky top-0 z-10 shadow-md">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search by title, artist, or album..."
                className="w-full pl-10 pr-4 py-2 bg-primary-700 border border-primary-600 rounded-lg text-primary-50 placeholder-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-400 hover:text-primary-300"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="flex gap-2 sm:flex-nowrap flex-wrap">
              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 bg-primary-700 text-primary-50 rounded-lg hover:bg-primary-600 flex items-center"
                >
                  <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
                  <span className="whitespace-nowrap">Filters</span>
                  {(selectedGenre || sortOption !== 'recent') && (
                    <span className="ml-2 w-2 h-2 bg-primary-500 rounded-full"></span>
                  )}
                </button>

                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-64 bg-primary-800 rounded-lg shadow-lg z-20 border border-primary-700"
                    >
                      <div className="p-4">
                        <div className="mb-4">
                          <h3 className="text-primary-200 text-sm font-medium mb-2">Sort by</h3>
                          <select
                            value={sortOption}
                            onChange={(e) => handleSortChange(e.target.value as SortOption)}
                            className="w-full bg-primary-700 text-primary-50 rounded-lg p-2 border border-primary-600"
                          >
                            <option value="recent">Recently Added</option>
                            <option value="title-asc">Title (A-Z)</option>
                            <option value="title-desc">Title (Z-A)</option>
                            <option value="artist-asc">Artist (A-Z)</option>
                            <option value="artist-desc">Artist (Z-A)</option>
                            <option value="album-asc">Album (A-Z)</option>
                            <option value="album-desc">Album (Z-A)</option>
                            <option value="duration-asc">Duration (Shortest)</option>
                            <option value="duration-desc">Duration (Longest)</option>
                          </select>
                        </div>

                        <div className="mb-4">
                          <h3 className="text-primary-200 text-sm font-medium mb-2">Genre</h3>
                          <select
                            value={selectedGenre || ''}
                            onChange={(e) => handleGenreSelect(e.target.value || null)}
                            className="w-full bg-primary-700 text-primary-50 rounded-lg p-2 border border-primary-600"
                          >
                            <option value="">All Genres</option>
                            {genres.map(genre => (
                              <option key={genre} value={genre}>{genre}</option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={handleClearFilters}
                          className="w-full px-4 py-2 bg-primary-700 text-primary-50 rounded-lg hover:bg-primary-600"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => {
                  // This would open a modal to add new tracks
                  toast.success('Add music feature coming soon');
                }}
                className="px-4 py-2 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500 flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                <span>Add Music</span>
              </button>
            </div>
          </div>

          {/* Active filters display */}
          {(selectedGenre || searchQuery) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedGenre && (
                <div className="flex items-center bg-primary-700 text-primary-200 px-3 py-1 rounded-full text-sm">
                  <span>Genre: {selectedGenre}</span>
                  <button
                    onClick={() => setSelectedGenre(null)}
                    className="ml-2 text-primary-400 hover:text-primary-300"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
              {searchQuery && (
                <div className="flex items-center bg-primary-700 text-primary-200 px-3 py-1 rounded-full text-sm">
                  <span>Search: {searchQuery}</span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-2 text-primary-400 hover:text-primary-300"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Track list header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-primary-800 rounded-t-lg text-primary-400 text-sm font-medium">
          <div className="col-span-6 sm:col-span-5 flex items-center">
            <span className="ml-10">TITLE</span>
          </div>
          <div className="col-span-4 sm:col-span-3 hidden sm:flex items-center">ARTIST</div>
          <div className="col-span-3 hidden md:flex items-center">ALBUM</div>
          <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
            <ClockIcon className="h-5 w-5" />
          </div>
        </div>

        {/* Scrollable track list */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto bg-primary-800 rounded-b-lg"
        >
          {displayedTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-primary-400">
              <MusicalNoteIcon className="h-16 w-16 mb-4" />
              <p className="text-lg">No tracks found</p>
              <p className="text-sm mt-2">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="divide-y divide-primary-700">
              {displayedTracks.map((track, index) => {
                const isLastItem = index === displayedTracks.length - 1;
                const isCurrentTrack = currentTrack?.id === track.id;
                
                return (
                  <div
                    key={`${track.id}-${index}`}
                    ref={isLastItem ? lastTrackRef : null}
                    className={`
                      track-item grid grid-cols-12 gap-4 px-4 py-3 hover:bg-primary-700 
                      ${isCurrentTrack ? 'bg-primary-700' : ''}
                      transition-colors group
                    `}
                  >
                    <div className="col-span-6 sm:col-span-5 flex items-center min-w-0">
                      <button
                        onClick={() => handlePlayTrack(track)}
                        className="flex-shrink-0 p-2 rounded-full bg-primary-700/50 hover:bg-primary-600 transition-colors mr-3"
                      >
                        {isCurrentTrack && isPlaying ? (
                          <PauseIcon className="h-5 w-5 text-primary-50" />
                        ) : (
                          <PlayIcon className="h-5 w-5 text-primary-50" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isCurrentTrack ? 'text-primary-50' : 'text-primary-200'}`}>
                          {track.title}
                        </p>
                        <p className="text-xs text-primary-400 sm:hidden truncate">
                          {track.artist || 'Unknown Artist'}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-4 sm:col-span-3 hidden sm:flex items-center min-w-0">
                      <p className="text-sm text-primary-300 truncate">
                        {track.artist || 'Unknown Artist'}
                      </p>
                    </div>
                    <div className="col-span-3 hidden md:flex items-center min-w-0">
                      <p className="text-sm text-primary-300 truncate">
                        {track.album || '-'}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-primary-400">
                          {formatDuration(track.duration_seconds)}
                        </span>
                        <div className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity">
                          <QueueButton track={track} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Loading indicator */}
              {loadingMore && (
                <div className="py-4 flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                </div>
              )}
              
              {/* End of list message */}
              {!hasMore && displayedTracks.length > 0 && (
                <div className="py-4 text-center text-primary-400 text-sm">
                  End of library
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}