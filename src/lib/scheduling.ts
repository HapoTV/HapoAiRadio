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