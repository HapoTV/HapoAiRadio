import React from 'react';
import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { getProviderBookings } from '../../lib/scheduling';
import type { BookingWithDetails } from '../../types/scheduling';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface AdminCalendarProps {
  providerId: string;
  timezone: string;
  onSelectBooking: (booking: BookingWithDetails) => void;
}

export default function AdminCalendar({
  providerId,
  timezone,
  onSelectBooking
}: AdminCalendarProps) {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate week start and end
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    if (providerId) {
      fetchBookings();
    }
  }, [providerId, currentDate]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const providerBookings = await getProviderBookings(providerId);
      setBookings(providerBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevWeek = () => {
    setCurrentDate(prevDate => addDays(prevDate, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate(prevDate => addDays(prevDate, 7));
  };

  // Get bookings for a specific day
  const getBookingsForDay = (day: Date) => {
    return bookings.filter(booking => {
      const bookingDate = utcToZonedTime(new Date(booking.startTime), timezone);
      return isSameDay(bookingDate, day);
    });
  };

  // Format time for display
  const formatBookingTime = (isoString: string) => {
    const date = utcToZonedTime(new Date(isoString), timezone);
    return format(date, 'h:mm a');
  };

  if (loading) {
    return (
      <div className="bg-primary-800 rounded-lg p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-primary-700 rounded"></div>
          <div className="h-96 bg-primary-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-primary-800 rounded-lg p-4">
        <div className="text-status-error p-4 text-center">
          {error}
          <button
            onClick={fetchBookings}
            className="block mx-auto mt-2 px-4 py-2 bg-primary-700 text-primary-50 rounded-lg hover:bg-primary-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-primary-50">Schedule</h3>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePrevWeek}
            className="p-1 rounded-full bg-primary-700 hover:bg-primary-600"
          >
            <ChevronLeftIcon className="h-5 w-5 text-primary-400" />
          </button>
          
          <span className="text-primary-200">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </span>
          
          <button
            onClick={handleNextWeek}
            className="p-1 rounded-full bg-primary-700 hover:bg-primary-600"
          >
            <ChevronRightIcon className="h-5 w-5 text-primary-400" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="text-center py-2">
            <div className="text-sm font-medium text-primary-400">
              {format(day, 'EEE')}
            </div>
            <div className="text-primary-50">
              {format(day, 'd')}
            </div>
          </div>
        ))}
        
        {/* Calendar cells */}
        {weekDays.map((day) => {
          const dayBookings = getBookingsForDay(day);
          
          return (
            <div 
              key={day.toISOString()} 
              className="bg-primary-700 rounded-lg p-2 h-48 overflow-y-auto"
            >
              {dayBookings.length === 0 ? (
                <div className="text-primary-400 text-center text-sm h-full flex items-center justify-center">
                  No bookings
                </div>
              ) : (
                <div className="space-y-2">
                  {dayBookings.map((booking) => (
                    <div
                      key={booking.id}
                      onClick={() => onSelectBooking(booking)}
                      className={`
                        p-2 rounded text-xs cursor-pointer
                        ${booking.status === 'confirmed' ? 'bg-green-900/30 border border-green-800' : 
                          booking.status === 'pending' ? 'bg-yellow-900/30 border border-yellow-800' :
                          booking.status === 'cancelled' ? 'bg-red-900/30 border border-red-800' :
                          'bg-primary-600/50 border border-primary-500'}
                      `}
                    >
                      <div className="font-medium text-primary-50">
                        {formatBookingTime(booking.startTime)}
                      </div>
                      <div className="text-primary-300 truncate">
                        {booking.service.name}
                      </div>
                      <div className="text-primary-400 truncate">
                        {booking.user.email}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}