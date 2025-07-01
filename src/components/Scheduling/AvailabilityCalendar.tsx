import React from 'react';
import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isToday, isSameDay, parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { getAvailableDays } from '../../lib/scheduling';
import 'react-day-picker/dist/style.css';

interface AvailabilityCalendarProps {
  providerId: string;
  timezone: string;
  onSelectDate: (date: Date) => void;
  selectedDate?: Date;
}

export default function AvailabilityCalendar({
  providerId,
  timezone,
  onSelectDate,
  selectedDate
}: AvailabilityCalendarProps) {
  const [availableDays, setAvailableDays] = useState<Date[]>([]);
  const [month, setMonth] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailableDays();
  }, [providerId, month]);

  const fetchAvailableDays = async () => {
    try {
      setLoading(true);
      const year = month.getFullYear();
      const monthIndex = month.getMonth();
      
      const availableDates = await getAvailableDays(year, monthIndex, providerId, timezone);
      
      // Convert to Date objects
      const dates = availableDates.map(dateStr => parseISO(dateStr));
      setAvailableDays(dates);
    } catch (error) {
      console.error('Error fetching available days:', error);
    } finally {
      setLoading(false);
    }
  };

  // Custom day renderer to show availability
  const renderDay = (day: Date) => {
    const isAvailable = availableDays.some(availableDay => 
      isSameDay(day, availableDay)
    );
    
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    
    return (
      <div className={`relative p-2 ${
        isToday(day) ? 'bg-primary-700/30' : ''
      } ${
        isSelected ? 'bg-primary-600' : ''
      } ${
        isAvailable ? 'cursor-pointer hover:bg-primary-700/50' : 'opacity-30 cursor-not-allowed'
      }`}>
        <span>{format(day, 'd')}</span>
        {isAvailable && (
          <div className="absolute bottom-1 right-1 w-1 h-1 bg-primary-500 rounded-full" />
        )}
      </div>
    );
  };

  const handleDayClick = (day: Date) => {
    const isAvailable = availableDays.some(availableDay => 
      isSameDay(day, availableDay)
    );
    
    if (isAvailable) {
      onSelectDate(day);
    }
  };

  return (
    <div className="bg-primary-800 rounded-lg p-4">
      <h3 className="text-lg font-medium text-primary-50 mb-4">Select a Date</h3>
      
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-primary-800/70 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        )}
        
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && handleDayClick(date)}
          onMonthChange={setMonth}
          modifiers={{ available: availableDays }}
          modifiersStyles={{
            available: { fontWeight: 'bold' }
          }}
          components={{
            Day: ({ date, displayMonth }) => {
              if (displayMonth.getMonth() !== date.getMonth()) {
                return <div className="opacity-30">{format(date, 'd')}</div>;
              }
              return renderDay(date);
            }
          }}
          styles={{
            caption: { color: '#d4d4d4' },
            day: { color: '#d4d4d4' },
            head_cell: { color: '#a3a3a3' }
          }}
          className="text-primary-50"
        />
      </div>
    </div>
  );
}