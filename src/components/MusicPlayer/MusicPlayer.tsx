import React from 'react';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ForwardIcon,
  BackwardIcon,
} from '@heroicons/react/24/solid';
import { useMusicStore } from '../../store/musicStore';

interface MusicPlayerProps {
  className?: string;
}

export default function MusicPlayer({ className = '' }: MusicPlayerProps) {
  const {
    currentTrack,
    queue,
    isPlaying,
    setIsPlaying,
    playNext,
    playPrevious,
  } = useMusicStore();

  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = volume;
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setCurrentTime(audio.currentTime);
      if (isPlaying) audio.play(); // Start playing if the current track is set to play
    };
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);

    const handleError = () => setError('Error loading audio');

    const handleEnded = () => {
      playNext(); // Automatically play the next track when the current one ends
      setIsPlaying(true); // Ensure the isPlaying state is true for autoplay
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playNext, isPlaying]);

  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    const audio = audioRef.current;
    audio.src = currentTrack.file_url;
    audio.load();
    if (isPlaying) audio.play(); // Ensure we start playing when the currentTrack is set
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      const audio = audioRef.current;
      audio.play().catch(() => setError('Failed to play track'));
      animationRef.current = requestAnimationFrame(updateProgress);
    } else {
      audioRef.current.pause();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying]);

  const updateProgress = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    animationRef.current = requestAnimationFrame(updateProgress);
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const togglePlayPause = useCallback(() => setIsPlaying(!isPlaying), [isPlaying, setIsPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => setIsMuted(!isMuted), [isMuted]);

  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  if (!currentTrack) {
    return (
      <div className={`bg-primary-800 rounded-xl p-6 shadow-lg ${className}`}>
        <div className="text-center py-8 text-primary-400">
          <p>No track selected</p>
          <p className="text-sm mt-2">Select a track from the library to start playing</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-primary-800 rounded-xl p-6 shadow-lg ${className}`}>
      {error && (
        <div className="bg-status-errorBg text-status-error p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary-700 rounded-lg flex items-center justify-center">
              {currentTrack.cover_url ? (
                <img 
                  src={currentTrack.cover_url} 
                  alt={currentTrack.title} 
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="text-3xl text-primary-500">♪</div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-primary-50 truncate">
                {currentTrack.title}
              </h3>
              <p className="text-primary-400 truncate">{currentTrack.artist || 'Unknown Artist'}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-primary-400 w-10 text-right">{formatTime(currentTime)}</span>
              <div className="relative flex-1 h-2 bg-primary-700 rounded-full">
                <div 
                  className="absolute h-full bg-primary-500 rounded-full"
                  style={{ width: `${(currentTime / (audioRef.current?.duration || 1)) * 100}%` }}
                ></div>
                <input
                  type="range"
                  min={0}
                  max={audioRef.current?.duration || 1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Seek"
                />
              </div>
              <span className="text-xs text-primary-400 w-10">{formatTime(audioRef.current?.duration || 0)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button onClick={toggleMute} className="p-2 text-primary-400 hover:text-primary-300" aria-label={isMuted ? "Unmute" : "Mute"}>
                  {isMuted ? <SpeakerXMarkIcon className="h-5 w-5" /> : <SpeakerWaveIcon className="h-5 w-5" />}
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
                <button onClick={playPrevious} className="p-2 text-primary-400 hover:text-primary-300" aria-label="Previous track">
                  <BackwardIcon className="h-6 w-6" />
                </button>
                
                <button onClick={togglePlayPause} className="p-3 rounded-full bg-primary-600 hover:bg-primary-500" aria-label={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? <PauseIcon className="h-6 w-6 text-primary-50" /> : <PlayIcon className="h-6 w-6 text-primary-50" />}
                </button>
                
                <button onClick={playNext} className="p-2 text-primary-400 hover:text-primary-300" aria-label="Next track">
                  <ForwardIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {queue.length > 0 && (
          <div className="md:w-64 border-t md:border-t-0 md:border-l border-primary-700 pt-4 md:pt-0 md:pl-6">
            <h4 className="text-sm font-medium text-primary-400 mb-3">Next Up</h4>
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
              {queue.slice(0, 3).map((track) => (
                <div key={track.id} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-700 rounded flex items-center justify-center flex-shrink-0">
                    {track.cover_url ? (
                      <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover rounded" />
                    ) : (
                      <div className="text-lg text-primary-500">♪</div>
                    )}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-primary-200 truncate">
                      {track.title}
                    </p>
                    <p className="text-xs text-primary-400 truncate">
                      {track.artist || 'Unknown Artist'}
                    </p>
                  </div>
                </div>
              ))}
              
              {queue.length > 3 && (
                <p className="text-xs text-primary-400 text-center pt-2">
                  +{queue.length - 3} more tracks
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}