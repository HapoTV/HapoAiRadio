import React from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { createBooking } from '../../lib/scheduling';
import type { 
  Service, 
  ServiceProvider, 
  TimeSlot, 
  BookingRequest,
  RecurrenceRule
} from '../../types/scheduling';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface BookingFormProps {
  service: Service;
  provider: ServiceProvider;
  selectedDate: Date;
  selectedTimeSlot: TimeSlot;
  timezone: string;
  onBookingComplete: () => void;
  onCancel: () => void;
}

export default function BookingForm({
  service,
  provider,
  selectedDate,
  selectedTimeSlot,
  timezone,
  onBookingComplete,
  onCancel
}: BookingFormProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceRule['frequency']>('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const [loading, setLoading] = useState(false);
  
  const formattedDate = format(
    utcToZonedTime(new Date(selectedTimeSlot.startTime), timezone),
    'EEEE, MMMM d, yyyy'
  );
  
  const formattedTime = format(
    utcToZonedTime(new Date(selectedTimeSlot.startTime), timezone),
    'h:mm a'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to book an appointment');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create booking request
      const bookingRequest: BookingRequest = {
        serviceId: service.id,
        providerId: provider.id,
        startTime: selectedTimeSlot.startTime,
        notes
      };
      
      // Add recurrence rule if applicable
      if (isRecurring) {
        bookingRequest.recurrenceRule = {
          frequency: recurrenceType,
          interval: 1,
          count: recurrenceCount
        };
      }
      
      // Create booking
      await createBooking(bookingRequest, user.id);
      
      toast.success('Booking created successfully!');
      onBookingComplete();
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error(error.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-primary-800 rounded-lg p-6">
      <h3 className="text-xl font-medium text-primary-50 mb-6">Confirm Your Booking</h3>
      
      <div className="mb-6 bg-primary-700 p-4 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-primary-400">Service</p>
            <p className="text-primary-50 font-medium">{service.name}</p>
          </div>
          <div>
            <p className="text-sm text-primary-400">Provider</p>
            <p className="text-primary-50 font-medium">{provider.name}</p>
          </div>
          <div>
            <p className="text-sm text-primary-400">Date</p>
            <p className="text-primary-50 font-medium">{formattedDate}</p>
          </div>
          <div>
            <p className="text-sm text-primary-400">Time</p>
            <p className="text-primary-50 font-medium">{formattedTime}</p>
          </div>
          <div>
            <p className="text-sm text-primary-400">Duration</p>
            <p className="text-primary-50 font-medium">{service.duration} minutes</p>
          </div>
          <div>
            <p className="text-sm text-primary-400">Price</p>
            <p className="text-primary-50 font-medium">${service.price}</p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-primary-200 mb-2">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
            placeholder="Any special requests or information for your provider"
          />
        </div>
        
        <div className="flex items-center">
          <input
            id="recurring"
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-primary-600 text-primary-500 focus:ring-primary-500"
          />
          <label htmlFor="recurring" className="ml-2 block text-sm text-primary-200">
            Make this a recurring booking
          </label>
        </div>
        
        {isRecurring && (
          <div className="pl-6 space-y-4 border-l-2 border-primary-700">
            <div>
              <label htmlFor="recurrenceType" className="block text-sm font-medium text-primary-200 mb-2">
                Repeat
              </label>
              <select
                id="recurrenceType"
                value={recurrenceType}
                onChange={(e) => setRecurrenceType(e.target.value as RecurrenceRule['frequency'])}
                className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="recurrenceCount" className="block text-sm font-medium text-primary-200 mb-2">
                Number of occurrences
              </label>
              <input
                id="recurrenceCount"
                type="number"
                min="2"
                max="52"
                value={recurrenceCount}
                onChange={(e) => setRecurrenceCount(parseInt(e.target.value))}
                className="block w-full rounded-md border-0 bg-primary-700 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
              />
            </div>
            
            <p className="text-sm text-primary-400">
              This will create {recurrenceCount} bookings, one 
              {recurrenceType === 'daily' ? ' day' : recurrenceType === 'weekly' ? ' week' : ' month'} 
              apart.
            </p>
          </div>
        )}
        
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-primary-700 text-primary-200 rounded-lg hover:bg-primary-600"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </div>
  );
}