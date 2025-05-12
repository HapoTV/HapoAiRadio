import React from 'react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import type { Schedule, Playlist, Store } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  schedule?: Schedule;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function ScheduleForm({ schedule, onSubmit, onCancel }: Props) {
  const [formData, setFormData] = useState({
    playlist_id: '',
    store_id: '',
    start_time: '09:00',
    end_time: '17:00',
    days_of_week: [1, 2, 3, 4, 5], // Mon-Fri
  });
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (schedule) {
      setFormData({
        playlist_id: schedule.playlist_id,
        store_id: schedule.store_id,
        start_time: format(new Date(schedule.start_time), 'HH:mm'),
        end_time: format(new Date(schedule.end_time), 'HH:mm'),
        days_of_week: schedule.days_of_week,
      });
    }
  }, [schedule]);

  const fetchData = async () => {
    try {
      const [playlistsResponse, storesResponse] = await Promise.all([
        supabase.from('playlists').select('*').order('name'),
        supabase.from('stores').select('*').order('name'),
      ]);

      if (playlistsResponse.error) throw playlistsResponse.error;
      if (storesResponse.error) throw storesResponse.error;

      setPlaylists(playlistsResponse.data || []);
      setStores(storesResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (schedule) {
        const { error } = await supabase
          .from('schedules')
          .update(formData)
          .eq('id', schedule.id);

        if (error) throw error;
        toast.success('Schedule updated successfully');
      } else {
        const { error } = await supabase
          .from('schedules')
          .insert([formData]);

        if (error) throw error;
        toast.success('Schedule created successfully');
      }

      onSubmit();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day: number) => {
    const days = formData.days_of_week;
    const updatedDays = days.includes(day)
      ? days.filter(d => d !== day)
      : [...days, day].sort();
    setFormData({ ...formData, days_of_week: updatedDays });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-primary-700 rounded"></div>
        <div className="h-10 bg-primary-700 rounded"></div>
        <div className="h-10 bg-primary-700 rounded"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="playlist_id" className="block text-sm font-medium text-primary-200">
          Playlist
        </label>
        <select
          id="playlist_id"
          value={formData.playlist_id}
          onChange={(e) => setFormData({ ...formData, playlist_id: e.target.value })}
          className="mt-1 block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
          required
        >
          <option value="">Select a playlist</option>
          {playlists.map(playlist => (
            <option key={playlist.id} value={playlist.id}>
              {playlist.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="store_id" className="block text-sm font-medium text-primary-200">
          Store
        </label>
        <select
          id="store_id"
          value={formData.store_id}
          onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
          className="mt-1 block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
          required
        >
          <option value="">Select a store</option>
          {stores.map(store => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_time" className="block text-sm font-medium text-primary-200">
            Start Time
          </label>
          <input
            type="time"
            id="start_time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            className="mt-1 block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
            required
          />
        </div>

        <div>
          <label htmlFor="end_time" className="block text-sm font-medium text-primary-200">
            End Time
          </label>
          <input
            type="time"
            id="end_time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            className="mt-1 block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-primary-200 mb-2">
          Days of Week
        </label>
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <button
              key={day}
              type="button"
              onClick={() => handleDayToggle(index)}
              className={`
                p-2 rounded-lg text-center
                ${formData.days_of_week.includes(index)
                  ? 'bg-primary-600 text-primary-50'
                  : 'bg-primary-700 text-primary-400 hover:bg-primary-600 hover:text-primary-50'
                }
              `}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-primary-400 hover:text-primary-300"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Saving...' : (schedule ? 'Update Schedule' : 'Create Schedule')}
        </button>
      </div>
    </form>
  );
}