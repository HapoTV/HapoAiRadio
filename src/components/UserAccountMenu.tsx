import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserIcon,
  Cog6ToothIcon,
  BellIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function UserAccountMenu() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    // Close dropdown when pressing escape key
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
      toast.success('Successfully signed out');
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  if (!user) return null;

  // Extract user information
  const userEmail = user.email || '';
  const userName = user.user_metadata?.full_name || userEmail.split('@')[0];
  const avatarUrl = user.user_metadata?.avatar_url;

  const menuItems = [
    {
      id: 'profile',
      label: 'Profile Settings',
      icon: UserIcon,
      onClick: () => toast.success('Profile settings coming soon')
    },
    {
      id: 'preferences',
      label: 'Account Preferences',
      icon: Cog6ToothIcon,
      onClick: () => toast.success('Account preferences coming soon')
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: BellIcon,
      onClick: () => toast.success('Notifications coming soon')
    },
    {
      id: 'help',
      label: 'Help Center',
      icon: QuestionMarkCircleIcon,
      onClick: () => toast.success('Help center coming soon')
    }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-full hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-primary-900"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${userName}'s profile`}
              className="h-8 w-8 rounded-full object-cover border border-primary-600"
            />
          ) : (
            <UserCircleIcon className="h-8 w-8 text-primary-400" />
          )}
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-64 bg-primary-800 rounded-lg shadow-lg py-2 z-50 border border-primary-700 overflow-hidden"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu-button"
          >
            <div className="px-4 py-3 border-b border-primary-700">
              <div className="flex items-center space-x-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${userName}'s profile`}
                    className="h-10 w-10 rounded-full object-cover border border-primary-600"
                  />
                ) : (
                  <UserCircleIcon className="h-10 w-10 text-primary-400" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary-50 truncate">{userName}</p>
                  <p className="text-xs text-primary-400 truncate">{userEmail}</p>
                </div>
              </div>
            </div>

            <div className="py-1">
              {menuItems.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ backgroundColor: 'rgba(55, 65, 81, 1)', x: 2 }}
                  onClick={() => {
                    setIsOpen(false);
                    item.onClick();
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-primary-200 hover:text-primary-50 transition-colors"
                  role="menuitem"
                >
                  <item.icon className="mr-3 h-5 w-5 text-primary-400" />
                  {item.label}
                </motion.button>
              ))}
            </div>

            <div className="py-1 border-t border-primary-700">
              <motion.button
                whileHover={{ backgroundColor: 'rgba(55, 65, 81, 1)', x: 2 }}
                onClick={() => {
                  setIsOpen(false);
                  handleSignOut();
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-status-error hover:bg-primary-700 transition-colors"
                role="menuitem"
              >
                <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
                Sign Out
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}