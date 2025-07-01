import React from 'react';
import { createContext, useContext, useRef, useState, useEffect } from 'react';
import { Howl } from 'howler';
import type { Track } from '../types';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { recordTrackPlay } from '../lib/analytics';

interface AudioContextType {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  volume: number;
  togglePlayPause: () => void;
  setCurrentTrack: (track: Track, storeId?: string, playlistId?: string) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  playbackState: 'loading' | 'ready' | 'error';
  saveQueueAsPlaylist: (name: string) => Promise<void>;
  getTotalQueueDuration: () => number;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [playbackState, setPlaybackState] = useState<'loading' | 'ready' | 'error'>('ready');
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  
  const soundRef = useRef<Howl | null>(null);
  const requestRef = useRef<number>();
  const animationActive = useRef(false);
  const isUnmountingRef = useRef(false);

  // Cleanup function to stop all audio and animation
  const cleanupAudio = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = undefined;
    }
    
    if (soundRef.current) {
      soundRef.current.stop();
      soundRef.current.unload();
      soundRef.current = null;
    }
    
    animationActive.current = false;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      cleanupAudio();
    };
  }, []);

  // Load saved state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('audioPlayerState');
      if (savedState) {
        const { track, storeId, playlistId, queueItems, volume: savedVolume } = JSON.parse(savedState);
        if (track) {
          handleTrackChange(track, storeId, playlistId, false); // Don't autoplay on page load
        }
        if (queueItems && Array.isArray(queueItems)) {
          setQueue(queueItems);
        }
        if (savedVolume !== undefined) {
          setVolume(savedVolume);
        }
      }
    } catch (error) {
      console.error('Error restoring audio state:', error);
      // Clear potentially corrupted state
      localStorage.removeItem('audioPlayerState');
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (currentTrack) {
      try {
        const stateToSave = {
          track: currentTrack,
          storeId: currentStoreId,
          playlistId: currentPlaylistId,
          queueItems: queue,
          volume
        };
        localStorage.setItem('audioPlayerState', JSON.stringify(stateToSave));
      } catch (error) {
        console.error('Error saving audio state:', error);
      }
    }
  }, [currentTrack, currentStoreId, currentPlaylistId, queue, volume]);

  const animate = () => {
    if (!animationActive.current || isUnmountingRef.current) return;
    
    if (soundRef.current && soundRef.current.playing()) {
      try {
        const currentSeek = soundRef.current.seek() as number;
        if (!isNaN(currentSeek) && isFinite(currentSeek)) {
          setCurrentTime(currentSeek);
        }
      } catch (error) {
        console.error('Error getting current time:', error);
      }
      requestRef.current = requestAnimationFrame(animate);
    } else if (soundRef.current) {
      // If not playing but sound exists, just update once
      try {
        const currentSeek = soundRef.current.seek() as number;
        if (!isNaN(currentSeek) && isFinite(currentSeek)) {
          setCurrentTime(currentSeek);
        }
      } catch (error) {
        console.error('Error getting current time:', error);
      }
    }
  };

  const startAnimation = () => {
    if (animationActive.current || isUnmountingRef.current) return;
    
    animationActive.current = true;
    requestRef.current = requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    if (!animationActive.current) return;
    
    animationActive.current = false;
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = undefined;
    }
  };

  const handleTrackChange = (track: Track, storeId?: string, playlistId?: string, autoplay = true) => {
    // Clean up any existing audio
    cleanupAudio();

    if (isUnmountingRef.current) return;

    setPlaybackState('loading');
    setCurrentTrack(track);
    setCurrentTime(0);
    
    // Store the context for analytics
    if (storeId) setCurrentStoreId(storeId);
    if (playlistId) setCurrentPlaylistId(playlistId);

    // Create a new Howl instance with better error handling
    const sound = new Howl({
      src: [track.file_url],
      html5: true,
      volume: volume,
      preload: true,
      format: ['mp3', 'wav', 'ogg'],
      onload: () => {
        if (isUnmountingRef.current) return;
        
        console.log('Track loaded successfully:', track.title);
        setDuration(sound.duration());
        setPlaybackState('ready');
        
        // Only attempt to play after successful load
        if (autoplay) {
          sound.play().catch(error => {
            console.error('Error playing track after load:', error);
            setPlaybackState('error');
            toast.error('Failed to play track');
          });
        }
      },
      onloaderror: (id, error) => {
        if (isUnmountingRef.current) return;
        console.error('Error loading track:', error, track.file_url);
        setPlaybackState('error');
        toast.error('Failed to load audio file');
        
        // Try to play next track if available
        setTimeout(() => playNext(), 1000);
      },
      onplay: () => {
        if (isUnmountingRef.current) return;
        console.log('Track playing:', track.title);
        setIsPlaying(true);
        startAnimation();
        
        // Record play for analytics if store ID is available
        if (storeId) {
          recordTrackPlay(track.id, storeId, playlistId)
            .catch(err => console.error('Failed to record track play:', err));
        }
      },
      onpause: () => {
        if (isUnmountingRef.current) return;
        setIsPlaying(false);
        stopAnimation();
      },
      onstop: () => {
        if (isUnmountingRef.current) return;
        setIsPlaying(false);
        stopAnimation();
      },
      onend: () => {
        if (isUnmountingRef.current) return;
        setIsPlaying(false);
        stopAnimation();
        playNext();
      },
      onplayerror: (id, error) => {
        if (isUnmountingRef.current) return;
        console.error('Error playing track:', error);
        setPlaybackState('error');
        toast.error('Error playing audio file');
        
        // Try to play next track if available
        setTimeout(() => playNext(), 1000);
      }
    });

    soundRef.current = sound;
  };

  const togglePlayPause = () => {
    if (!soundRef.current) return;

    try {
      if (isPlaying) {
        soundRef.current.pause();
      } else {
        const playPromise = soundRef.current.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch(error => {
            console.error('Error in togglePlayPause:', error);
            setPlaybackState('error');
            toast.error('Failed to play track');
          });
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      toast.error('Playback error occurred');
    }
  };

  const seek = (time: number) => {
    if (!soundRef.current) return;
    
    try {
      soundRef.current.seek(time);
      setCurrentTime(time);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (!soundRef.current) return;
    
    try {
      soundRef.current.volume(newVolume);
      setVolume(newVolume);
    } catch (error) {
      console.error('Error changing volume:', error);
    }
  };

  const addToQueue = (track: Track) => {
    setQueue(prev => [...prev, track]);
    toast.success('Added to queue');
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const clearQueue = () => {
    setQueue([]);
    toast.success('Queue cleared');
  };

  const reorderQueue = (startIndex: number, endIndex: number) => {
    setQueue(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const playNext = () => {
    if (queue.length === 0) {
      setCurrentTrack(null);
      return;
    }

    const nextTrack = queue[0];
    setQueue(prev => prev.slice(1));
    handleTrackChange(nextTrack, currentStoreId || undefined, currentPlaylistId || undefined);
  };

  const playPrevious = () => {
    if (!currentTrack) return;
    
    // Add current track back to the front of the queue
    setQueue(prev => [currentTrack, ...prev]);
    
    // Play the previous track if it exists in history
    // For now, just play the first track in queue
    if (queue.length > 0) {
      handleTrackChange(queue[0], currentStoreId || undefined, currentPlaylistId || undefined);
      setQueue(prev => prev.slice(1));
    }
  };

  const saveQueueAsPlaylist = async (name: string) => {
    try {
      const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .insert([{ name }])
        .select()
        .single();

      if (playlistError) throw playlistError;

      const tracks = currentTrack ? [currentTrack, ...queue] : queue;
      const playlistTracks = tracks.map((track, index) => ({
        playlist_id: playlist.id,
        track_id: track.id,
        position: index
      }));

      const { error: tracksError } = await supabase
        .from('playlist_tracks')
        .insert(playlistTracks);

      if (tracksError) throw tracksError;

      toast.success('Queue saved as playlist');
    } catch (error) {
      console.error('Error saving queue as playlist:', error);
      toast.error('Failed to save queue as playlist');
    }
  };

  const getTotalQueueDuration = () => {
    return queue.reduce((total, track) => total + track.duration, currentTrack ? currentTrack.duration : 0);
  };

  const value = {
    currentTrack,
    queue,
    isPlaying,
    duration,
    currentTime,
    volume,
    togglePlayPause,
    setCurrentTrack: (track: Track, storeId?: string, playlistId?: string) => 
      handleTrackChange(track, storeId, playlistId),
    addToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    playNext,
    playPrevious,
    seek,
    setVolume: handleVolumeChange,
    playbackState,
    saveQueueAsPlaylist,
    getTotalQueueDuration,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

// Export as a constant to maintain Fast Refresh compatibility
export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};