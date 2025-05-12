import React from 'react';
import { useAudio } from '../../contexts/AudioContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export interface RemoteStatus {
  isConnected: boolean;
  lastPing: Date | null;
}

interface RemoteControlPanelProps {
  storeId: string;
  status: RemoteStatus | undefined;  // Allow status to be undefined
}

export default function RemoteControlPanel({ storeId, status }: RemoteControlPanelProps) {
  const { currentTrack, isPlaying, togglePlayPause } = useAudio();

  // Default value for status if it is undefined
  const safeStatus = status || { isConnected: false, lastPing: null };

  const handleEmergencyStop = async () => {
    try {
      // First update the store status
      const { error: storeError } = await supabase
        .from('stores')
        .update({ status: 'offline' })
        .eq('id', storeId);

      if (storeError) throw storeError;

      // Then update or create the player session
      const { error: sessionError } = await supabase
        .from('player_sessions')
        .upsert(
          {
            store_id: storeId,
            status: 'stopped',
            current_track_id: null,
          },
          {
            onConflict: 'store_id',
          }
        );

      if (sessionError) throw sessionError;
      
      toast.success('Emergency stop triggered');
    } catch (error) {
      console.error('Failed to trigger emergency stop:', error);
      toast.error('Failed to trigger emergency stop');
    }
  };

  const formatLastPing = (lastPing: Date | null) => {
    if (!lastPing) return 'Never';
    const secondsAgo = Math.floor((Date.now() - lastPing.getTime()) / 1000);
    return `${secondsAgo}s ago`;
  };

  return (
    <div className="bg-primary-800 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-primary-50">Remote Control</h2>
        <div className="flex items-center space-x-2">
          <span
            className={`h-2 w-2 rounded-full ${
              safeStatus.isConnected ? 'bg-status-success' : 'bg-status-error'
            }`}
          />
          <span className="text-sm text-primary-400">
            {safeStatus.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-6">
        {/* Playback Control */}
        <div className="bg-primary-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-primary-400 mb-2">Playback Control</h3>
          <div className="space-y-4">
            <button
              onClick={togglePlayPause}
              disabled={!safeStatus.isConnected || !currentTrack}
              className="w-full px-4 py-2 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500 disabled:opacity-50"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={handleEmergencyStop}
              className="w-full px-4 py-2 bg-status-errorBg text-status-error rounded-lg hover:bg-status-error/20"
            >
              Emergency Stop
            </button>
          </div>
        </div>

        {/* Now Playing */}
        <div className="bg-primary-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-primary-400 mb-2">Now Playing</h3>
          {currentTrack ? (
            <div>
              <p className="text-primary-50 font-medium">{currentTrack.title}</p>
              <p className="text-sm text-primary-400">{currentTrack.artist}</p>
            </div>
          ) : (
            <p className="text-primary-400">No track playing</p>
          )}
        </div>
      </div>

      {/* Ping Info */}
      <p className="text-sm text-primary-400">
        Last ping: {formatLastPing(safeStatus.lastPing)}
      </p>
    </div>
  );
}