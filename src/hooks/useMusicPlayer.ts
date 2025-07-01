import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Track } from '../types';
import { useMusicStore } from '../store/musicStore';

export function useMusicPlayer() {
  const { currentTrack, isPlaying, setIsPlaying } = useMusicStore();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const animationRef = useRef<number | null>(null);

  // Initial setup
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    return () => {
      cleanupEventListeners();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audio.pause();
      audio.src = '';
      audio.load();
    };
  }, []);

  // Volume & Mute sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const cleanupEventListeners = () => {
    const audio = audioRef.current;
    audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    audio.removeEventListener('timeupdate', onTimeUpdate);
    audio.removeEventListener('ended', onEnded);
    audio.removeEventListener('error', onError);
  };

  const onLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
    setIsLoading(false);
  };

  const onTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const onEnded = () => {
    // Consider auto-playing the next track or repeating, if applicable.
    setIsPlaying(false);
  };

  const onError = (e: ErrorEvent) => {
    console.error('Audio Error:', e);
    setError('Error loading audio');
    setIsPlaying(false);
    setIsLoading(false);
  };

  const startProgressAnimation = () => {
    const update = () => {
      setCurrentTime(audioRef.current.currentTime);
      animationRef.current = requestAnimationFrame(update);
    };
    animationRef.current = requestAnimationFrame(update);
  };

  // Handle currentTrack & isPlaying changes
  useEffect(() => {
    const audio = audioRef.current;

    if (!currentTrack || !currentTrack.file_url) {
      setError('Invalid track');
      return;
    }

    cleanupEventListeners();

    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setIsLoading(true);

    audio.src = currentTrack.file_url;
    audio.load();

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    if (isPlaying) {
      audio.play().then(startProgressAnimation).catch((err) => {
        console.error('Error playing track:', err);
        setError('Failed to play track');
        setIsPlaying(false);
      });
    } else {
      audio.pause();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }

    return () => {
      cleanupEventListeners();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [currentTrack, isPlaying]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio && !isNaN(audio.duration)) {
      audio.currentTime = Math.min(Math.max(time, 0), audio.duration);
      setCurrentTime(audio.currentTime);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  return {
    currentTime,
    duration,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    isLoading,
    error,
    seek,
  };
}