import { supabase } from './supabase';
import type { BookingWithDetails } from '../types/scheduling';

export async function getUserBookings(userId: string): Promise<BookingWithDetails[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      service:services(*),
      provider:service_providers(*),
      user_id
    `)
    .eq('user_id', userId)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching bookings:', error);
    throw new Error('Failed to fetch bookings');
  }

  return data || [];
}

export async function getAvailableDays(
  year: number,
  month: number,
  providerId: string,
  timezone: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('availabilities')
    .select('*')
    .eq('provider_id', providerId)
    .eq('is_recurring', true);

  if (error) {
    console.error('Error fetching availabilities:', error);
    throw new Error('Failed to fetch available days');
  }

  // Get the first and last day of the month
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  // Filter out dates that have existing bookings
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('start_time')
    .eq('provider_id', providerId)
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())
    .neq('status', 'cancelled');

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
    throw new Error('Failed to fetch bookings');
  }

  const bookedDates = new Set(
    bookings?.map(booking => booking.start_time.split('T')[0]) || []
  );

  // Generate available dates based on recurring availabilities
  const availableDates: string[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const dateString = currentDate.toISOString().split('T')[0];

    // Check if this day of week has availability and the date isn't booked
    const hasAvailability = data?.some(
      availability => availability.day_of_week === dayOfWeek
    );

    if (hasAvailability && !bookedDates.has(dateString)) {
      availableDates.push(dateString);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return availableDates;
}

export async function cancelBooking(bookingId: string, userId: string, cancelAll: boolean = false) {
  // Start a transaction
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (fetchError) {
    throw new Error('Failed to find booking');
  }

  if (booking.user_id !== userId) {
    throw new Error('Unauthorized to cancel this booking');
  }

  let updateQuery = supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: userId
    });

  if (cancelAll && booking.parent_booking_id) {
    // Cancel all related recurring bookings
    updateQuery = updateQuery.eq('parent_booking_id', booking.parent_booking_id);
  } else {
    // Cancel just this booking
    updateQuery = updateQuery.eq('id', bookingId);
  }

  const { error: updateError } = await updateQuery;

  if (updateError) {
    throw new Error('Failed to cancel booking');
  }
}