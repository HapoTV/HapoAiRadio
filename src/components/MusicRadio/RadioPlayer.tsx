import React from 'react';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
import type { RadioStation } from '../../types';

interface Props {
  station: RadioStation;
  isPlaying: boolean;
  onPlayPause: () => void;
}

export default function RadioPlayer({ station, isPlaying, onPlayPause }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-primary-800 border-t border-primary-700 z-50">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img
            src={station.logo}
            alt={station.name}
            className="w-12 h-12 rounded-lg object-cover bg-primary-700"
          />
          <div>
            <h3 className="text-primary-50 font-medium">{station.name}</h3>
            <p className="text-sm text-primary-400">Live Radio</p>
          </div>
        </div>
        <button
          onClick={onPlayPause}
          className="p-3 rounded-full bg-primary-700 hover:bg-primary-600 transition-colors"
        >
          {isPlaying ? (
            <PauseIcon className="w-6 h-6 text-primary-50" />
          ) : (
            <PlayIcon className="w-6 h-6 text-primary-50" />
          )}
        </button>
      </div>
    </div>
  );
}