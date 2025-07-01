import React from 'react';
import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { generateTimeSlots, formatTime } from '../../lib/scheduling';
import type { TimeSlot } from '../../types/scheduling';
import { ClockIcon } from '@heroicons/react/24/outline';

interface TimeSlotPickerProps {
  date: Date;
  providerId: string;
  serviceId: string;
  timezone: string;
  onSelectTimeSlot: (timeSlot: TimeSlot) => void;
  selectedTimeSlot?: TimeSlot;
}

export default function TimeSlotPicker({
  date,
  providerId,
  serviceId,
  timezone,
  onSelectTimeSlot,
  selectedTimeSlot
}: TimeSlotPickerProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (date && providerId && serviceId) {
      fetchTimeSlots();
    }
  }, [date, providerId, serviceId, timezone]);

  const fetchTimeSlots = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dateString = date.toISOString().split('T')[0];
      const slots = await generateTimeSlots(dateString, providerId, serviceId, timezone);
      
      // Sort by start time
      slots.sort((a, b) => {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
      
      setTimeSlots(slots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setError('Failed to load available time slots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatSlotTime = (slot: TimeSlot): string => {
    const start = utcToZonedTime(new Date(slot.startTime), timezone);
    return format(start, 'h:mm a');
  };

  if (loading) {
    return (
      <div className="bg-primary-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-primary-50 mb-4">Select a Time</h3>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-primary-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-primary-50 mb-4">Select a Time</h3>
        <div className="text-status-error p-4 text-center">
          {error}
          <button
            onClick={fetchTimeSlots}
            className="block mx-auto mt-2 px-4 py-2 bg-primary-700 text-primary-50 rounded-lg hover:bg-primary-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const availableSlots = timeSlots.filter(slot => slot.isAvailable);

  return (
    <div className="bg-primary-800 rounded-lg p-4">
      <h3 className="text-lg font-medium text-primary-50 mb-4">Select a Time</h3>
      
      {availableSlots.length === 0 ? (
        <div className="text-primary-400 p-4 text-center">
          No available time slots for this date.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
          {availableSlots.map((slot) => (
            <button
              key={slot.id}
              onClick={() => onSelectTimeSlot(slot)}
              className={`
                flex items-center justify-center p-3 rounded-lg
                ${selectedTimeSlot?.id === slot.id
                  ? 'bg-primary-600 text-primary-50'
                  : 'bg-primary-700 text-primary-200 hover:bg-primary-600 hover:text-primary-50'
                }
                transition-colors
              `}
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              {formatSlotTime(slot)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}