import React from 'react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { setProviderAvailability } from '../../lib/scheduling';
import type { Availability } from '../../types/scheduling';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface AvailabilityManagerProps {
  providerId: string;
  onUpdate: () => void;
}

export default function AvailabilityManager({
  providerId,
  onUpdate
}: AvailabilityManagerProps) {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAvailability, setNewAvailability] = useState<Partial<Availability>>({
    providerId,
    dayOfWeek: 1, // Monday
    startTime: '09:00',
    endTime: '17:00',
    isRecurring: true
  });

  useEffect(() => {
    fetchAvailability();
  }, [providerId]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('availabilities')
        .select('*')
        .eq('provider_id', providerId);
      
      if (error) throw error;
      setAvailabilities(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Failed to load availability settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAvailability = async () => {
    try {
      // Validate
      if (!newAvailability.startTime || !newAvailability.endTime) {
        toast.error('Please provide both start and end times');
        return;
      }
      
      if (newAvailability.startTime >= newAvailability.endTime) {
        toast.error('End time must be after start time');
        return;
      }
      
      // Add to list
      const availability: Availability = {
        id: crypto.randomUUID(),
        providerId,
        dayOfWeek: newAvailability.dayOfWeek || 1,
        startTime: newAvailability.startTime,
        endTime: newAvailability.endTime,
        isRecurring: newAvailability.isRecurring || true,
        date: newAvailability.date
      };
      
      setAvailabilities([...availabilities, availability]);
      
      // Reset form
      setNewAvailability({
        providerId,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        isRecurring: true
      });
      
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding availability:', error);
      toast.error('Failed to add availability');
    }
  };

  const handleRemoveAvailability = (id: string) => {
    setAvailabilities(availabilities.filter(a => a.id !== id));
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      
      // Format availabilities for API
      const formattedAvailabilities = availabilities.map(a => ({
        provider_id: a.providerId,
        day_of_week: a.dayOfWeek,
        start_time: a.startTime,
        end_time: a.endTime,
        is_recurring: a.isRecurring,
        date: a.date
      }));
      
      await setProviderAvailability(providerId, formattedAvailabilities);
      
      toast.success('Availability settings saved');
      onUpdate();
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save availability settings');
    } finally {
      setSaving(false);
    }
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  };

  if (loading) {
    return (
      <div className="bg-primary-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-primary-50 mb-4">Availability Settings</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-primary-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-primary-50">Availability Settings</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Availability
        </button>
      </div>
      
      {showAddForm && (
        <div className="bg-primary-700 p-4 rounded-lg mb-4">
          <h4 className="text-md font-medium text-primary-200 mb-4">Add Availability</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-primary-400 mb-1">
                Type
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={newAvailability.isRecurring}
                    onChange={() => setNewAvailability({
                      ...newAvailability,
                      isRecurring: true,
                      date: undefined
                    })}
                    className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-primary-600 bg-primary-800"
                  />
                  <span className="ml-2 text-primary-200">Weekly</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={!newAvailability.isRecurring}
                    onChange={() => setNewAvailability({
                      ...newAvailability,
                      isRecurring: false,
                      dayOfWeek: undefined
                    })}
                    className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-primary-600 bg-primary-800"
                  />
                  <span className="ml-2 text-primary-200">Specific Date</span>
                </label>
              </div>
            </div>
            
            {newAvailability.isRecurring ? (
              <div>
                <label htmlFor="dayOfWeek" className="block text-sm font-medium text-primary-400 mb-1">
                  Day of Week
                </label>
                <select
                  id="dayOfWeek"
                  value={newAvailability.dayOfWeek}
                  onChange={(e) => setNewAvailability({
                    ...newAvailability,
                    dayOfWeek: parseInt(e.target.value)
                  })}
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <option key={day} value={day}>
                      {getDayName(day)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-primary-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  value={newAvailability.date || ''}
                  onChange={(e) => setNewAvailability({
                    ...newAvailability,
                    date: e.target.value
                  })}
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                />
              </div>
            )}
            
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-primary-400 mb-1">
                Start Time
              </label>
              <input
                type="time"
                id="startTime"
                value={newAvailability.startTime}
                onChange={(e) => setNewAvailability({
                  ...newAvailability,
                  startTime: e.target.value
                })}
                className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              />
            </div>
            
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-primary-400 mb-1">
                End Time
              </label>
              <input
                type="time"
                id="endTime"
                value={newAvailability.endTime}
                onChange={(e) => setNewAvailability({
                  ...newAvailability,
                  endTime: e.target.value
                })}
                className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500"
            >
              Cancel
            </button>
            <button
              onClick={handleAddAvailability}
              className="px-3 py-1.5 bg-primary-500 text-primary-50 rounded-lg hover:bg-primary-400"
            >
              Add
            </button>
          </div>
        </div>
      )}
      
      {availabilities.length === 0 ? (
        <div className="text-primary-400 p-4 text-center">
          No availability settings configured. Add your first availability window.
        </div>
      ) : (
        <div className="space-y-4 mb-4">
          {availabilities.map((availability) => (
            <div key={availability.id} className="bg-primary-700 p-4 rounded-lg flex justify-between items-center">
              <div>
                {availability.isRecurring ? (
                  <p className="text-primary-50 font-medium">
                    {getDayName(availability.dayOfWeek)}
                  </p>
                ) : (
                  <p className="text-primary-50 font-medium">
                    {format(new Date(availability.date!), 'MMMM d, yyyy')}
                  </p>
                )}
                <p className="text-sm text-primary-400">
                  {availability.startTime} - {availability.endTime}
                </p>
              </div>
              <button
                onClick={() => handleRemoveAvailability(availability.id)}
                className="p-1 text-primary-400 hover:text-status-error"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex justify-end">
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="px-4 py-2 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}