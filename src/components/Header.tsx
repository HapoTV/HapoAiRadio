import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchInput from './Search/SearchInput';
import { useAuth } from '../contexts/AuthContext';
import UserAccountMenu from './UserAccountMenu';
import { motion } from 'framer-motion';
import { BellIcon } from '@heroicons/react/24/outline';

export default function Header() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    // Simulate fetching notifications
    const mockNotifications = [
      { id: 1, message: 'New playlist added to Store A', read: false, time: '10 min ago' },
      { id: 2, message: 'Track play count reached 1000', read: true, time: '2 hours ago' },
      { id: 3, message: 'Store B is now offline', read: false, time: '1 day ago' }
    ];
    
    setNotifications(mockNotifications);
    setHasUnread(mockNotifications.some(n => !n.read));
  }, []);

  const handleSearch = (query: string) => {
    console.log('Search:', query);
  };

  const handleResultSelect = (result: any) => {
    if (result.type === 'track') {
      navigate(`/music?track=${result.id}`);
    } else if (result.type === 'playlist') {
      navigate(`/music?playlist=${result.id}`);
    } else if (result.type === 'store') {
      navigate(`/stores?id=${result.id}`);
    }
  };

  return (
    <div className="bg-primary-900 border-b border-primary-800">
      <div className="flex items-center h-16 px-4 max-w-7xl mx-auto relative">
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mr-4 hidden md:block"
        >
          <h1 className="text-xl font-bold text-primary-50 tracking-tight font-serif">HAPO RADIO</h1>
        </motion.div>

        {/* Search centered absolutely */}
        <div className="absolute left-1/2 transform -translate-x-1/2 w-full max-w-2xl">
          <SearchInput
            onSearch={handleSearch}
            onResultSelect={handleResultSelect}
            placeholder="Search for songs, artists, or playlists"
            className="w-full"
          />
        </div>

        {/* Right icons */}
        <div className="ml-auto flex items-center space-x-4">
          <div className="relative">
            <button
              className="p-2 text-primary-400 hover:text-primary-300 relative"
              aria-label="Notifications"
            >
              <BellIcon className="h-5 w-5" />
              {hasUnread && (
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-status-error"></span>
              )}
            </button>
          </div>
          
          <button
            className="p-2 text-primary-400 hover:text-primary-300"
            onClick={() => document.dispatchEvent(new CustomEvent('toggle-queue'))}
            aria-label="Toggle queue"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <UserAccountMenu />
        </div>
      </div>
    </div>
  );
}