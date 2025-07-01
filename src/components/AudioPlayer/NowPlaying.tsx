import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useAudio } from '../../contexts/AudioContext';
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from '@heroicons/react/24/solid';
import type { Track } from '../../types';

interface Props {
  nextTrack?: Track | null;
  onNext?: () => void;
  onPrevious?: () => void;
}

export default function NowPlaying({ nextTrack, onNext, onPrevious }: Props) {
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
  } = useAudio();

  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  const handleNext = useCallback(() => {
    if (!onNext) return;
    setIsTransitioning(true);
    onNext();
    setTimeout(() => setIsTransitioning(false), 300);
  }, [onNext]);

  const handlePrevious = useCallback(() => {
    if (!onPrevious) return;
    setIsTransitioning(true);
    onPrevious();
    setTimeout(() => setIsTransitioning(false), 300);
  }, [onPrevious]);

  if (!currentTrack) return null;

  return (
    <div className="bg-primary-800 rounded-xl p-6 shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Track */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTrack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {currentTrack.cover_url && (
                <div className="relative aspect-square overflow-hidden rounded-lg">
                  <img
                    src={currentTrack.cover_url}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <h2 className="text-xl font-semibold text-primary-50">
                  {currentTrack.title}
                </h2>
                <p className="text-primary-400">
                  {currentTrack.artist || 'Unknown Artist'}
                </p>
                {currentTrack.album && (
                  <p className="text-sm text-primary-400">{currentTrack.album}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-primary-400">
                    {formatTime(currentTime)}
                  </span>
                  <div className="flex-1 relative">
                    <div className="h-1 bg-primary-700 rounded-full">
                      <motion.div
                        className="absolute h-full bg-primary-500 rounded-full"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={duration || 1}
                      value={currentTime || 0}
                      onChange={handleSeek}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer"
                      aria-label="Seek"
                    />
                  </div>
                  <span className="text-sm text-primary-400">
                    {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-2 text-primary-400 hover:text-primary-300"
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

                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handlePrevious}
                      disabled={!onPrevious}
                      className="p-2 text-primary-400 hover:text-primary-300 disabled:opacity-50"
                      aria-label="Previous track"
                    >
                      <BackwardIcon className="h-6 w-6" />
                    </button>

                    <button
                      onClick={togglePlayPause}
                      disabled={playbackState === 'loading'}
                      className="p-3 rounded-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50"
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {playbackState === 'loading' ? (
                        <div className="h-6 w-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                      ) : isPlaying ? (
                        <PauseIcon className="h-6 w-6 text-primary-50" />
                      ) : (
                        <PlayIcon className="h-6 w-6 text-primary-50" />
                      )}
                    </button>

                    <button
                      onClick={handleNext}
                      disabled={!onNext}
                      className="p-2 text-primary-400 hover:text-primary-300 disabled:opacity-50"
                      aria-label="Next track"
                    >
                      <ForwardIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next Track */}
        <div className="border-l border-primary-700 pl-6">
          <h3 className="text-sm font-medium text-primary-400 mb-4">Up Next</h3>
          <AnimatePresence mode="wait">
            {nextTrack ? (
              <motion.div
                key={nextTrack.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {nextTrack.cover_url && (
                  <div className="relative aspect-square overflow-hidden rounded-lg">
                    <img
                      src={nextTrack.cover_url}
                      alt={nextTrack.title}
                      className="w-full h-full object-cover opacity-75"
                    />
                  </div>
                )}

                <div>
                  <h4 className="text-lg font-medium text-primary-200">
                    {nextTrack.title}
                  </h4>
                  <p className="text-primary-400">
                    {nextTrack.artist || 'Unknown Artist'}
                  </p>
                  {nextTrack.album && (
                    <p className="text-sm text-primary-400">{nextTrack.album}</p>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-primary-400 text-center py-8"
              >
                No more tracks in queue
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}