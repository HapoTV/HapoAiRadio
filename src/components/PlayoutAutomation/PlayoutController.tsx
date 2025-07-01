import React from 'react';
import { useState, useEffect } from 'react';
import { useAudio } from '../../contexts/AudioContext';
import type { Track } from '../../types';
import { Queue } from '../../lib/queue';
import toast from 'react-hot-toast';

interface PlayoutState {
  isRunning: boolean;
  currentTrack: Track | null;
  nextTrack: Track | null;
  queueLength: number;
}

export default function PlayoutController() {
  const [state, setState] = useState<PlayoutState>({
    isRunning: false,
    currentTrack: null,
    nextTrack: null,
    queueLength: 0
  });

  const { setCurrentTrack } = useAudio();
  const [queue] = useState(() => new Queue<Track>({ name: 'playout' }));

  useEffect(() => {
    let stopConsumer: (() => void) | null = null;

    const startPlayout = async () => {
      if (!state.isRunning) return;

      stopConsumer = await queue.startConsumer(async (track) => {
        setState(prev => ({ ...prev, currentTrack: track }));
        setCurrentTrack(track);
        
        // Pre-fetch next track
        const nextTrack = await queue.peek();
        if (nextTrack) {
          setState(prev => ({ ...prev, nextTrack: nextTrack.message }));
        }
      }, {
        pollInterval: 1000
      });
    };

    startPlayout();

    return () => {
      if (stopConsumer) {
        stopConsumer();
      }
    };
  }, [state.isRunning, queue, setCurrentTrack]);

  const handleStart = async () => {
    try {
      setState(prev => ({ ...prev, isRunning: true }));
      toast.success('Playout started');
    } catch (error) {
      console.error('Failed to start playout:', error);
      toast.error('Failed to start playout');
    }
  };

  const handleStop = () => {
    setState(prev => ({ ...prev, isRunning: false }));
    toast.success('Playout stopped');
  };

  return (
    <div className="bg-primary-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-primary-50">Playout Control</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={state.isRunning ? handleStop : handleStart}
            className={`px-4 py-2 rounded-lg font-medium ${
              state.isRunning
                ? 'bg-status-errorBg text-status-error hover:bg-status-error/20'
                : 'bg-primary-600 text-primary-50 hover:bg-primary-500'
            }`}
          >
            {state.isRunning ? 'Stop' : 'Start'} Playout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-primary-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-primary-400 mb-2">Now Playing</h3>
          {state.currentTrack ? (
            <div>
              <p className="text-primary-50 font-medium">{state.currentTrack.title}</p>
              <p className="text-sm text-primary-400">{state.currentTrack.artist}</p>
            </div>
          ) : (
            <p className="text-primary-400">No track playing</p>
          )}
        </div>

        <div className="bg-primary-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-primary-400 mb-2">Up Next</h3>
          {state.nextTrack ? (
            <div>
              <p className="text-primary-50 font-medium">{state.nextTrack.title}</p>
              <p className="text-sm text-primary-400">{state.nextTrack.artist}</p>
            </div>
          ) : (
            <p className="text-primary-400">No track queued</p>
          )}
        </div>
      </div>
    </div>
  );
}