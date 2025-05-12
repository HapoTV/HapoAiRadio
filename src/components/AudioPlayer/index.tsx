import { useState, useEffect } from 'react';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import type { Track, Playlist } from '../../types';
import AutoQueue from './AutoQueue';
import NowPlaying from './NowPlaying';

interface Props {
  playlist: Playlist;
  onTrackChange?: (track: Track) => void;
  onError?: (error: Error) => void;
}

export default function AudioPlayer({ playlist, onTrackChange, onError }: Props) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [nextTrack, setNextTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const handleTrackChange = (track: Track) => {
    setCurrentTrack(track);
    onTrackChange?.(track);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="space-y-6">
      <NowPlaying
        nextTrack={nextTrack}
        onNext={() => {
          // Handle next track
        }}
        onPrevious={() => {
          // Handle previous track
        }}
      />

      <AutoQueue
        playlist={playlist}
        onTrackChange={handleTrackChange}
        onError={onError}
      />
    </div>
  );
}