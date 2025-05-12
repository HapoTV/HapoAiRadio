import React from 'react';
import { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import type { Schedule } from '../../types';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface Props {
  schedules: Schedule[];
  onSelectDate: (date: Date) => void;
  selectedDate?: Date;
}

export default function ScheduleCalendar({ schedules, onSelectDate, selectedDate }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const calendarDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const getSchedulesForDate = (date: Date) => {
    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.start_time);
      return isSameDay(date, scheduleDate);
    });
  };

  const handlePrevWeek = () => {
    setCurrentDate(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => addDays(prev, 7));
  };

  return (
    <div className="bg-primary-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-primary-50">Schedule Calendar</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevWeek}
            className="p-2 text-primary-400 hover:text-primary-300"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <span className="text-primary-200">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button
            onClick={handleNextWeek}
            className="p-2 text-primary-400 hover:text-primary-300"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            className="text-center text-sm font-medium text-primary-400 py-2"
          >
            {day}
          </div>
        ))}

        {calendarDays.map(date => {
          const daySchedules = getSchedulesForDate(date);
          const isSelected = selectedDate && isSameDay(date, selectedDate);

          return (
            <button
              key={date.toISOString()}
              onClick={() => onSelectDate(date)}
              className={`
                p-2 rounded-lg text-center relative
                ${isSelected ? 'bg-primary-600' : 'hover:bg-primary-700'}
              `}
            >
              <span className="text-primary-50">
                {format(date, 'd')}
              </span>
              {daySchedules.length > 0 && (
                <span className="absolute bottom-1 right-1 w-2 h-2 bg-primary-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}