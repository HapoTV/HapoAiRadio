import { supabase } from './supabase';
import type { BookingWithDetails, TimeSlot, BookingRequest } from '../types/scheduling';

export async function setProviderAvailability(providerId: string, availabilities: any[]) {
  try {
    // Delete existing availabilities for this provider
    const { error: deleteError } = await supabase
      .from('availabilities')
      .delete()
      .eq('provider_id', providerId);

    if (deleteError) {
      throw new Error('Failed to clear existing availabilities');
    }

    // Insert new availabilities
    const { error: insertError } = await supabase
      .from('availabilities')
      .insert(availabilities);

    if (insertError) {
      throw new Error('Failed to set new availabilities');
    }
  } catch (error) {
    console.error('Error setting provider availability:', error);
    throw error;
  }
}

export async function getProviderBookings(providerId: string): Promise<BookingWithDetails[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      service:services(*),
      provider:service_providers(*),
      user:users(*)
    `)
    .eq('provider_id', providerId)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching provider bookings:', error);
    throw new Error('Failed to fetch provider bookings');
  }

  return data || [];
}

export async function createBooking(booking: BookingRequest, userId: string) {
  try {
    // Calculate end time based on service duration
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration, buffer_time')
      .eq('id', booking.serviceId)
      .single();

    if (serviceError || !service) {
      throw new Error('Failed to fetch service details');
    }

    const startTime = new Date(booking.startTime);
    const endTime = new Date(startTime.getTime() + (service.duration * 60000));

    // Create the initial booking
    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        provider_id: booking.providerId,
        service_id: booking.serviceId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'pending',
        notes: booking.notes
      })
      .select()
      .single();

    if (bookingError) {
      throw new Error('Failed to create booking');
    }

    // Handle recurring bookings if a recurrence rule is provided
    if (booking.recurrenceRule) {
      const { frequency, interval, count } = booking.recurrenceRule;
      
      for (let i = 1; i < count; i++) {
        let nextStart = new Date(startTime);
        let nextEnd = new Date(endTime);

        switch (frequency) {
          case 'daily':
            nextStart.setDate(nextStart.getDate() + (i * interval));
            nextEnd.setDate(nextEnd.getDate() + (i * interval));
            break;
          case 'weekly':
            nextStart.setDate(nextStart.getDate() + (i * 7 * interval));
            nextEnd.setDate(nextEnd.getDate() + (i * 7 * interval));
            break;
          case 'monthly':
            nextStart.setMonth(nextStart.getMonth() + (i * interval));
            nextEnd.setMonth(nextEnd.getMonth() + (i * interval));
            break;
        }

        const { error: recurringError } = await supabase
          .from('bookings')
          .insert({
            user_id: userId,
            provider_id: booking.providerId,
            service_id: booking.serviceId,
            start_time: nextStart.toISOString(),
            end_time: nextEnd.toISOString(),
            status: 'pending',
            notes: booking.notes,
            parent_booking_id: newBooking.id,
            recurrence_rule: booking.recurrenceRule
          });

        if (recurringError) {
          console.error('Error creating recurring booking:', recurringError);
          // Continue creating other recurring bookings even if one fails
        }
      }
    }

    return newBooking;
  } catch (error) {
    console.error('Error in createBooking:', error);
    throw error;
  }
}

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

export async function generateTimeSlots(
  date: string,
  providerId: string,
  serviceId: string,
  timezone: string
): Promise<TimeSlot[]> {
  try {
    // Get provider's availability for the day
    const dayOfWeek = new Date(date).getDay();
    
    const { data: availabilities, error: availabilityError } = await supabase
      .from('availabilities')
      .select('*')
      .eq('provider_id', providerId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_recurring', true);

    if (availabilityError) {
      throw new Error('Failed to fetch provider availability');
    }

    if (!availabilities?.length) {
      return [];
    }

    // Get service duration
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration, buffer_time')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      throw new Error('Failed to fetch service details');
    }

    // Get existing bookings for the day
    const startOfDay = `${date}T00:00:00Z`;
    const endOfDay = `${date}T23:59:59Z`;

    const { data: existingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('provider_id', providerId)
      .gte('start_time', startOfDay)
      .lte('end_time', endOfDay)
      .neq('status', 'cancelled');

    if (bookingsError) {
      throw new Error('Failed to fetch existing bookings');
    }

    const slots: TimeSlot[] = [];
    const totalDuration = service.duration + (service.buffer_time || 0);

    // Generate slots for each availability period
    for (const availability of availabilities) {
      const [startHour, startMinute] = availability.start_time.split(':').map(Number);
      const [endHour, endMinute] = availability.end_time.split(':').map(Number);

      let currentSlot = new Date(date);
      currentSlot.setHours(startHour, startMinute, 0, 0);
      
      const endTime = new Date(date);
      endTime.setHours(endHour, endMinute, 0, 0);

      while (currentSlot < endTime) {
        const slotEnd = new Date(currentSlot.getTime() + totalDuration * 60000);
        
        if (slotEnd > endTime) break;

        const isAvailable = !existingBookings?.some(booking => {
          const bookingStart = new Date(booking.start_time);
          const bookingEnd = new Date(booking.end_time);
          return (
            (currentSlot >= bookingStart && currentSlot < bookingEnd) ||
            (slotEnd > bookingStart && slotEnd <= bookingEnd)
          );
        });

        if (isAvailable) {
          slots.push({
            id: currentSlot.toISOString(),
            startTime: currentSlot.toISOString(),
            endTime: slotEnd.toISOString(),
            isAvailable: true
          });
        }

        currentSlot = new Date(currentSlot.getTime() + totalDuration * 60000);
      }
    }

    return slots;
  } catch (error) {
    console.error('Error generating time slots:', error);
    throw new Error('Failed to generate time slots');
  }
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