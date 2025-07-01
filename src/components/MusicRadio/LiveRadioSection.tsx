import React from 'react';
import { useState } from 'react';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
import GlassmorphicCard from '../GlassmorphicCard';
import type { RadioStation } from '../../types';

interface Props {
  stations: RadioStation[];
  currentStation: RadioStation | null;
  isPlaying: boolean;
  onStationSelect: (station: RadioStation) => void;
  onPlayPause: (station: RadioStation) => void;
}

export default function LiveRadioSection({
  stations,
  currentStation,
  isPlaying,
  onStationSelect,
  onPlayPause,
}: Props) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-primary-50 mb-6">Live Radio</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stations.map((station) => (
          <GlassmorphicCard
            key={station.id}
            onClick={() => onStationSelect(station)}
            className="p-4 cursor-pointer"
          >
            <div className="flex items-center space-x-4">
              <img
                src={station.logo}
                alt={station.name}
                className="w-16 h-16 rounded-lg object-cover bg-primary-800"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-primary-50 truncate">
                  {station.name}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="flex-shrink-0 h-2 w-2 rounded-full bg-status-success"></span>
                  <p className="text-sm text-primary-300">Live Now</p>
                </div>
                {station.currentTrack && (
                  <p className="text-sm text-primary-400 truncate mt-1">
                    {station.currentTrack.title} - {station.currentTrack.artist}
                  </p>
                )}
              </div>
              <button 
                className="flex-shrink-0 p-2 rounded-full bg-primary-700 hover:bg-primary-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayPause(station);
                }}
              >
                {isPlaying && currentStation?.id === station.id ? (
                  <PauseIcon className="w-6 h-6 text-primary-50" />
                ) : (
                  <PlayIcon className="w-6 h-6 text-primary-50" />
                )}
              </button>
            </div>
          </GlassmorphicCard>
        ))}
      </div>
    </section>
  );
}