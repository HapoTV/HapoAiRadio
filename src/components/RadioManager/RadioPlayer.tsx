import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { getStoreRadioQueue, sendPlayerHeartbeat, checkEmergencyBroadcasts, cacheTracksLocally, getCachedTracks } from '../../lib/playerSync';
import type { Track } from '../../types';
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Props {
  storeId: string;
  autoConnect?: boolean;
}

export default function RadioPlayer({ storeId, autoConnect = false }: Props) {
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [hasEmergency, setHasEmergency] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [emergencyAudio, setEmergencyAudio] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const emergencyAudioRef = useRef<HTMLAudioElement | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const queuePollingIntervalRef = useRef<number | null>(null);
  
  // Initialize connection
  useEffect(() => {
    if (autoConnect) {
      handleConnect();
    }
    
    return () => {
      handleDisconnect();
    };
  }, [autoConnect, storeId]);
  
  // Handle audio element creation and cleanup
  useEffect(() => {
    audioRef.current = new Audio();
    emergencyAudioRef.current = new Audio();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      if (emergencyAudioRef.current) {
        emergencyAudioRef.current.pause();
        emergencyAudioRef.current.src = '';
      }
    };
  }, []);
  
  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
    
    if (emergencyAudioRef.current) {
      emergencyAudioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);
  
  const handleConnect = async () => {
    try {
      setIsConnected(true);
      
      // Start heartbeat
      if (heartbeatIntervalRef.current) {
        window.clearInterval(heartbeatIntervalRef.current);
      }
      
      heartbeatIntervalRef.current = window.setInterval(() => {
        sendHeartbeat();
      }, 30000); // Every 30 seconds
      
      // Start queue polling
      if (queuePollingIntervalRef.current) {
        window.clearInterval(queuePollingIntervalRef.current);
      }
      
      queuePollingIntervalRef.current = window.setInterval(() => {
        fetchQueue();
        checkEmergency();
      }, 10000); // Every 10 seconds
      
      // Initial fetch
      await sendHeartbeat();
      await fetchQueue();
      await checkEmergency();
      
      toast.success('Connected to store radio');
    } catch (error) {
      console.error('Error connecting to store radio:', error);
      setIsConnected(false);
      toast.error('Failed to connect to store radio');
    }
  };
  
  const handleDisconnect = () => {
    setIsConnected(false);
    setIsPlaying(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    if (emergencyAudioRef.current) {
      emergencyAudioRef.current.pause();
    }
    
    if (heartbeatIntervalRef.current) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (queuePollingIntervalRef.current) {
      window.clearInterval(queuePollingIntervalRef.current);
      queuePollingIntervalRef.current = null;
    }
    
    // Send offline status
    sendPlayerHeartbeat(storeId, 'offline')
      .catch(error => console.error('Error sending offline status:', error));
    
    toast.success('Disconnected from store radio');
  };
  
  const sendHeartbeat = async () => {
    try {
      await sendPlayerHeartbeat(
        storeId, 
        isConnected ? 'online' : 'offline',
        currentTrack?.id
      );
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  };
  
  const fetchQueue = async () => {
    try {
      const tracks = await getStoreRadioQueue(storeId);
      
      if (tracks.length > 0) {
        setQueue(tracks);
        
        // Cache tracks locally for offline failover
        cacheTracksLocally(tracks);
        
        // If not currently playing, start with the first track
        if (!isPlaying && !currentTrack && !hasEmergency) {
          setCurrentTrack(tracks[0]);
          playTrack(tracks[0]);
        }
      } else {
        // If no tracks in queue, try to use cached tracks
        const cachedTracks = getCachedTracks();
        if (cachedTracks.length > 0) {
          setQueue(cachedTracks);
        }
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
      
      // Try to use cached tracks on error
      const cachedTracks = getCachedTracks();
      if (cachedTracks.length > 0) {
        setQueue(cachedTracks);
      }
    }
  };
  
  const checkEmergency = async () => {
    try {
      const emergency = await checkEmergencyBroadcasts(storeId);
      
      if (emergency.hasEmergency) {
        setHasEmergency(true);
        setEmergencyMessage(emergency.message || '');
        setEmergencyAudio(emergency.audioUrl || null);
        
        // Pause regular playback
        if (audioRef.current && isPlaying) {
          audioRef.current.pause();
        }
        
        // Play emergency audio if available
        if (emergency.audioUrl && emergencyAudioRef.current) {
          emergencyAudioRef.current.src = emergency.audioUrl;
          emergencyAudioRef.current.loop = true;
          emergencyAudioRef.current.play().catch(error => {
            console.error('Error playing emergency audio:', error);
          });
        }
      } else if (hasEmergency) {
        // Emergency is over
        setHasEmergency(false);
        setEmergencyMessage('');
        setEmergencyAudio(null);
        
        if (emergencyAudioRef.current) {
          emergencyAudioRef.current.pause();
          emergencyAudioRef.current.src = '';
        }
        
        // Resume regular playback
        if (currentTrack && isPlaying) {
          playTrack(currentTrack);
        }
      }
    } catch (error) {
      console.error('Error checking emergency broadcasts:', error);
    }
  };
  
  const playTrack = (track: Track) => {
    if (!audioRef.current) return;
    
    audioRef.current.src = track.file_url;
    audioRef.current.volume = isMuted ? 0 : volume / 100;
    
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('Error playing track:', error);
        toast.error('Failed to play track');
        setIsPlaying(false);
      });
    }
    
    setIsPlaying(true);
    setCurrentTrack(track);
    
    // Send heartbeat with current track
    sendHeartbeat();
  };
  
  const handlePlayPause = () => {
    if (hasEmergency) return; // Don't allow play/pause during emergency
    
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (currentTrack) {
        playTrack(currentTrack);
      } else if (queue.length > 0) {
        setCurrentTrack(queue[0]);
        playTrack(queue[0]);
      }
    }
    
    // Send heartbeat with updated status
    sendHeartbeat();
  };
  
  const handleTrackEnd = () => {
    // Move to the next track in queue
    const currentIndex = queue.findIndex(track => track.id === currentTrack?.id);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < queue.length) {
      setCurrentTrack(queue[nextIndex]);
      playTrack(queue[nextIndex]);
    } else if (queue.length > 0) {
      // Loop back to the beginning
      setCurrentTrack(queue[0]);
      playTrack(queue[0]);
    } else {
      setIsPlaying(false);
      setCurrentTrack(null);
    }
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  return (
    <div className="bg-primary-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-primary-50">Store Radio Player</h2>
        
        <div>
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-status-errorBg text-status-error rounded-lg hover:bg-status-error/20"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500"
            >
              Connect
            </button>
          )}
        </div>
      </div>
      
      {hasEmergency && (
        <div className="mb-6 bg-status-errorBg p-4 rounded-lg border border-status-error">
          <div className="flex items-center space-x-2 mb-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-status-error" />
            <h3 className="text-status-error font-medium">Emergency Broadcast</h3>
          </div>
          <p className="text-primary-50">{emergencyMessage}</p>
          {emergencyAudio && (
            <div className="mt-2">
              <p className="text-sm text-primary-400">Emergency audio is playing</p>
            </div>
          )}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="bg-primary-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-status-success' : 'bg-status-error'}`}></div>
                  <p className="text-sm text-primary-400">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
                
                {currentTrack ? (
                  <div className="mt-2">
                    <p className="text-primary-50 font-medium">{currentTrack.title}</p>
                    <p className="text-sm text-primary-400">{currentTrack.artist || 'Unknown Artist'}</p>
                  </div>
                ) : (
                  <p className="text-sm text-primary-400 mt-2">No track playing</p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePlayPause}
                  disabled={!isConnected || hasEmergency || queue.length === 0}
                  className="p-3 rounded-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50"
                >
                  {isPlaying ? (
                    <PauseIcon className="h-6 w-6 text-primary-50" />
                  ) : (
                    <PlayIcon className="h-6 w-6 text-primary-50" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMute}
                  className="p-2 text-primary-400 hover:text-primary-300"
                >
                  {isMuted ? (
                    <SpeakerXMarkIcon className="h-5 w-5" />
                  ) : (
                    <SpeakerWaveIcon className="h-5 w-5" />
                  )}
                </button>
                
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="flex-1"
                />
                
                <span className="text-sm text-primary-400">{volume}%</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-primary-400 mb-2">Queue ({queue.length} tracks)</h3>
            <div className="bg-primary-700 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              {queue.length > 0 ? (
                <div className="divide-y divide-primary-600">
                  {queue.map((track, index) => (
                    <div 
                      key={`${track.id}-${index}`}
                      className={`p-3 ${currentTrack?.id === track.id ? 'bg-primary-600' : ''}`}
                    >
                      <p className="text-sm text-primary-50">{track.title}</p>
                      <p className="text-xs text-primary-400">{track.artist || 'Unknown Artist'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-4 text-center text-primary-400">Queue is empty</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Hidden audio elements */}
      <audio 
        ref={audioRef}
        onEnded={handleTrackEnd}
        onError={() => {
          console.error('Audio playback error');
          setIsPlaying(false);
          toast.error('Error playing track');
        }}
      />
      
      <audio 
        ref={emergencyAudioRef}
        loop={true}
        onError={() => {
          console.error('Emergency audio playback error');
          toast.error('Error playing emergency audio');
        }}
      />
    </div>
  );
}