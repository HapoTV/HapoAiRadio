import React from 'react';
import { useState } from 'react';
import { Tab } from '@headlessui/react';
import { BookingWizard, BookingList, AdminCalendar, AdminBookingDetails, AvailabilityManager, ScheduleSettings } from '../components/Scheduling';
import type { BookingWithDetails } from '../types/scheduling';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Scheduling() {
  const { user } = useAuth();
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [timezone, setTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // For admin view
  const providerId = user?.id; // In a real app, this would be determined by user role

  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;
      
      toast.success(`Booking ${status} successfully`);
      setRefreshTrigger(prev => prev + 1);
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold text-primary-50 mb-6">Scheduling</h1>
      
      <div className="mb-4">
        <label htmlFor="timezone" className="block text-sm font-medium text-primary-400 mb-1">
          Your Timezone
        </label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="block w-64 rounded-md border-0 bg-primary-800 py-1.5 text-primary-50 shadow-sm ring-1 ring-inset ring-primary-700 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
        >
          {Intl.supportedValuesOf('timeZone').map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>
      
      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-primary-800 p-1">
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white/60 ring-offset-2 ring-offset-primary-400 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-primary-700 text-primary-50 shadow'
                  : 'text-primary-400 hover:bg-primary-700/30 hover:text-primary-200'
              )
            }
          >
            Book Appointment
          </Tab>
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white/60 ring-offset-2 ring-offset-primary-400 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-primary-700 text-primary-50 shadow'
                  : 'text-primary-400 hover:bg-primary-700/30 hover:text-primary-200'
              )
            }
          >
            My Bookings
          </Tab>
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white/60 ring-offset-2 ring-offset-primary-400 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-primary-700 text-primary-50 shadow'
                  : 'text-primary-400 hover:bg-primary-700/30 hover:text-primary-200'
              )
            }
          >
            Admin
          </Tab>
        </Tab.List>
        <Tab.Panels className="mt-6">
          <Tab.Panel>
            <BookingWizard 
              onComplete={() => setRefreshTrigger(prev => prev + 1)} 
            />
          </Tab.Panel>
          <Tab.Panel>
            <BookingList 
              timezone={timezone} 
              key={refreshTrigger} 
            />
          </Tab.Panel>
          <Tab.Panel>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {selectedBooking ? (
                <AdminBookingDetails
                  booking={selectedBooking}
                  timezone={timezone}
                  onClose={() => setSelectedBooking(null)}
                  onUpdateStatus={handleUpdateBookingStatus}
                />
              ) : (
                <AdminCalendar
                  providerId={providerId!}
                  timezone={timezone}
                  onSelectBooking={setSelectedBooking}
                />
              )}
              
              <div className="space-y-6">
                <AvailabilityManager
                  providerId={providerId!}
                  onUpdate={() => setRefreshTrigger(prev => prev + 1)}
                />
                
                <ScheduleSettings
                  providerId={providerId!}
                  onUpdate={() => setRefreshTrigger(prev => prev + 1)}
                />
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}