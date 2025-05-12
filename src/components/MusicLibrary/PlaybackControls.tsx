import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { PlayIcon, PauseIcon, ForwardIcon, BackwardIcon } from '@heroicons/react/24/solid';
import type { Track } from '../../types';
import { recordTrackPlay } from '../../lib/analytics';

interface Props {
  tracks: Track[];
  onTrackEnd?: (track: Track) => void;
  storeId?: string;
  playlistId?: string;
}

export default function PlaybackControls({ tracks, onTrackEnd, storeId, playlistId }: Props) {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTrackEnd = () => {
    if (currentTrackIndex < tracks.length - 1) {
      setCurrentTrackIndex(currentTrackIndex + 1);
    } else {
      setCurrentTrackIndex(0);
    }
    setIsPlaying(true);
    
    // Record track play for analytics if store ID is provided
    if (storeId && tracks[currentTrackIndex]) {
      recordTrackPlay(
        tracks[currentTrackIndex].id,
        storeId,
        playlistId
      ).catch(err => console.error('Failed to record track play:', err));
    }
    
    if (onTrackEnd && tracks[currentTrackIndex]) {
      onTrackEnd(tracks[currentTrackIndex]);
    }
  };

  const handlePrevious = () => {
    setCurrentTrackIndex(currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1);
    setIsPlaying(true);
  };

  const handleNext = () => {
    setCurrentTrackIndex(currentTrackIndex === tracks.length - 1 ? 0 : currentTrackIndex + 1);
    setIsPlaying(true);
  };

  // Return null if there are no tracks or if the current track is undefined
  if (!tracks.length || !tracks[currentTrackIndex]) return null;

  const currentTrack = tracks[currentTrackIndex];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-primary-800 border-t border-primary-700 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary-50 truncate">
              {currentTrack.title}
            </p>
            <p className="text-sm text-primary-400 truncate">
              {currentTrack.artist || 'Unknown Artist'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={handlePrevious}
            className="p-2 text-primary-400 hover:text-primary-300"
          >
            <BackwardIcon className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={handlePlayPause}
            className="p-2 text-primary-400 hover:text-primary-300"
          >
            {isPlaying ? (
              <PauseIcon className="h-6 w-6" />
            ) : (
              <PlayIcon className="h-6 w-6" />
            )}
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="p-2 text-primary-400 hover:text-primary-300"
          >
            <ForwardIcon className="h-6 w-6" />
          </button>
        </div>

        <audio
          ref={audioRef}
          src={currentTrack.file_url}
          onEnded={handleTrackEnd}
          className="hidden"
          autoPlay
        />
      </div>
    </div>
  );
}