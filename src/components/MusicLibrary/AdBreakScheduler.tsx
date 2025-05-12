import React from 'react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { AdBreak } from '../../types';
import { ClockIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Props {
  segmentId: string;
  onUpdate: () => void;
}

export default function AdBreakScheduler({ segmentId, onUpdate }: Props) {
  const [showAddBreak, setShowAddBreak] = useState(false);
  const [newBreak, setNewBreak] = useState<Partial<AdBreak>>({
    start_time: '',
    end_time: '',
    max_duration: 30,
    buffer_time: 3,
    priority: 1
  });

  const handleAddBreak = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('ad_breaks')
        .insert([
          {
            segment_id: segmentId,
            ...newBreak
          }
        ]);

      if (error) throw error;

      setShowAddBreak(false);
      setNewBreak({
        start_time: '',
        end_time: '',
        max_duration: 30,
        buffer_time: 3,
        priority: 1
      });
      toast.success('Ad break added successfully');
      onUpdate();
    } catch (error) {
      console.error('Error adding ad break:', error);
      toast.error('Failed to add ad break');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-primary-50">Ad Breaks</h3>
        <button
          type="button"
          onClick={() => setShowAddBreak(true)}
          className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
        >
          <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
          Add Break
        </button>
      </div>

      {showAddBreak && (
        <form onSubmit={handleAddBreak} className="bg-primary-700 p-6 rounded-lg">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-primary-200">
                Start Time
              </label>
              <div className="mt-1">
                <input
                  type="time"
                  name="start_time"
                  id="start_time"
                  value={newBreak.start_time}
                  onChange={(e) => setNewBreak({ ...newBreak, start_time: e.target.value })}
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="end_time" className="block text-sm font-medium text-primary-200">
                End Time
              </label>
              <div className="mt-1">
                <input
                  type="time"
                  name="end_time"
                  id="end_time"
                  value={newBreak.end_time}
                  onChange={(e) => setNewBreak({ ...newBreak, end_time: e.target.value })}
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="max_duration" className="block text-sm font-medium text-primary-200">
                Maximum Duration (seconds)
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="max_duration"
                  id="max_duration"
                  min="1"
                  value={newBreak.max_duration}
                  onChange={(e) => setNewBreak({ ...newBreak, max_duration: parseInt(e.target.value) })}
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="buffer_time" className="block text-sm font-medium text-primary-200">
                Buffer Time (seconds)
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="buffer_time"
                  id="buffer_time"
                  min="0"
                  value={newBreak.buffer_time}
                  onChange={(e) => setNewBreak({ ...newBreak, buffer_time: parseInt(e.target.value) })}
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-primary-200">
                Priority (1-10)
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="priority"
                  id="priority"
                  min="1"
                  max="10"
                  value={newBreak.priority}
                  onChange={(e) => setNewBreak({ ...newBreak, priority: parseInt(e.target.value) })}
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="max_daily_plays" className="block text-sm font-medium text-primary-200">
                Maximum Daily Plays (optional)
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="max_daily_plays"
                  id="max_daily_plays"
                  min="1"
                  value={newBreak.max_daily_plays || ''}
                  onChange={(e) => setNewBreak({ ...newBreak, max_daily_plays: parseInt(e.target.value) })}
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowAddBreak(false)}
              className="rounded-md bg-primary-800 px-3 py-2 text-sm font-semibold text-primary-50 shadow-sm hover:bg-primary-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
            >
              Add Break
            </button>
          </div>
        </form>
      )}
    </div>
  );
}