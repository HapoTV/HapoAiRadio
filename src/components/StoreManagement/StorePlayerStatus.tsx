import React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getPlayerState, sendPlayerCommand } from '../../lib/playerSync';
import type { Store } from '../../types';
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Props {
  store: Store;
}

export default function StorePlayerStatus({ store }: Props) {
  const [playerState, setPlayerState] = useState<{
    currentTrackId: string | null;
    status: string;
    volume: number;
    isMuted: boolean;
    lastUpdated: string | null;
    currentTrackTitle?: string;
    currentTrackArtist?: string;
  }>({
    currentTrackId: null,
    status: 'stopped',
    volume: 100,
    isMuted: false,
    lastUpdated: null
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayerState();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`store_player_${store.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_sessions',
        filter: `store_id=eq.${store.id}`
      }, () => {
        fetchPlayerState();
      })
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, [store.id]);

  const fetchPlayerState = async () => {
    try {
      setLoading(true);
      setError(null);
      const state = await getPlayerState(store.id);
      
      // If no state exists, keep the default values
      if (!state) {
        setPlayerState({
          currentTrackId: null,
          status: 'stopped',
          volume: 100,
          isMuted: false,
          lastUpdated: null
        });
        return;
      }
      
      // If we have a current track ID, fetch its details
      if (state.currentTrackId) {
        const { data: trackData, error: trackError } = await supabase
          .from('tracks')
          .select('title, artist')
          .eq('id', state.currentTrackId)
          .maybeSingle();
        
        if (trackError) {
          console.error('Error fetching track details:', trackError);
          // Continue with the state update but without track details
          setPlayerState({
            currentTrackId: state.currentTrackId,
            status: state.status,
            volume: state.volume,
            isMuted: state.isMuted,
            lastUpdated: state.timestamp
          });
          return;
        }
        
        setPlayerState({
          currentTrackId: state.currentTrackId,
          status: state.status,
          volume: state.volume,
          isMuted: state.isMuted,
          lastUpdated: state.timestamp,
          currentTrackTitle: trackData?.title,
          currentTrackArtist: trackData?.artist
        });
      } else {
        setPlayerState({
          currentTrackId: state.currentTrackId,
          status: state.status,
          volume: state.volume,
          isMuted: state.isMuted,
          lastUpdated: state.timestamp
        });
      }
    } catch (error) {
      console.error('Error fetching player state:', error);
      setError('Failed to fetch player status');
      toast.error('Failed to fetch player status');
      
      // Set default state on error
      setPlayerState({
        currentTrackId: null,
        status: 'stopped',
        volume: 100,
        isMuted: false,
        lastUpdated: null
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = async () => {
    try {
      const command = playerState.status === 'playing' ? 'pause' : 'play';
      await sendPlayerCommand(store.id, command);
      toast.success(`${command === 'play' ? 'Playing' : 'Paused'} music at ${store.name}`);
    } catch (error) {
      console.error('Error sending play/pause command:', error);
      toast.error('Failed to control playback');
    }
  };

  const handleMute = async () => {
    try {
      await sendPlayerCommand(store.id, 'mute', { mute: !playerState.isMuted });
      toast.success(`${playerState.isMuted ? 'Unmuted' : 'Muted'} audio at ${store.name}`);
    } catch (error) {
      console.error('Error sending mute command:', error);
      toast.error('Failed to control audio');
    }
  };

  const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const volume = parseInt(e.target.value);
      await sendPlayerCommand(store.id, 'volume', { volume });
    } catch (error) {
      console.error('Error sending volume command:', error);
      toast.error('Failed to adjust volume');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-primary-700 rounded-lg p-4">
        <div className="h-4 bg-primary-600 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-primary-600 rounded w-1/4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-primary-700 rounded-lg p-4">
        <div className="text-primary-50">
          <h3 className="font-medium">Player Status</h3>
          <p className="text-sm text-primary-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-primary-50 font-medium">Player Status</h3>
          <p className="text-sm text-primary-400">
            {playerState.status === 'playing' ? 'Playing' : 
             playerState.status === 'paused' ? 'Paused' : 
             playerState.status === 'loading' ? 'Loading' : 'Stopped'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePlayPause}
            className="p-2 rounded-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={store.status !== 'online'}
          >
            {playerState.status === 'playing' ? (
              <PauseIcon className="h-5 w-5 text-primary-50" />
            ) : (
              <PlayIcon className="h-5 w-5 text-primary-50" />
            )}
          </button>
          
          <button
            onClick={handleMute}
            className="p-2 rounded-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={store.status !== 'online'}
          >
            {playerState.isMuted ? (
              <SpeakerXMarkIcon className="h-5 w-5 text-primary-50" />
            ) : (
              <SpeakerWaveIcon className="h-5 w-5 text-primary-50" />
            )}
          </button>
        </div>
      </div>
      
      {playerState.currentTrackId && (
        <div className="mt-4">
          <p className="text-sm text-primary-50">
            {playerState.currentTrackTitle || 'Unknown Track'}
          </p>
          <p className="text-xs text-primary-400">
            {playerState.currentTrackArtist || 'Unknown Artist'}
          </p>
        </div>
      )}
      
      <div className="mt-4">
        <label htmlFor={`volume-${store.id}`} className="block text-xs text-primary-400 mb-1">
          Volume: {playerState.volume}%
        </label>
        <input
          id={`volume-${store.id}`}
          type="range"
          min="0"
          max="100"
          value={playerState.volume}
          onChange={handleVolumeChange}
          className="w-full disabled:opacity-50"
          disabled={store.status !== 'online'}
        />
      </div>
      
      {playerState.lastUpdated && (
        <p className="text-xs text-primary-400 mt-2">
          Last updated: {new Date(playerState.lastUpdated).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}