import React from 'react';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { RadioStation, Interview } from '../types';
import { LiveRadioSection, InterviewsSection, RadioPlayer } from '../components/MusicRadio';
import toast from 'react-hot-toast';

// Sample radio station data
const DUMMY_STATIONS: RadioStation[] = [
  {
    id: '1',
    name: 'Jazz Vibes FM',
    logo: 'https://picsum.photos/seed/jazz/200/200',
    status: 'online',
    currentTrack: {
      title: 'Take Five',
      artist: 'Dave Brubeck',
    },
  },
  {
    id: '2',
    name: 'Classical Symphony',
    logo: 'https://picsum.photos/seed/classical/200/200',
    status: 'online',
    currentTrack: {
      title: 'Symphony No. 5',
      artist: 'Ludwig van Beethoven',
    },
  },
  {
    id: '3',
    name: 'Rock Revolution',
    logo: 'https://picsum.photos/seed/rock/200/200',
    status: 'online',
    currentTrack: {
      title: 'Stairway to Heaven',
      artist: 'Led Zeppelin',
    },
  },
];

// Sample interview data
const DUMMY_INTERVIEWS: Interview[] = [
  {
    id: '1',
    title: 'Behind the Music: Studio Sessions',
    duration: '45:30',
    image: 'https://picsum.photos/seed/interview1/400/225',
    description: 'Exclusive behind-the-scenes look at the making of the latest hits.',
  },
  {
    id: '2',
    title: 'Artist Spotlight: The Creators',
    duration: '32:15',
    image: 'https://picsum.photos/seed/interview2/400/225',
    description: 'In-depth conversations with today\'s leading musicians.',
  },
];

export default function MusicRadio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading delay for stations
    setTimeout(() => {
      setStations(DUMMY_STATIONS);
      setLoading(false);
    }, 1000);
  }, []);

  const handlePlayPause = (station: RadioStation) => {
    if (currentStation?.id === station.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentStation(station);
      setIsPlaying(true);
    }
  };

  const handleInterviewSelect = (interview: Interview) => {
    // Handle interview selection
    console.log('Selected interview:', interview);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-8 bg-primary-800 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((_, i) => (
            <div key={i} className="h-32 bg-primary-800 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary-50">Music Radio</h1>
      </div>

      <LiveRadioSection
        stations={stations}
        currentStation={currentStation}
        isPlaying={isPlaying}
        onStationSelect={setCurrentStation}
        onPlayPause={handlePlayPause}
      />

      <InterviewsSection
        interviews={DUMMY_INTERVIEWS}
        onInterviewSelect={handleInterviewSelect}
      />

      {currentStation && (
        <RadioPlayer
          station={currentStation}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
        />
      )}
    </div>
  );
}