import React from 'react';
import ScrollableMusicLibrary from '../components/MusicLibrary/ScrollableMusicLibrary';

export default function MusicLibraryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary-50">Music Library</h1>
      </div>
      
      <ScrollableMusicLibrary />
    </div>
  );
}