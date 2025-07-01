import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Playlist, Store } from '../../types';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Props {
  storeId?: string;
  onScheduleUpdate: () => void;
}

export default function ScheduleEditor({ storeId, onScheduleUpdate }: Props) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSchedule, setNewSchedule] = useState({
    playlistId: '',
    startTime: '09:00',
    endTime: '17:00',
    daysOfWeek: [1, 2, 3, 4, 5] // Mon-Fri by default
  });
  const [schedules, setSchedules] = useState<any[]>([]);

  useEffect(() => {
    if (storeId) {
      fetchData();
    }
  }, [storeId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch playlists for this store
      const { data: playlistsData, error: playlistsError } = await supabase
        .from('playlists')
        .select('*')
        .eq('store_id', storeId)
        .order('name');

      if (playlistsError) throw playlistsError;

      // Fetch existing schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedules')
        .select(`
          *,
          playlists (
            name
          )
        `)
        .eq('store_id', storeId)
        .order('start_time');

      if (schedulesError) throw schedulesError;

      setPlaylists(playlistsData || []);
      setSchedules(schedulesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day: number) => {
    const days = newSchedule.daysOfWeek;
    const updatedDays = days.includes(day)
      ? days.filter(d => d !== day)
      : [...days, day].sort();
    setNewSchedule({ ...newSchedule, daysOfWeek: updatedDays });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      toast.error('Please select a store first');
      return;
    }

    if (!newSchedule.playlistId) {
      toast.error('Please select a playlist');
      return;
    }

    try {
      const { error } = await supabase
        .from('schedules')
        .insert([{
          playlist_id: newSchedule.playlistId,
          store_id: storeId,
          start_time: newSchedule.startTime,
          end_time: newSchedule.endTime,
          days_of_week: newSchedule.daysOfWeek
        }]);

      if (error) throw error;

      toast.success('Schedule added successfully');
      setNewSchedule({
        playlistId: '',
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: [1, 2, 3, 4, 5]
      });
      fetchData();
      onScheduleUpdate();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    }
  };

  if (!storeId) {
    return (
      <div className="text-center py-8 text-primary-400">
        Please select a store to manage schedules
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-primary-700 rounded"></div>
        <div className="h-40 bg-primary-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-primary-700 rounded-lg p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="playlist" className="block text-sm font-medium text-primary-200">
              Playlist
            </label>
            <select
              id="playlist"
              value={newSchedule.playlistId}
              onChange={(e) => setNewSchedule({ ...newSchedule, playlistId: e.target.value })}
              className="mt-1 block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
            >
              <option value="">Select a playlist</option>
              {playlists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-primary-200">
                Start Time
              </label>
              <input
                type="time"
                id="startTime"
                value={newSchedule.startTime}
                onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                className="mt-1 block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              />
            </div>

            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-primary-200">
                End Time
              </label>
              <input
                type="time"
                id="endTime"
                value={newSchedule.endTime}
                onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                className="mt-1 block w-full rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
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
                  px-3 py-2 text-sm font-medium rounded-md
                  ${newSchedule.daysOfWeek.includes(index)
                    ? 'bg-primary-600 text-primary-50'
                    : 'bg-primary-800 text-primary-400 hover:bg-primary-700'
                  }
                `}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            Add to Schedule
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-primary-50">Current Schedule</h3>
        {schedules.map((schedule) => (
          <div
            key={schedule.id}
            className="bg-primary-700 rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-primary-50 font-medium">
                {schedule.playlists?.name || 'Unknown Playlist'}
              </p>
              <p className="text-primary-400 text-sm">
                {schedule.start_time} - {schedule.end_time}
              </p>
              <p className="text-primary-400 text-sm">
                {schedule.days_of_week
                  .map(day => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day])
                  .join(', ')}
              </p>
            </div>
            <button
              onClick={async () => {
                if (window.confirm('Are you sure you want to delete this schedule?')) {
                  try {
                    const { error } = await supabase
                      .from('schedules')
                      .delete()
                      .eq('id', schedule.id);

                    if (error) throw error;
                    toast.success('Schedule deleted');
                    fetchData();
                  } catch (error) {
                    console.error('Error deleting schedule:', error);
                    toast.error('Failed to delete schedule');
                  }
                }
              }}
              className="text-status-error hover:text-status-errorHover"
            >
              Delete
            </button>
          </div>
        ))}
        {schedules.length === 0 && (
          <p className="text-primary-400 text-center py-4">
            No schedules configured
          </p>
        )}
      </div>
    </div>
  );
}