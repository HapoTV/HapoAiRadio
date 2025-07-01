import React from 'react';
import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import CommercialSelector from './CommercialSelector';
import toast from 'react-hot-toast';
import type { Store } from '../../types';

// Remove or update this import if not needed:
// import { CommercialLibrary } from '../components/CommercialLibrary';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCommercialPlaylistModal({ isOpen, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [intervalMinutes, setIntervalMinutes] = useState<number | ''>('');
  const [slotDuration, setSlotDuration] = useState(30);
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedCommercials, setSelectedCommercials] = useState<string[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [specificTimes, setSpecificTimes] = useState<string[]>([]);
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const { data, error } = await supabase.from('stores').select('*').order('name');
        if (error) throw error;
        setStores(data || []);
      } catch (error) {
        console.error('Error fetching stores:', error);
        toast.error('Failed to load stores');
      }
    };
    
    fetchStores();
  }, []);

  const handleCommercialSelect = (commercialIds: string[]) => {
    setSelectedCommercials(commercialIds);
  };

  const handleAddTime = () => {
    if (newTime) {
      setSpecificTimes([...specificTimes, newTime]);
      setNewTime('');
    }
  };

  const handleRemoveTime = (index: number) => {
    setSpecificTimes(specificTimes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCommercials.length === 0) {
      toast.error('Please select at least one commercial');
      return;
    }
    if (!selectedStore) {
      toast.error('Please select a store');
      return;
    }
    if (intervalMinutes === '' && specificTimes.length === 0) {
      toast.error('Please specify either an interval or specific times');
      return;
    }

    setLoading(true);
    try {
      const { data: schedule, error: scheduleError } = await supabase
        .from('ad_schedules')
        .insert([{
          playlist_id: null, // Ensure that playlist_id handling is consistent with your application's logic
          interval_minutes: intervalMinutes || null,
          specific_times: specificTimes.length > 0 ? specificTimes : null,
          slot_duration: slotDuration,
          is_enabled: isEnabled
        }])
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      const adSlots = selectedCommercials.map((commercialId, index) => ({
        ad_schedule_id: schedule.id,
        advertisement_id: commercialId,
        position: index
      }));

      const { error: slotsError } = await supabase.from('ad_slots').insert(adSlots);

      if (slotsError) throw slotsError;

      toast.success('Ad schedule created successfully');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error creating ad schedule:', error);
      toast.error(error.message || 'Failed to create ad schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIntervalMinutes('');
    setSlotDuration(30);
    setIsEnabled(true);
    setSelectedCommercials([]);
    setSelectedStore('');
    setSpecificTimes([]);
    setNewTime('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full rounded-xl bg-primary-800 shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-primary-700">
            <Dialog.Title className="text-lg font-medium text-primary-50">
              Create New Ad Schedule
            </Dialog.Title>
            <button type="button" onClick={handleClose} className="text-primary-400 hover:text-primary-300">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-6">
                {/* Store Selection */}
                <div>
                  <label htmlFor="store" className="block text-sm font-medium text-primary-200">Store</label>
                  <select
                    id="store"
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="mt-1 block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                    required
                  >
                    <option value="">Select a store</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>

                {/* Interval Input */}
                <div>
                  <label htmlFor="interval" className="block text-sm font-medium text-primary-200">Interval (minutes)</label>
                  <input
                    type="number"
                    id="interval"
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(e.target.value ? parseInt(e.target.value) : '')}
                    className="mt-1 block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 placeholder:text-primary-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                    placeholder="Leave empty to use specific times"
                    min="1"
                  />
                </div>

                {/* Slot Duration Input */}
                <div>
                  <label htmlFor="slotDuration" className="block text-sm font-medium text-primary-200">Slot Duration (seconds)</label>
                  <input
                    type="number"
                    id="slotDuration"
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(parseInt(e.target.value))}
                    className="mt-1 block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 placeholder:text-primary-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                    required
                    min="1"
                  />
                </div>

                {/* Specific Times Input */}
                <div>
                  <label className="block text-sm font-medium text-primary-200 mb-2">Specific Times</label>
                  <div className="flex space-x-2">
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 placeholder:text-primary-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
                    />
                    <button type="button" onClick={handleAddTime} className="px-3 py-1.5 bg-primary-600 text-primary-50 rounded-md hover:bg-primary-500">
                      Add
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {specificTimes.map((time, index) => (
                      <div key={index} className="inline-flex items-center bg-primary-700 px-2 py-1 rounded-md">
                        <span className="text-sm text-primary-200">{time}</span>
                        <button type="button" onClick={() => handleRemoveTime(index)} className="ml-1 text-primary-400 hover:text-primary-300">
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Enable Schedule Checkbox */}
                <div className="flex items-center">
                  <input
                    id="enabled"
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-primary-600 text-primary-500 focus:ring-primary-500"
                  />
                  <label htmlFor="enabled" className="ml-2 text-sm text-primary-200">Enable this schedule</label>
                </div>
              </div>

              {/* Commercial Selector Component */}
              <div>
                <h3 className="text-sm font-medium text-primary-200 mb-4">Select Commercials</h3>
                <CommercialSelector
                  selectedCommercials={selectedCommercials}
                  onCommercialSelect={handleCommercialSelect}
                  mode="multi"
                />
              </div>
            </div>

            {/* Submit and Cancel Buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md bg-primary-700 px-3 py-2 text-sm font-semibold text-primary-50 shadow-sm hover:bg-primary-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`rounded-md bg-primary-500 px-3 py-2 text-sm font-semibold text-primary-50 shadow-sm hover:bg-primary-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Creating...' : 'Create Ad Schedule'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}