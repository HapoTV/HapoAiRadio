import React from 'react';
import { useState, useCallback } from 'react';
import { TrashIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
import type { Advertisement } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAudio } from '../../contexts/AudioContext';
import { CommercialLibrary } from '../components/CommercialLibrary';
// Ensure path reflects the correct directory structure
import toast from 'react-hot-toast';

interface Props {
  commercials: Advertisement[];
  onPlay: (commercial: Advertisement) => void;
  onDelete: () => void;
  currentCommercial?: any;
  isPlaying?: boolean;
}

export default function CommercialList({ commercials, onPlay, onDelete, currentCommercial, isPlaying }: Props) {
  const [deletingCommercialId, setDeletingCommercialId] = useState<string | null>(null);
  
  const handleDelete = useCallback(async (commercialId: string, fileUrl: string) => {
    try {
      setDeletingCommercialId(commercialId);
      
      const { data: adSlots, error: checkError } = await supabase
        .from('ad_slots')
        .select('ad_schedule_id')
        .eq('advertisement_id', commercialId);

      if (checkError) throw checkError;

      if (adSlots && adSlots.length > 0) {
        toast.error('Cannot delete commercial as it is used in one or more ad schedules');
        return;
      }

      const filePath = fileUrl.split('/tracks/')[1];
      if (!filePath) throw new Error('Invalid file URL');

      const { error: storageError } = await supabase.storage
        .from('tracks')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', commercialId);

      if (dbError) throw dbError;

      toast.success('Commercial deleted successfully');
      onDelete();
    } catch (error: any) {
      console.error('Error deleting commercial:', error);
      toast.error(error.message || 'Failed to delete commercial');
    } finally {
      setDeletingCommercialId(null);
    }
  }, [onDelete]);

  return (
    <div>
      <h2 className="text-lg font-medium text-primary-50 mb-4">Commercial Library</h2>
      <div className="bg-primary-800 shadow-sm ring-1 ring-primary-700 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-primary-700">
          <thead>
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-primary-50 sm:pl-6">Title</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-primary-50">Duration</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-primary-50">Status</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-primary-50">Date Range</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-700">
            {commercials.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-primary-400">
                  No commercials available. Upload some commercials to get started.
                </td>
              </tr>
            ) : (
              commercials.map((commercial) => (
                <tr key={commercial.id} className="hover:bg-primary-700/50">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-primary-50 sm:pl-6">
                    {commercial.title}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-primary-400">
                    {Math.floor(commercial.duration / 60)}:{String(commercial.duration % 60).padStart(2, '0')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      commercial.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {commercial.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-primary-400">
                    {new Date(commercial.start_date).toLocaleDateString()} - {new Date(commercial.end_date).toLocaleDateString()}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => onPlay(commercial)}
                        className="text-primary-400 hover:text-primary-300"
                        aria-label={currentCommercial?.id === commercial.id && isPlaying ? "Pause" : "Play"}
                      >
                        {currentCommercial?.id === commercial.id && isPlaying ? (
                          <span className="flex items-center">
                            <PauseIcon className="h-5 w-5 inline mr-1 text-primary-500" />
                            Pause
                          </span>
                        ) : (
                          <>
                            <PlayIcon className="h-5 w-5 inline mr-1" />
                            Play
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this commercial?')) {
                            handleDelete(commercial.id, commercial.file_url);
                          }
                        }}
                        disabled={deletingCommercialId === commercial.id}
                        className={`text-status-error hover:text-status-errorHover ${deletingCommercialId === commercial.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                        <span className="sr-only">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}