import React from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import type { BookingWithDetails } from '../../types/scheduling';
import { XMarkIcon, CheckIcon, CalendarIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';

interface AdminBookingDetailsProps {
  booking: BookingWithDetails;
  timezone: string;
  onClose: () => void;
  onUpdateStatus: (bookingId: string, status: string) => Promise<void>;
}

export default function AdminBookingDetails({
  booking,
  timezone,
  onClose,
  onUpdateStatus
}: AdminBookingDetailsProps) {
  const [loading, setLoading] = useState(false);
  
  const startTime = utcToZonedTime(new Date(booking.startTime), timezone);
  const endTime = utcToZonedTime(new Date(booking.endTime), timezone);
  
  const handleUpdateStatus = async (status: string) => {
    try {
      setLoading(true);
      await onUpdateStatus(booking.id, status);
    } catch (error) {
      console.error('Error updating booking status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-primary-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-primary-50">Booking Details</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full bg-primary-700 hover:bg-primary-600"
        >
          <XMarkIcon className="h-5 w-5 text-primary-400" />
        </button>
      </div>
      
      <div className="space-y-6">
        <div className="bg-primary-700 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-primary-400">Service</p>
              <p className="text-primary-50 font-medium">{booking.service.name}</p>
            </div>
            <div>
              <p className="text-sm text-primary-400">Duration</p>
              <p className="text-primary-50 font-medium">{booking.service.duration} minutes</p>
            </div>
            <div>
              <p className="text-sm text-primary-400">Date</p>
              <p className="text-primary-50 font-medium">{format(startTime, 'EEEE, MMMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-primary-400">Time</p>
              <p className="text-primary-50 font-medium">
                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
              </p>
            </div>
            <div>
              <p className="text-sm text-primary-400">Status</p>
              <p className="text-primary-50 font-medium capitalize">{booking.status}</p>
            </div>
            <div>
              <p className="text-sm text-primary-400">Booking ID</p>
              <p className="text-primary-50 font-medium">{booking.id.slice(0, 8)}</p>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-md font-medium text-primary-200 mb-2">Client Information</h4>
          <div className="bg-primary-700 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-primary-400">Name</p>
                <p className="text-primary-50 font-medium">{booking.user.user_metadata?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-primary-400">Email</p>
                <p className="text-primary-50 font-medium">{booking.user.email}</p>
              </div>
            </div>
          </div>
        </div>
        
        {booking.notes && (
          <div>
            <h4 className="text-md font-medium text-primary-200 mb-2">Notes</h4>
            <div className="bg-primary-700 p-4 rounded-lg">
              <p className="text-primary-50">{booking.notes}</p>
            </div>
          </div>
        )}
        
        {booking.recurrenceRule && (
          <div>
            <h4 className="text-md font-medium text-primary-200 mb-2">Recurrence</h4>
            <div className="bg-primary-700 p-4 rounded-lg">
              <p className="text-primary-50">
                {booking.recurrenceRule.frequency === 'daily' && 'Repeats daily'}
                {booking.recurrenceRule.frequency === 'weekly' && 'Repeats weekly'}
                {booking.recurrenceRule.frequency === 'monthly' && 'Repeats monthly'}
                {booking.recurrenceRule.count && ` for ${booking.recurrenceRule.count} occurrences`}
                {booking.recurrenceRule.until && ` until ${format(new Date(booking.recurrenceRule.until), 'MMMM d, yyyy')}`}
              </p>
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-4">
          {booking.status === 'pending' && (
            <>
              <button
                onClick={() => handleUpdateStatus('confirmed')}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 flex items-center"
              >
                <CheckIcon className="h-4 w-4 mr-1" />
                Confirm
              </button>
              <button
                onClick={() => handleUpdateStatus('cancelled')}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 flex items-center"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Decline
              </button>
            </>
          )}
          
          {booking.status === 'confirmed' && (
            <>
              <button
                onClick={() => handleUpdateStatus('completed')}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 flex items-center"
              >
                <CheckIcon className="h-4 w-4 mr-1" />
                Mark Completed
              </button>
              <button
                onClick={() => handleUpdateStatus('no-show')}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50 flex items-center"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Mark No-Show
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}