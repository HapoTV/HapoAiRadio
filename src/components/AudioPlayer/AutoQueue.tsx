import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Track, Playlist } from '../../types';
import { useLocalStorage } from '../../hooks/useLocalStorage';

interface Props {
  playlist: Playlist;
  onTrackChange?: (track: Track) => void;
  onError?: (error: Error) => void;
}

interface QueueState {
  currentTrack: Track | null;
  nextTrack: Track | null;
  queue: Track[];
  playlistVersion: string;
}

export default function AutoQueue({ playlist, onTrackChange, onError }: Props) {
  const [queueState, setQueueState] = useState<QueueState>({
    currentTrack: null,
    nextTrack: null,
    queue: [],
    playlistVersion: '',
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [crossfadeEnabled] = useState(true);
  const [crossfadeDuration] = useState(2); // seconds
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
  const isUnmountingRef = useRef(false);
  
  // Persist queue state to localStorage
  const [persistedState, setPersistedState] = useLocalStorage<QueueState>(
    `queue-state-${playlist.id}`,
    queueState
  );

  // Initialize audio elements
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }
    
    if (!nextAudioRef.current) {
      nextAudioRef.current = new Audio();
      nextAudioRef.current.preload = 'auto';
    }
    
    return () => {
      isUnmountingRef.current = true;
      
      // Clean up audio elements
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
        audioRef.current = null;
      }
      
      if (nextAudioRef.current) {
        nextAudioRef.current.pause();
        nextAudioRef.current.src = '';
        nextAudioRef.current.load();
        nextAudioRef.current = null;
      }
    };
  }, []);

  // Restore persisted state on mount and initialize queue
  useEffect(() => {
    // Restore persisted state on mount
    if (persistedState && persistedState.queue.length > 0) {
      setQueueState(persistedState);
      
      // Preload first track if available
      if (persistedState.currentTrack && audioRef.current) {
        preloadTrack(persistedState.currentTrack, audioRef.current);
        setActiveAudio(audioRef.current);
      }
      
      // Preload next track if available
      if (persistedState.nextTrack && nextAudioRef.current) {
        preloadTrack(persistedState.nextTrack, nextAudioRef.current);
      }
    } else {
      // Initialize queue if no persisted state
      initializeQueue();
    }
    
    // Subscribe to playlist changes
    const subscription = supabase
      .channel(`playlist-${playlist.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'playlist_tracks',
        filter: `playlist_id=eq.${playlist.id}`
      }, () => {
        refreshQueue();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [playlist.id, persistedState]);

  // Save state changes to localStorage
  useEffect(() => {
    if (queueState.currentTrack) {
      setPersistedState(queueState);
    }
  }, [queueState, setPersistedState]);

  // Set up event listeners for audio elements
  useEffect(() => {
    const currentAudio = audioRef.current;
    const nextAudio = nextAudioRef.current;
    
    if (!currentAudio || !nextAudio) return;
    
    const handleLoadedMetadata = () => {
      if (isUnmountingRef.current) return;
      
      // Now that metadata is loaded, we can safely play
      if (isPlaying && currentAudio === activeAudio) {
        try {
          const playPromise = currentAudio.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error('Error playing after metadata loaded:', error);
              onError?.(new Error('Failed to play track after loading'));
            });
          }
        } catch (error) {
          console.error('Error playing after metadata loaded:', error);
          onError?.(new Error('Failed to play track after loading'));
        }
      }
    };
    
    const handleCurrentEnded = () => {
      if (isUnmountingRef.current) return;
      handleTrackEnd();
    };
    
    const handleCurrentError = (e: ErrorEvent) => {
      if (isUnmountingRef.current) return;
      console.error('Audio error:', e);
      handleError(new Error('Current track playback failed'));
    };
    
    const handleNextError = (e: ErrorEvent) => {
      if (isUnmountingRef.current) return;
      console.error('Next audio error:', e);
      handleError(new Error('Next track preload failed'));
    };
    
    currentAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
    currentAudio.addEventListener('ended', handleCurrentEnded);
    currentAudio.addEventListener('error', handleCurrentError as EventListener);
    nextAudio.addEventListener('error', handleNextError as EventListener);
    
    return () => {
      currentAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      currentAudio.removeEventListener('ended', handleCurrentEnded);
      currentAudio.removeEventListener('error', handleCurrentError as EventListener);
      nextAudio.removeEventListener('error', handleNextError as EventListener);
    };
  }, [isPlaying, activeAudio, onError]);

  const initializeQueue = async () => {
    try {
      const { data: tracks, error } = await supabase
        .from('playlist_tracks')
        .select(`
          position,
          tracks (*)
        `)
        .eq('playlist_id', playlist.id)
        .order('position');

      if (error) throw error;

      const orderedTracks = tracks
        .map(item => item.tracks)
        .filter(track => track !== null);

      if (orderedTracks.length === 0) {
        console.warn('No tracks found in playlist');
        return;
      }

      setQueueState(state => ({
        ...state,
        queue: orderedTracks,
        currentTrack: orderedTracks[0] || null,
        nextTrack: orderedTracks[1] || null,
        playlistVersion: Date.now().toString(),
      }));

      // Preload first track
      if (orderedTracks[0] && audioRef.current) {
        preloadTrack(orderedTracks[0], audioRef.current);
        setActiveAudio(audioRef.current);
        
        // Notify track change
        if (onTrackChange) {
          onTrackChange(orderedTracks[0]);
        }
      }
      
      // Preload second track
      if (orderedTracks[1] && nextAudioRef.current) {
        preloadTrack(orderedTracks[1], nextAudioRef.current);
      }
    } catch (error) {
      console.error('Error initializing queue:', error);
      onError?.(error as Error);
    }
  };

  const refreshQueue = async () => {
    try {
      const { data: tracks, error } = await supabase
        .from('playlist_tracks')
        .select(`
          position,
          tracks (*)
        `)
        .eq('playlist_id', playlist.id)
        .order('position');

      if (error) throw error;

      const orderedTracks = tracks
        .map(item => item.tracks)
        .filter(track => track !== null);

      // Update queue while preserving current playback
      setQueueState(state => {
        const currentIndex = orderedTracks.findIndex(
          track => track.id === state.currentTrack?.id
        );

        const nextIndex = currentIndex !== -1 ? currentIndex + 1 : 0;
        const nextTrack = orderedTracks[nextIndex] || null;

        return {
          ...state,
          queue: orderedTracks,
          nextTrack: nextTrack,
          playlistVersion: Date.now().toString(),
        };
      });

      // Preload next track if it changed
      if (queueState.nextTrack && nextAudioRef.current) {
        preloadTrack(queueState.nextTrack, nextAudioRef.current);
      }
    } catch (error) {
      console.error('Error refreshing queue:', error);
      onError?.(error as Error);
    }
  };

  const preloadTrack = useCallback((track: Track, audioElement: HTMLAudioElement | null) => {
    if (!audioElement || isUnmountingRef.current) return;
    
    try {
      // Clean up any existing audio
      audioElement.pause();
      
      // Set new source and load
      console.log('Preloading track:', track.title, track.file_url);
      audioElement.src = track.file_url;
      
      // Use the load() method to preload the audio
      audioElement.load();
    } catch (error) {
      console.error('Error preloading track:', error);
      onError?.(error as Error);
    }
  }, [onError]);

  const handleTrackEnd = useCallback(() => {
    if (isUnmountingRef.current) return;
    
    // Advance to next track
    setQueueState(state => {
      const currentIndex = state.queue.findIndex(
        track => track.id === state.currentTrack?.id
      );
      const nextIndex = currentIndex + 1;
      const newNextIndex = nextIndex + 1;

      const newCurrentTrack = state.nextTrack;
      const newNextTrack = state.queue[newNextIndex] || null;

      // Notify track change
      if (newCurrentTrack && onTrackChange) {
        onTrackChange(newCurrentTrack);
      }

      return {
        ...state,
        currentTrack: newCurrentTrack,
        nextTrack: newNextTrack,
      };
    });

    // Swap audio elements
    const temp = audioRef.current;
    audioRef.current = nextAudioRef.current;
    nextAudioRef.current = temp;
    setActiveAudio(audioRef.current);

    // Start playing new track
    if (audioRef.current) {
      try {
        console.log('Playing next track after end');
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Error playing next track:', error);
            onError?.(new Error('Failed to play next track'));
          });
        }
      } catch (error) {
        console.error('Error playing next track:', error);
        onError?.(new Error('Failed to play next track'));
      }
    }

    // Preload next track
    if (queueState.nextTrack && nextAudioRef.current) {
      preloadTrack(queueState.nextTrack, nextAudioRef.current);
    }
  }, [queueState.nextTrack, onTrackChange, onError, preloadTrack]);

  const handleError = useCallback((error: Error) => {
    console.error('Playback error:', error);
    onError?.(error);
    
    // Attempt to continue with next track
    handleTrackEnd();
  }, [handleTrackEnd, onError]);

  // Crossfade implementation
  useEffect(() => {
    if (!crossfadeEnabled || !audioRef.current || !nextAudioRef.current) return;
    
    const currentAudio = audioRef.current;
    const nextAudio = nextAudioRef.current;
    
    // Ensure we're only working with the active audio element
    if (currentAudio !== activeAudio) return;

    const handleTimeUpdate = () => {
      if (!currentAudio || !nextAudio || isUnmountingRef.current) return;
      if (!currentAudio.duration) return;

      const timeRemaining = currentAudio.duration - currentAudio.currentTime;
      
      if (timeRemaining <= crossfadeDuration && timeRemaining > 0) {
        const fadeOutVolume = timeRemaining / crossfadeDuration;
        const fadeInVolume = 1 - fadeOutVolume;
        
        currentAudio.volume = Math.max(0, Math.min(1, fadeOutVolume));
        
        // Start playing next track if it's not already playing
        if (nextAudio.paused && nextAudio.src) {
          nextAudio.volume = 0;
          try {
            const playPromise = nextAudio.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.error('Error starting crossfade:', error);
              });
            }
          } catch (error) {
            console.error('Error starting crossfade:', error);
          }
        }
        
        if (!nextAudio.paused) {
          nextAudio.volume = Math.max(0, Math.min(1, fadeInVolume));
        }
      }
    };

    const handleEnded = () => {
      // When current track ends, make sure next track is playing at full volume
      if (nextAudio && !nextAudio.paused) {
        nextAudio.volume = 1;
      }
    };

    currentAudio.addEventListener('timeupdate', handleTimeUpdate);
    currentAudio.addEventListener('ended', handleEnded);
    
    return () => {
      currentAudio.removeEventListener('timeupdate', handleTimeUpdate);
      currentAudio.removeEventListener('ended', handleEnded);
    };
  }, [crossfadeEnabled, crossfadeDuration, activeAudio]);

  return (
    <div className="hidden">
      {/* These audio elements are hidden but used for playback */}
    </div>
  );
}