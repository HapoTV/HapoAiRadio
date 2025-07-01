import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Track } from '../types';
import { useMusicStore } from '../store/musicStore';

export function useAudioPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    setIsPlaying 
  } = useMusicStore();
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number>();
  const isUnmountingRef = useRef(false);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    
    // Set initial volume
    audio.volume = volume;
    
    // Clean up on unmount
    return () => {
      isUnmountingRef.current = true;
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      
      if (audio) {
        audio.pause();
        audio.src = '';
        audio.load();
      }
    };
  }, []);
  
  // Handle track changes
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    
    const audio = audioRef.current;
    
    // Reset state
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setIsLoading(true);
    
    console.log('Loading track:', currentTrack.title, currentTrack.file_url);
    
    // Update audio source
    audio.src = currentTrack.file_url;
    audio.load();
    
    // Event listeners
    const handleLoadedMetadata = () => {
      if (isUnmountingRef.current) return;
      
      console.log('Track metadata loaded:', currentTrack.title);
      setDuration(audio.duration);
      setIsLoading(false);
      
      // Play if needed - IMPORTANT: Only try to play after metadata is loaded
      if (isPlaying) {
        try {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error('Error playing track after metadata loaded:', error);
              setError('Failed to play track');
              setIsPlaying(false);
            });
          }
        } catch (error) {
          console.error('Error playing track after metadata loaded:', error);
          setError('Failed to play track');
          setIsPlaying(false);
        }
      }
    };
    
    const handleTimeUpdate = () => {
      if (isUnmountingRef.current) return;
      setCurrentTime(audio.currentTime);
    };
    
    const handleEnded = () => {
      if (isUnmountingRef.current) return;
      setIsPlaying(false);
    };
    
    const handleError = (e: ErrorEvent) => {
      if (isUnmountingRef.current) return;
      console.error('Audio error:', e);
      setError('Error loading audio');
      setIsLoading(false);
      setIsPlaying(false);
    };
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError as EventListener);
    
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError as EventListener);
    };
  }, [currentTrack, isPlaying, setIsPlaying]);
  
  // Handle play/pause changes
  useEffect(() => {
    if (!audioRef.current || isUnmountingRef.current) return;
    
    if (isPlaying) {
      // Only try to play if we're not already loading
      if (!isLoading) {
        try {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error('Error playing track on state change:', error);
              setIsPlaying(false);
            });
          }
        } catch (error) {
          console.error('Error playing track on state change:', error);
          setIsPlaying(false);
        }
      }
      
      // Start animation for smoother progress updates
      const updateProgress = () => {
        if (isUnmountingRef.current) return;
        
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
        animationRef.current = requestAnimationFrame(updateProgress);
      };
      
      animationRef.current = requestAnimationFrame(updateProgress);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    };
  }, [isPlaying, setIsPlaying, isLoading]);
  
  // Handle volume changes
  useEffect(() => {
    if (!audioRef.current || isUnmountingRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = 0;
    } else {
      audioRef.current.volume = volume;
    }
  }, [volume, isMuted]);
  
  const seek = useCallback((time: number) => {
    if (!audioRef.current || isUnmountingRef.current) return;
    
    try {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }, []);
  
  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);
  
  return {
    currentTime,
    duration,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    isLoading,
    error,
    seek
  };
}