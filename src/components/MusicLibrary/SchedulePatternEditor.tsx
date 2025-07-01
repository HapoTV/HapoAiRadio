import React from 'react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { SchedulePattern } from '../../types';
import { PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Props {
  segmentId: string;
  onUpdate: () => void;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export default function SchedulePatternEditor({ segmentId, onUpdate }: Props) {
  const [showAddPattern, setShowAddPattern] = useState(false);
  const [newPattern, setNewPattern] = useState<Partial<SchedulePattern>>({
    pattern_type: 'daily',
    days: [],
    dates: [],
    start_time: '',
    end_time: '',
    is_active: true
  });

  const handleAddPattern = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('schedule_patterns')
        .insert([
          {
            segment_id: segmentId,
            ...newPattern
          }
        ]);

      if (error) throw error;

      setShow

AddPattern(false);
      setNewPattern({
        pattern_type: 'daily',
        days: [],
        dates: [],
        start_time: '',
        end_time: '',
        is_active: true
      });
      toast.success('Schedule pattern added successfully');
      onUpdate();
    } catch (error) {
      console.error('Error adding schedule pattern:', error);
      toast.error('Failed to add schedule pattern');
    }
  };

  const handleDayToggle = (day: number) => {
    const days = newPattern.days || [];
    if (days.includes(day)) {
      setNewPattern({
        ...newPattern,
        days: days.filter(d => d !== day)
      });
    } else {
      setNewPattern({
        ...newPattern,
        days: [...days, day].sort()
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-primary-50">Schedule Patterns</h3>
        <button
          type="button"
          onClick={() => setShowAddPattern(true)}
          className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
        >
          <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
          Add Pattern
        </button>
      </div>

      {showAddPattern && (
        <form onSubmit={handleAddPattern} className="bg-primary-700 p-6 rounded-lg">
          <div className="space-y-6">
            <div>
              <label htmlFor="pattern_type" className="block text-sm font-medium text-primary-200">
                Pattern Type
              </label>
              <select
                id="pattern_type"
                name="pattern_type"
                value={newPattern.pattern_type}
                onChange={(e) => setNewPattern({ ...newPattern, pattern_type: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                className="mt-1 block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {newPattern.pattern_type === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-primary-200 mb-2">
                  Days of Week
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <label key={day} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={newPattern.days?.includes(index) || false}
                        onChange={() => handleDayToggle(index)}
                        className="rounded border-primary-600 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-primary-200">{day}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {newPattern.pattern_type === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-primary-200 mb-2">
                  Days of Month
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                    <label key={date} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={newPattern.dates?.includes(date) || false}
                        onChange={() => {
                          const dates = newPattern.dates || [];
                          if (dates.includes(date)) {
                            setNewPattern({
                              ...newPattern,
                              dates: dates.filter(d => d !== date)
                            });
                          } else {
                            setNewPattern({
                              ...newPattern,
                              dates: [...dates, date].sort((a, b) => a - b)
                            });
                          }
                        }}
                        className="rounded border-primary-600 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="ml-1 text-sm text-primary-200">{date}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

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
                    value={newPattern.start_time}
                    onChange={(e) => setNewPattern({ ...newPattern, start_time: e.target.value })}
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
                    value={newPattern.end_time}
                    onChange={(e) => setNewPattern({ ...newPattern, end_time: e.target.value })}
                    className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                checked={newPattern.is_active}
                onChange={(e) => setNewPattern({ ...newPattern, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-primary-600 text-primary-500 focus:ring-primary-500"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-primary-200">
                Active
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowAddPattern(false)}
              className="rounded-md bg-primary-800 px-3 py-2 text-sm font-semibold text-primary-50 shadow-sm hover:bg-primary-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
            >
              Add Pattern
            </button>
          </div>
        </form>
      )}
    </div>
  );
}