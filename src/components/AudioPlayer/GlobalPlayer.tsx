import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { useAudio } from '../../contexts/AudioContext';
import { useStackedPosition } from '../../hooks/useStackedPosition';
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ForwardIcon,
  BackwardIcon,
} from '@heroicons/react/24/solid';

export default function GlobalPlayer() {
  const {
    currentTrack,
    isPlaying,
    duration,
    currentTime,
    volume,
    togglePlayPause,
    seek,
    setVolume,
    playbackState,
    playNext,
    playPrevious,
    queue,
  } = useAudio();

  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const style = useStackedPosition({ bottomOffset: 0, zIndex: 50 });

  useEffect(() => {
    if (isMuted) {
      setPreviousVolume(volume);
      setVolume(0);
    } else {
      setVolume(previousVolume);
    }
  }, [isMuted, setVolume, volume, previousVolume]);

  const formatTime = useCallback((time: number) => {
    if (isNaN(time) || !isFinite(time)) return '00:00';
    return format(new Date(time * 1000), 'mm:ss');
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value));
  }, [seek]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, [setVolume]);

  if (!currentTrack) return null;

  return (
    <div
      style={style}
      className="bg-primary-800 border-t border-primary-700 p-4 transition-all duration-300 fixed bottom-0 left-0 right-0"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4 min-w-0 w-1/4">
          <div className="min-w-0 truncate">
            <p className="text-sm font-medium text-primary-50 truncate">
              {currentTrack.title}
            </p>
            <p className="text-xs text-primary-400 truncate">
              {currentTrack.artist || 'Unknown Artist'}
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-xl">
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-4 mb-1">
              <button
                onClick={playPrevious}
                disabled={playbackState === 'loading'}
                className="p-1 text-primary-400 hover:text-primary-300 disabled:opacity-50"
                aria-label="Previous track"
              >
                <BackwardIcon className="h-5 w-5" />
              </button>

              <button
                onClick={togglePlayPause}
                disabled={playbackState === 'loading'}
                className="p-2 rounded-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {playbackState === 'loading' ? (
                  <div className="h-5 w-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                ) : isPlaying ? (
                  <PauseIcon className="h-5 w-5 text-primary-50" />
                ) : (
                  <PlayIcon className="h-5 w-5 text-primary-50" />
                )}
              </button>

              <button
                onClick={playNext}
                disabled={playbackState === 'loading' || queue.length === 0}
                className="p-1 text-primary-400 hover:text-primary-300 disabled:opacity-50"
                aria-label="Next track"
              >
                <ForwardIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex items-center space-x-2 w-full">
              <span className="text-xs text-primary-400 w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <div className="relative flex-1 h-1 bg-primary-700 rounded-full">
                <div 
                  className="absolute h-full bg-primary-500 rounded-full"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                ></div>
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  value={currentTime || 0}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Seek"
                />
              </div>
              <span className="text-xs text-primary-400 w-10">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-1/4 justify-end">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 text-primary-400 hover:text-primary-300"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <SpeakerXMarkIcon className="h-5 w-5" />
            ) : (
              <SpeakerWaveIcon className="h-5 w-5" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolumeChange}
            className="w-24"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}