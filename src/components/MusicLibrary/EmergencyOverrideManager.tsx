import React from 'react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { EmergencyOverride } from '../../types';
import { PlusIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Props {
  onUpdate: () => void;
}

export default function EmergencyOverrideManager({ onUpdate }: Props) {
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [newOverride, setNewOverride] = useState<Partial<EmergencyOverride>>({
    title: '',
    message: '',
    priority: 1,
    start_time: '',
    end_time: '',
    is_active: true
  });

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('emergency_overrides')
        .insert([newOverride]);

      if (error) throw error;

      setShowAddOverride(false);
      setNewOverride({
        title: '',
        message: '',
        priority: 1,
        start_time: '',
        end_time: '',
        is_active: true
      });
      toast.success('Emergency override added successfully');
      onUpdate();
    } catch (error) {
      console.error('Error adding emergency override:', error);
      toast.error('Failed to add emergency override');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ExclamationTriangleIcon className="h-6 w-6 text-status-warning" />
          <h3 className="text-lg font-medium text-primary-50">Emergency Overrides</h3>
        </div>
        <button
          type="button"
          onClick={() => setShowAddOverride(true)}
          className="inline-flex items-center rounded-md bg-status-errorBg px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-status-error/80"
        >
          <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
          Add Override
        </button>
      </div>

      {showAddOverride && (
        <form onSubmit={handleAddOverride} className="bg-primary-700 p-6 rounded-lg">
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-primary-200">
                Title
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="title"
                  id="title"
                  value={newOverride.title}
                  onChange={(e) => setNewOverride({ ...newOverride, title: e.target.value })}
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-primary-200">
                Message
              </label>
              <div className="mt-1">
                <textarea
                  name="message"
                  id="message"
                  rows={3}
                  value={newOverride.message}
                  onChange={(e) => setNewOverride({ ...newOverride, message: e.target.value })}
                  className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
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
                    value={newOverride.priority}
                    onChange={(e) => setNewOverride({ ...newOverride, priority: parseInt(e.target.value) })}
                    className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-primary-200">
                  Start Time
                </label>
                <div className="mt-1">
                  <input
                    type="datetime-local"
                    name="start_time"
                    id="start_time"
                    value={newOverride.start_time}
                    onChange={(e) => setNewOverride({ ...newOverride, start_time: e.target.value })}
                    className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-primary-200">
                  End Time (optional)
                </label>
                <div className="mt-1">
                  <input
                    type="datetime-local"
                    name="end_time"
                    id="end_time"
                    value={newOverride.end_time}
                    onChange={(e) => setNewOverride({ ...newOverride, end_time: e.target.value })}
                    className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="repeat_interval" className="block text-sm font-medium text-primary-200">
                  Repeat Interval (optional)
                </label>
                <div className="mt-1">
                  <select
                    id="repeat_interval"
                    name="repeat_interval"
                    value={newOverride.repeat_interval || ''}
                    onChange={(e) => setNewOverride({ ...newOverride, repeat_interval: e.target.value })}
                    className="block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                  >
                    <option value="">No repeat</option>
                    <option value="15 minutes">Every 15 minutes</option>
                    <option value="30 minutes">Every 30 minutes</option>
                    <option value="1 hour">Every hour</option>
                    <option value="2 hours">Every 2 hours</option>
                    <option value="4 hours">Every 4 hours</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                checked={newOverride.is_active}
                onChange={(e) => setNewOverride({ ...newOverride, is_active: e.target.checked })}
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
              onClick={() => setShowAddOverride(false)}
              className="rounded-md bg-primary-800 px-3 py-2 text-sm font-semibold text-primary-50 shadow-sm hover:bg-primary-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-status-errorBg px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-status-error/80"
            >
              Add Override
            </button>
          </div>
        </form>
      )}
    </div>
  );
}