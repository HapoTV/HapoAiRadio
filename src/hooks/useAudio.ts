// src/hooks/useAudio.ts
import { useState } from 'react';

export function useAudio() {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  return {
    currentTrack,
    setCurrentTrack,
    isPlaying,
    togglePlayPause,
  };
}
