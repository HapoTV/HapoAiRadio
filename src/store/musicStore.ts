import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track } from '../types';

interface MusicState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  playbackHistory: Track[];
  
  // Actions
  setCurrentTrack: (track: Track) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlayPause: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (oldIndex: number, newIndex: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  addToHistory: (track: Track) => void;
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      queue: [],
      isPlaying: false,
      playbackHistory: [],
      
      setCurrentTrack: (track) => {
        const { currentTrack, addToHistory } = get();
        
        // Add current track to history before changing
        if (currentTrack) {
          addToHistory(currentTrack);
        }
        
        set({ currentTrack: track, isPlaying: true });
      },
      
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      
      togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
      
      addToQueue: (track) => set((state) => ({ 
        queue: [...state.queue, track] 
      })),
      
      removeFromQueue: (index) => set((state) => ({
        queue: state.queue.filter((_, i) => i !== index)
      })),
      
      clearQueue: () => set({ queue: [] }),
      
      reorderQueue: (oldIndex, newIndex) => set((state) => {
        const newQueue = [...state.queue];
        const [movedItem] = newQueue.splice(oldIndex, 1);
        newQueue.splice(newIndex, 0, movedItem);
        return { queue: newQueue };
      }),
      
      playNext: () => {
        const { queue, currentTrack, setCurrentTrack } = get();
        
        if (queue.length === 0) return;
        
        // Play the first track in the queue
        const nextTrack = queue[0];
        setCurrentTrack(nextTrack);
        
        // Remove the track from the queue
        set((state) => ({
          queue: state.queue.slice(1)
        }));
      },
      
      playPrevious: () => {
        const { playbackHistory, setCurrentTrack } = get();
        
        if (playbackHistory.length === 0) return;
        
        // Get the most recent track from history
        const previousTrack = playbackHistory[playbackHistory.length - 1];
        
        // Remove it from history and set as current
        set((state) => ({
          playbackHistory: state.playbackHistory.slice(0, -1),
          currentTrack: previousTrack,
          isPlaying: true
        }));
      },
      
      addToHistory: (track) => set((state) => {
        // Keep only the last 50 tracks in history
        const newHistory = [...state.playbackHistory, track].slice(-50);
        return { playbackHistory: newHistory };
      })
    }),
    {
      name: 'music-store',
      partialize: (state) => ({
        currentTrack: state.currentTrack,
        queue: state.queue,
        playbackHistory: state.playbackHistory.slice(-10), // Only store last 10 for persistence
      }),
    }
  )
);
