import React from 'react';
import { format } from 'date-fns';
import { ClockIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Schedule } from '../../types';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Props {
  schedules: Schedule[];
  onUpdate: () => void;
}

export default function ScheduleList({ schedules, onUpdate }: Props) {
  const handleDelete = async (schedule: Schedule) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', schedule.id);

      if (error) throw error;

      toast.success('Schedule deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    }
  };

  const getDayNames = (days: number[]) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(day => dayNames[day]).join(', ');
  };

  return (
    <div className="space-y-4">
      {schedules.map(schedule => (
        <div
          key={schedule.id}
          className="bg-primary-700 rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <ClockIcon className="h-5 w-5 text-primary-400" />
            <div>
              <p className="text-primary-50 font-medium">
                {format(new Date(schedule.start_time), 'h:mm a')} - {format(new Date(schedule.end_time), 'h:mm a')}
              </p>
              <p className="text-sm text-primary-400">
                {getDayNames(schedule.days_of_week)}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDelete(schedule)}
            className="p-2 text-primary-400 hover:text-status-error"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ))}

      {schedules.length === 0 && (
        <p className="text-center text-primary-400 py-4">
          No schedules found
        </p>
      )}
    </div>
  );
}