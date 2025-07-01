import React from 'react';
import { useState, useEffect } from 'react';
import { format, isPast } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { getUserBookings, cancelBooking } from '../../lib/scheduling';
import type { BookingWithDetails } from '../../types/scheduling';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  ClockIcon, 
  CalendarIcon, 
  UserIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface BookingListProps {
  timezone: string;
  onEditBooking?: (booking: BookingWithDetails) => void;
}

export default function BookingList({ timezone, onEditBooking }: BookingListProps) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const userBookings = await getUserBookings(user.id);
      setBookings(userBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to load your bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string, cancelAll: boolean = false) => {
    if (!user) return;
    
    try {
      setCancellingId(bookingId);
      await cancelBooking(bookingId, user.id, cancelAll);
      toast.success('Booking cancelled successfully');
      fetchBookings();
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast.error(error.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckIcon className="h-3 w-3 mr-1" />
            Confirmed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XMarkIcon className="h-3 w-3 mr-1" />
            Cancelled
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CheckIcon className="h-3 w-3 mr-1" />
            Completed
          </span>
        );
      case 'no-show':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <ExclamationCircleIcon className="h-3 w-3 mr-1" />
            No Show
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-primary-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-primary-50 mb-4">Your Bookings</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-primary-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-primary-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-primary-50 mb-4">Your Bookings</h3>
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

  // Group bookings by date
  const upcomingBookings = bookings.filter(booking => 
    !isPast(new Date(booking.startTime)) && booking.status !== 'cancelled'
  );
  
  const pastBookings = bookings.filter(booking => 
    isPast(new Date(booking.startTime)) || booking.status === 'cancelled'
  );

  return (
    <div className="bg-primary-800 rounded-lg p-4">
      <h3 className="text-lg font-medium text-primary-50 mb-4">Your Bookings</h3>
      
      {bookings.length === 0 ? (
        <div className="text-primary-400 p-4 text-center">
          You don't have any bookings yet.
        </div>
      ) : (
        <div className="space-y-6">
          {upcomingBookings.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-primary-200 mb-2">Upcoming</h4>
              <div className="space-y-4">
                {upcomingBookings.map((booking) => {
                  const startTime = utcToZonedTime(new Date(booking.startTime), timezone);
                  const endTime = utcToZonedTime(new Date(booking.endTime), timezone);
                  
                  return (
                    <div key={booking.id} className="bg-primary-700 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="text-primary-50 font-medium">{booking.service.name}</h5>
                          <div className="flex items-center text-sm text-primary-400 mt-1">
                            <UserIcon className="h-4 w-4 mr-1" />
                            <span>{booking.provider.name}</span>
                          </div>
                          <div className="flex items-center text-sm text-primary-400 mt-1">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            <span>{format(startTime, 'EEEE, MMMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center text-sm text-primary-400 mt-1">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            <span>{format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}</span>
                          </div>
                          {booking.recurrenceRule && (
                            <div className="text-sm text-primary-400 mt-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-600 text-primary-200">
                                Recurring
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          {getStatusBadge(booking.status)}
                          
                          <div className="flex space-x-2 mt-2">
                            {booking.status !== 'cancelled' && (
                              <>
                                {onEditBooking && (
                                  <button
                                    onClick={() => onEditBooking(booking)}
                                    className="text-sm text-primary-400 hover:text-primary-300"
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  onClick={() => handleCancelBooking(booking.id, false)}
                                  disabled={cancellingId === booking.id}
                                  className="text-sm text-status-error hover:text-status-errorHover disabled:opacity-50"
                                >
                                  {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                                </button>
                                {booking.recurrenceRule && (
                                  <button
                                    onClick={() => handleCancelBooking(booking.id, true)}
                                    disabled={cancellingId === booking.id}
                                    className="text-sm text-status-error hover:text-status-errorHover disabled:opacity-50"
                                  >
                                    Cancel All
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {pastBookings.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-primary-200 mb-2">Past</h4>
              <div className="space-y-4">
                {pastBookings.slice(0, 5).map((booking) => {
                  const startTime = utcToZonedTime(new Date(booking.startTime), timezone);
                  const endTime = utcToZonedTime(new Date(booking.endTime), timezone);
                  
                  return (
                    <div key={booking.id} className="bg-primary-700/50 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="text-primary-50 font-medium">{booking.service.name}</h5>
                          <div className="flex items-center text-sm text-primary-400 mt-1">
                            <UserIcon className="h-4 w-4 mr-1" />
                            <span>{booking.provider.name}</span>
                          </div>
                          <div className="flex items-center text-sm text-primary-400 mt-1">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            <span>{format(startTime, 'EEEE, MMMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center text-sm text-primary-400 mt-1">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            <span>{format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}</span>
                          </div>
                        </div>
                        <div>
                          {getStatusBadge(booking.status)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {pastBookings.length > 5 && (
                  <button
                    onClick={() => {/* Implement view more functionality */}}
                    className="text-sm text-primary-400 hover:text-primary-300 block w-full text-center py-2"
                  >
                    View more past bookings
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}