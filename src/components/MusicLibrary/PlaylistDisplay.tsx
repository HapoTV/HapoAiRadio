import React from 'react';
import { useState, useEffect } from 'react';
import { format, addSeconds } from 'date-fns';
import { MusicalNoteIcon, SpeakerWaveIcon, MegaphoneIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import type { Track } from '../../types';

interface QueueItem {
  id: string;
  title: string;
  duration: number;
  scheduledTime: Date;
  type: 'song' | 'commercial';
  isPlaying?: boolean;
}

interface Props {
  currentTrack: Track | null;
  queue: QueueItem[];
  onQueueUpdate?: (queue: QueueItem[]) => void;
}

export default function PlaylistDisplay({ currentTrack, queue, onQueueUpdate }: Props) {
  const [displayQueue, setDisplayQueue] = useState<QueueItem[]>([]);
  const [startTime, setStartTime] = useState<Date>(new Date());

  useEffect(() => {
    if (currentTrack) {
      const now = new Date();
      setStartTime(now);
      
      // Calculate scheduled times for queue items
      let currentTime = now;
      const updatedQueue = queue.map((item, index) => {
        const scheduledTime = addSeconds(currentTime, index === 0 ? 0 : queue[index - 1].duration);
        currentTime = scheduledTime;
        return { ...item, scheduledTime };
      });

      setDisplayQueue(updatedQueue);
      if (onQueueUpdate) {
        onQueueUpdate(updatedQueue);
      }
    }
  }, [currentTrack, queue, onQueueUpdate]);

  const getItemIcon = (type: string, isPlaying?: boolean) => {
    if (isPlaying) {
      return <SpeakerWaveIcon className="h-5 w-5 text-primary-50 animate-pulse" />;
    }
    return type === 'commercial' ? 
      <MegaphoneIcon className="h-5 w-5 text-status-warning" /> :
      <MusicalNoteIcon className="h-5 w-5 text-primary-400" />;
  };

  const getItemStyles = (type: string, isPlaying?: boolean) => {
    let baseStyles = "flex items-center justify-between p-4 rounded-lg transition-colors";
    
    if (isPlaying) {
      return `${baseStyles} bg-primary-600 shadow-lg`;
    }
    
    if (type === 'commercial') {
      return `${baseStyles} bg-primary-700/50 border border-status-warning/30`;
    }
    
    return `${baseStyles} bg-primary-700 hover:bg-primary-600/50`;
  };

  return (
    <div className="bg-primary-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-primary-50">Now Playing</h2>
        <div className="text-sm text-primary-400">
          {format(startTime, 'h:mm a')}
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {displayQueue.slice(0, 10).map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className={getItemStyles(item.type, index === 0)}
          >
            <div className="flex items-center space-x-4">
              {getItemIcon(item.type, index === 0)}
              <div>
                <p className="text-primary-50 font-medium">{item.title}</p>
                <p className="text-sm text-primary-400">
                  {format(item.scheduledTime, 'h:mm:ss a')} • {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
                </p>
              </div>
            </div>
            {index === 0 && (
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-status-success animate-ping" />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {displayQueue.length === 0 && (
        <div className="text-center py-8 text-primary-400">
          No items in queue
        </div>
      )}
    </div>
  );
}