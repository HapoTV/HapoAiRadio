import React from 'react';
import { useNavigate } from 'react-router-dom';
import SearchInput from './Search/SearchInput';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSearch = (query) => {
    console.log('Search:', query);
  };

  const handleResultSelect = (result) => {
    if (result.type === 'track') {
      navigate(`/music?track=${result.id}`);
    } else if (result.type === 'playlist') {
      navigate(`/music?playlist=${result.id}`);
    } else if (result.type === 'store') {
      navigate(`/stores?id=${result.id}`);
    }
  };

  return (
    <div className="bg-black border-b border-gray-800">
      <div className="flex items-center justify-center h-16 px-4">
        <div className="max-w-2xl w-full">
          <SearchInput
            onSearch={handleSearch}
            onResultSelect={handleResultSelect}
            placeholder="Search for songs, artists, or playlists"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}