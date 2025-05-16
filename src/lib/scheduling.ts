import React from 'react';
import { supabase } from './supabase';
import { 
  format, 
  addMinutes, 
  parseISO, 
  isAfter, 
  isBefore, 
  isEqual, 
  getDay,
  addDays,
  addMonths,
  isSameDay,
  differenceInMinutes,
  startOfDay,
  endOfDay
} from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type {
  TimeSlot,
  ScheduleDay,
  ServiceProvider,
  Service,
  Availability,
  Booking,
  BookingRequest,
  ScheduleSettings,
  BreakTime,
  BookingWithDetails,
  AvailabilityRequest,
  AvailabilityResponse,
  RecurrenceRule,
  BookingNotification
} from '../types/scheduling';

// Validation schemas
const timeSlotSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

const bookingRequestSchema = z.object({
  serviceId: z.string().uuid(),
  providerId: z.string().uuid(),
  startTime: z.string().datetime(),
  notes: z.string().optional(),
  recurrenceRule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().positive(),
    count: z.number().positive().optional(),
    until: z.string().datetime().optional(),
    byDay: z.array(z.number().min(0).max(6)).optional(),
    byMonthDay: z.array(z.number().min(1).max(31)).optional(),
  }).optional(),
});

const availabilityRequestSchema = z.object({
  providerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  timezone: z.string(),
});

// Helper functions
export const validateTimeSlot = (timeSlot: any): boolean => {
  try {
    timeSlotSchema.parse(timeSlot);
    const start = new Date(timeSlot.startTime);
    const end = new Date(timeSlot.endTime);
    return isAfter(end, start);
  } catch (error) {
    console.error('Invalid time slot:', error);
    return false;
  }
};

export const validateBookingRequest = (request: any): boolean => {
  try {
    bookingRequestSchema.parse(request);
    return true;
  } catch (error) {
    console.error('Invalid booking request:', error);
    return false;
  }
};

export const validateAvailabilityRequest = (request: any): boolean => {
  try {
    availabilityRequestSchema.parse(request);
    return true;
  } catch (error) {
    console.error('Invalid availability request:', error);
    return false;
  }
};

// Convert time to user's timezone
export const toUserTimezone = (isoString: string, timezone: string): string => {
  return utcToZonedTime(new Date(isoString), timezone).toISOString();
};

// Convert time from user's timezone to UTC
export const toUTC = (isoString: string, timezone: string): string => {
  return zonedTimeToUtc(new Date(isoString), timezone).toISOString();
};

// Format time for display
export const formatTime = (isoString: string, timezone: string): string => {
  const date = utcToZonedTime(new Date(isoString), timezone);
  return format(date, 'h:mm a');
};

// Format date for display
export const formatDate = (isoString: string, timezone: string): string => {
  const date = utcToZonedTime(new Date(isoString), timezone);
  return format(date, 'EEEE, MMMM d, yyyy');
};

// Check if a time slot overlaps with existing bookings
export const checkOverlap = (
  startTime: string,
  endTime: string,
  existingBookings: Booking[]
): boolean => {
  const newStart = new Date(startTime);
  const newEnd = new Date(endTime);

  return existingBookings.some(booking => {
    const bookingStart = new Date(booking.startTime);
    const bookingEnd = new Date(booking.endTime);

    // Check if the new booking overlaps with an existing booking
    return (
      (isAfter(newStart, bookingStart) || isEqual(newStart, bookingStart)) && isBefore(newStart, bookingEnd) ||
      (isAfter(newEnd, bookingStart) && (isBefore(newEnd, bookingEnd) || isEqual(newEnd, bookingEnd))) ||
      (isBefore(newStart, bookingStart) && isAfter(newEnd, bookingEnd))
    );
  });
};

// Check if a time slot is within provider's availability
export const isWithinAvailability = (
  startTime: string,
  endTime: string,
  availabilities: Availability[],
  timezone: string
): boolean => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const dayOfWeek = getDay(start);

  // Convert to provider's local time for comparison with availability
  const localStart = utcToZonedTime(start, timezone);
  const localStartTime = format(localStart, 'HH:mm');
  
  // Find matching availability for this day
  const matchingAvailability = availabilities.find(a => {
    if (a.isRecurring) {
      return a.dayOfWeek === dayOfWeek;
    } else {
      // For non-recurring availability, check the specific date
      return a.date && isSameDay(new Date(a.date), start);
    }
  });

  if (!matchingAvailability) {
    return false;
  }

  // Check if the appointment time is within the availability window
  return (
    localStartTime >= matchingAvailability.startTime &&
    format(addMinutes(localStart, getDuration(start, end)), 'HH:mm') <= matchingAvailability.endTime
  );
};

// Get duration between two dates in minutes
export const getDuration = (start: Date, end: Date): number => {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
};

// Generate time slots for a given day based on provider availability and service duration
export const generateTimeSlots = async (
  date: string,
  providerId: string,
  serviceId: string,
  timezone: string
): Promise<TimeSlot[]> => {
  try {
    // Get provider availability for this day
    const { data: availabilities, error: availabilityError } = await supabase
      .from('availabilities')
      .select('*')
      .eq('provider_id', providerId)
      .or(`is_recurring.eq.true,date.eq.${date}`);

    if (availabilityError) throw availabilityError;

    // Get service details for duration
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (serviceError) throw serviceError;

    // Get existing bookings for this provider on this day
    const dayStart = startOfDay(new Date(date));
    const dayEnd = endOfDay(new Date(date));

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('provider_id', providerId)
      .gte('start_time', dayStart.toISOString())
      .lte('start_time', dayEnd.toISOString())
      .not('status', 'eq', 'cancelled');

    if (bookingsError) throw bookingsError;

    // Get break times for this provider
    const { data: breakTimes, error: breakTimesError } = await supabase
      .from('break_times')
      .select('*')
      .eq('provider_id', providerId)
      .or(`is_recurring.eq.true,date.eq.${date}`);

    if (breakTimesError) throw breakTimesError;

    // Get schedule settings
    const { data: settings, error: settingsError } = await supabase
      .from('schedule_settings')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

    const dayOfWeek = new Date(date).getDay();
    const slots: TimeSlot[] = [];

    // Process each availability period for this day
    const dayAvailabilities = availabilities.filter(a => 
      a.isRecurring ? a.dayOfWeek === dayOfWeek : true
    );

    for (const availability of dayAvailabilities) {
      // Convert availability times to Date objects in the provider's timezone
      const availabilityStart = parseTimeString(date, availability.startTime, timezone);
      const availabilityEnd = parseTimeString(date, availability.endTime, timezone);
      
      // Calculate slot interval (use service duration + buffer time)
      const slotDuration = service.duration;
      const bufferTime = service.bufferTime || 0;
      const totalSlotDuration = slotDuration + bufferTime;
      
      // Generate slots at regular intervals
      let slotStart = new Date(availabilityStart);
      
      while (addMinutes(slotStart, slotDuration) <= availabilityEnd) {
        const slotEnd = addMinutes(slotStart, slotDuration);
        
        // Convert to UTC for storage
        const utcSlotStart = zonedTimeToUtc(slotStart, timezone).toISOString();
        const utcSlotEnd = zonedTimeToUtc(slotEnd, timezone).toISOString();
        
        // Check if this slot overlaps with any existing bookings
        const isBooked = checkOverlap(
          utcSlotStart,
          utcSlotEnd,
          bookings
        );
        
        // Check if this slot overlaps with any break times
        const isBreakTime = breakTimes.some(breakTime => {
          const breakStart = parseTimeString(date, breakTime.startTime, timezone);
          const breakEnd = parseTimeString(date, breakTime.endTime, timezone);
          
          return (
            (slotStart >= breakStart && slotStart < breakEnd) ||
            (slotEnd > breakStart && slotEnd <= breakEnd) ||
            (slotStart <= breakStart && slotEnd >= breakEnd)
          );
        });
        
        // Check if this slot is in the past
        const isPast = new Date() > slotStart;
        
        // Check if this slot is within the minimum advance booking time
        const minAdvanceTime = settings?.minAdvanceTime || 0;
        const isWithinMinAdvance = new Date() > addMinutes(slotStart, -minAdvanceTime);
        
        // Check if this slot is beyond the maximum advance booking time
        const maxAdvanceTime = settings?.maxAdvanceTime || 365;
        const isWithinMaxAdvance = new Date() < addMinutes(slotStart, maxAdvanceTime * 24 * 60);
        
        // Check if this date is a holiday
        const isHoliday = settings?.holidayDates?.includes(date);
        
        // Determine if the slot is available
        const isAvailable = !isBooked && !isBreakTime && !isPast && 
                           !isWithinMinAdvance && isWithinMaxAdvance && !isHoliday;
        
        slots.push({
          id: uuidv4(),
          startTime: utcSlotStart,
          endTime: utcSlotEnd,
          isAvailable,
          isBooked
        });
        
        // Move to the next slot
        slotStart = addMinutes(slotStart, totalSlotDuration);
      }
    }
    
    return slots;
  } catch (error) {
    console.error('Error generating time slots:', error);
    throw error;
  }
};

// Parse a time string (HH:MM) into a Date object
export const parseTimeString = (dateStr: string, timeStr: string, timezone: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return utcToZonedTime(date, timezone);
};

// Get available days for a given month
export const getAvailableDays = async (
  year: number,
  month: number,
  providerId: string,
  timezone: string
): Promise<string[]> => {
  try {
    // Get provider's recurring availability
    const { data: availabilities, error: availabilityError } = await supabase
      .from('availabilities')
      .select('*')
      .eq('provider_id', providerId);

    if (availabilityError) throw availabilityError;

    // Get schedule settings
    const { data: settings, error: settingsError } = await supabase
      .from('schedule_settings')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

    // Get all days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const availableDays: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      
      // Check if this day has any availability
      const hasAvailability = availabilities.some(a => 
        (a.isRecurring && a.dayOfWeek === dayOfWeek) || 
        (a.date && isSameDay(new Date(a.date), date))
      );
      
      // Check if this date is a holiday
      const isHoliday = settings?.holidayDates?.includes(date.toISOString().split('T')[0]);
      
      // Check if this date is in the past
      const isPast = new Date() > date;
      
      // Check if this date is beyond the maximum advance booking time
      const maxAdvanceTime = settings?.maxAdvanceTime || 365;
      const isWithinMaxAdvance = new Date() < addDays(date, maxAdvanceTime);
      
      if (hasAvailability && !isHoliday && !isPast && isWithinMaxAdvance) {
        availableDays.push(date.toISOString().split('T')[0]);
      }
    }
    
    return availableDays;
  } catch (error) {
    console.error('Error getting available days:', error);
    throw error;
  }
};

// Create a new booking
export const createBooking = async (
  request: BookingRequest,
  userId: string
): Promise<Booking> => {
  try {
    if (!validateBookingRequest(request)) {
      throw new Error('Invalid booking request');
    }

    // Get service details
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', request.serviceId)
      .single();

    if (serviceError) throw serviceError;

    // Calculate end time based on service duration
    const startTime = new Date(request.startTime);
    const endTime = addMinutes(startTime, service.duration);

    // Check for existing bookings that would conflict
    const { data: existingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('provider_id', request.providerId)
      .not('status', 'eq', 'cancelled')
      .or(`start_time.lte.${endTime.toISOString()},end_time.gte.${startTime.toISOString()}`);

    if (bookingsError) throw bookingsError;

    if (existingBookings.length > 0) {
      throw new Error('The selected time slot is no longer available');
    }

    // Create the booking
    const booking = {
      id: uuidv4(),
      userId,
      providerId: request.providerId,
      serviceId: request.serviceId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      status: 'pending',
      notes: request.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reminderSent: false,
      recurrenceRule: request.recurrenceRule
    };

    const { data, error } = await supabase
      .from('bookings')
      .insert([booking])
      .select()
      .single();

    if (error) throw error;

    // If this is a recurring booking, create all instances
    if (request.recurrenceRule) {
      await createRecurringBookings(data.id, request, userId, service.duration);
    }

    // Send confirmation notification
    await sendBookingNotification({
      type: 'confirmation',
      bookingId: data.id
    });

    return data;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

// Create recurring bookings based on recurrence rule
export const createRecurringBookings = async (
  parentBookingId: string,
  request: BookingRequest,
  userId: string,
  duration: number
): Promise<void> => {
  try {
    if (!request.recurrenceRule) return;

    const rule = request.recurrenceRule;
    const startDate = new Date(request.startTime);
    const bookings: Partial<Booking>[] = [];
    
    // Calculate end date based on count or until
    let endDate: Date;
    if (rule.until) {
      endDate = new Date(rule.until);
    } else if (rule.count) {
      // Calculate end date based on frequency and count
      switch (rule.frequency) {
        case 'daily':
          endDate = addDays(startDate, rule.interval * rule.count);
          break;
        case 'weekly':
          endDate = addDays(startDate, rule.interval * 7 * rule.count);
          break;
        case 'monthly':
          endDate = addMonths(startDate, rule.interval * rule.count);
          break;
        default:
          endDate = addDays(startDate, 365); // Default to 1 year
      }
    } else {
      // Default to 1 year if no count or until is specified
      endDate = addDays(startDate, 365);
    }

    // Generate recurring dates
    const dates = generateRecurringDates(startDate, endDate, rule);
    
    // Create bookings for each date
    for (const date of dates) {
      // Skip the first date as it's already booked
      if (isSameDay(date, startDate) && 
          date.getHours() === startDate.getHours() && 
          date.getMinutes() === startDate.getMinutes()) {
        continue;
      }
      
      const bookingStartTime = date.toISOString();
      const bookingEndTime = addMinutes(date, duration).toISOString();
      
      bookings.push({
        id: uuidv4(),
        userId,
        providerId: request.providerId,
        serviceId: request.serviceId,
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        status: 'pending',
        notes: request.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reminderSent: false,
        parentBookingId
      });
    }
    
    if (bookings.length > 0) {
      const { error } = await supabase
        .from('bookings')
        .insert(bookings);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error creating recurring bookings:', error);
    throw error;
  }
};

// Generate recurring dates based on recurrence rule
export const generateRecurringDates = (
  startDate: Date,
  endDate: Date,
  rule: RecurrenceRule
): Date[] => {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Check if this date matches the recurrence rule
    if (matchesRecurrenceRule(currentDate, startDate, rule)) {
      dates.push(new Date(currentDate));
    }
    
    // Move to the next day
    currentDate = addDays(currentDate, 1);
  }
  
  return dates;
};

// Check if a date matches a recurrence rule
export const matchesRecurrenceRule = (
  date: Date,
  startDate: Date,
  rule: RecurrenceRule
): boolean => {
  // Skip the start date itself
  if (isSameDay(date, startDate) && 
      date.getHours() === startDate.getHours() && 
      date.getMinutes() === startDate.getMinutes()) {
    return false;
  }
  
  switch (rule.frequency) {
    case 'daily':
      // Check if the days since start is divisible by the interval
      const daysSinceStart = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceStart % rule.interval === 0;
      
    case 'weekly':
      // Check if it's the right day of the week and the weeks since start is divisible by the interval
      const weeksSinceStart = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
      if (weeksSinceStart % rule.interval !== 0) return false;
      
      // If byDay is specified, check if this day is included
      if (rule.byDay && rule.byDay.length > 0) {
        return rule.byDay.includes(date.getDay());
      }
      
      // Otherwise, use the same day of week as the start date
      return date.getDay() === startDate.getDay();
      
    case 'monthly':
      // Check if it's the right day of the month and the months since start is divisible by the interval
      const monthsSinceStart = (date.getFullYear() - startDate.getFullYear()) * 12 + 
                              (date.getMonth() - startDate.getMonth());
      if (monthsSinceStart % rule.interval !== 0) return false;
      
      // If byMonthDay is specified, check if this day is included
      if (rule.byMonthDay && rule.byMonthDay.length > 0) {
        return rule.byMonthDay.includes(date.getDate());
      }
      
      // Otherwise, use the same day of month as the start date
      return date.getDate() === startDate.getDate();
      
    default:
      return false;
  }
};

// Get a booking by ID
export const getBooking = async (bookingId: string): Promise<BookingWithDetails | null> => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        provider:service_providers(*),
        user:users(*)
      `)
      .eq('id', bookingId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting booking:', error);
    throw error;
  }
};

// Get bookings for a user
export const getUserBookings = async (userId: string): Promise<BookingWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        provider:service_providers(*),
        user:users(*)
      `)
      .eq('user_id', userId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting user bookings:', error);
    throw error;
  }
};

// Get bookings for a provider
export const getProviderBookings = async (providerId: string): Promise<BookingWithDetails[]> => {
  try {
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

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting provider bookings:', error);
    throw error;
  }
};

// Cancel a booking
export const cancelBooking = async (
  bookingId: string,
  userId: string,
  cancelAll: boolean = false
): Promise<void> => {
  try {
    // Get the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError) throw bookingError;

    // Check if the booking belongs to the user
    if (booking.userId !== userId) {
      throw new Error('You are not authorized to cancel this booking');
    }

    // Check if the booking can be cancelled (based on schedule settings)
    const { data: settings, error: settingsError } = await supabase
      .from('schedule_settings')
      .select('*')
      .eq('provider_id', booking.providerId)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

    if (settings && settings.allowCancellation) {
      const cancellationTimeLimit = settings.cancellationTimeLimit || 24; // Default to 24 hours
      const bookingStart = new Date(booking.startTime);
      const now = new Date();
      
      const hoursUntilBooking = differenceInMinutes(bookingStart, now) / 60;
      
      if (hoursUntilBooking < cancellationTimeLimit) {
        throw new Error(`Bookings can only be cancelled ${cancellationTimeLimit} hours in advance`);
      }
    }

    // Update booking status
    const updateData = {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: userId,
      updatedAt: new Date().toISOString()
    };

    if (cancelAll && booking.recurrenceRule) {
      // Cancel all future recurring bookings
      const { error: cancelError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('parent_booking_id', booking.id)
        .gte('start_time', new Date().toISOString());

      if (cancelError) throw cancelError;
    }

    // Cancel this specific booking
    const { error: cancelError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId);

    if (cancelError) throw cancelError;

    // Send cancellation notification
    await sendBookingNotification({
      type: 'cancellation',
      bookingId
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    throw error;
  }
};

// Update a booking
export const updateBooking = async (
  bookingId: string,
  userId: string,
  updates: Partial<BookingRequest>,
  updateAll: boolean = false
): Promise<Booking> => {
  try {
    // Get the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError) throw bookingError;

    // Check if the booking belongs to the user
    if (booking.userId !== userId) {
      throw new Error('You are not authorized to update this booking');
    }

    // Check if the booking can be updated (based on schedule settings)
    const { data: settings, error: settingsError } = await supabase
      .from('schedule_settings')
      .select('*')
      .eq('provider_id', booking.providerId)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

    if (settings && settings.allowCancellation) {
      const cancellationTimeLimit = settings.cancellationTimeLimit || 24; // Default to 24 hours
      const bookingStart = new Date(booking.startTime);
      const now = new Date();
      
      const hoursUntilBooking = differenceInMinutes(bookingStart, now) / 60;
      
      if (hoursUntilBooking < cancellationTimeLimit) {
        throw new Error(`Bookings can only be modified ${cancellationTimeLimit} hours in advance`);
      }
    }

    // If changing the time, check for conflicts
    if (updates.startTime) {
      // Get service details
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', booking.serviceId)
        .single();

      if (serviceError) throw serviceError;

      // Calculate new end time
      const startTime = new Date(updates.startTime);
      const endTime = addMinutes(startTime, service.duration);

      // Check for existing bookings that would conflict
      const { data: existingBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('provider_id', booking.providerId)
        .not('status', 'eq', 'cancelled')
        .not('id', 'eq', bookingId)
        .or(`start_time.lte.${endTime.toISOString()},end_time.gte.${startTime.toISOString()}`);

      if (bookingsError) throw bookingsError;

      if (existingBookings.length > 0) {
        throw new Error('The selected time slot is not available');
      }

      // Update booking
      const updateData = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (updateAll && booking.recurrenceRule) {
        // Update all future recurring bookings
        const { error: updateError } = await supabase
          .from('bookings')
          .update(updateData)
          .eq('parent_booking_id', booking.id)
          .gte('start_time', new Date().toISOString());

        if (updateError) throw updateError;
      }

      // Update this specific booking
      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Send modification notification
      await sendBookingNotification({
        type: 'modification',
        bookingId
      });

      return updatedBooking;
    }

    // If just updating notes or other non-time fields
    const updateData = {
      notes: updates.notes,
      updatedAt: new Date().toISOString()
    };

    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) throw updateError;

    return updatedBooking;
  } catch (error) {
    console.error('Error updating booking:', error);
    throw error;
  }
};

// Get availability for a provider
export const getAvailability = async (
  request: AvailabilityRequest
): Promise<AvailabilityResponse> => {
  try {
    if (!validateAvailabilityRequest(request)) {
      throw new Error('Invalid availability request');
    }

    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const days: ScheduleDay[] = [];

    // Generate schedule for each day in the range
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const timeSlots = await generateTimeSlots(
        dateString,
        request.providerId,
        request.serviceId,
        request.timezone
      );

      days.push({
        date: dateString,
        timeSlots
      });

      currentDate = addDays(currentDate, 1);
    }

    return {
      days,
      timezone: request.timezone
    };
  } catch (error) {
    console.error('Error getting availability:', error);
    throw error;
  }
};

// Send booking notification
export const sendBookingNotification = async (
  params: {
    type: BookingNotification['type'],
    bookingId: string,
    message?: string
  }
): Promise<void> => {
  try {
    // Get booking details
    const booking = await getBooking(params.bookingId);
    if (!booking) throw new Error('Booking not found');

    // Create notification
    const notification: Partial<BookingNotification> = {
      type: params.type,
      message: params.message || getDefaultNotificationMessage(params.type, booking),
      sentAt: new Date().toISOString(),
      deliveryStatus: 'pending'
    };

    // Insert notification into database
    const { error } = await supabase
      .from('booking_notifications')
      .insert([{
        booking_id: params.bookingId,
        type: notification.type,
        message: notification.message,
        sent_at: notification.sentAt,
        delivery_status: notification.deliveryStatus
      }]);

    if (error) throw error;

    // In a real application, you would send an email or push notification here
    console.log(`Sending ${params.type} notification for booking ${params.bookingId}`);

    // Update notification status to sent
    await supabase
      .from('booking_notifications')
      .update({ delivery_status: 'sent' })
      .eq('booking_id', params.bookingId)
      .eq('type', params.type);

    // If this is a reminder notification, update the booking
    if (params.type === 'reminder') {
      await supabase
        .from('bookings')
        .update({ reminder_sent: true })
        .eq('id', params.bookingId);
    }
  } catch (error) {
    console.error('Error sending booking notification:', error);
    
    // Update notification status to failed
    await supabase
      .from('booking_notifications')
      .update({ 
        delivery_status: 'failed',
        error_message: error.message
      })
      .eq('booking_id', params.bookingId)
      .eq('type', params.type);
      
    throw error;
  }
};

// Get default notification message
export const getDefaultNotificationMessage = (
  type: BookingNotification['type'],
  booking: BookingWithDetails
): string => {
  switch (type) {
    case 'confirmation':
      return `Your booking for ${booking.service.name} with ${booking.provider.name} on ${formatDate(booking.startTime, 'UTC')} at ${formatTime(booking.startTime, 'UTC')} has been confirmed.`;
    
    case 'reminder':
      return `Reminder: You have a booking for ${booking.service.name} with ${booking.provider.name} tomorrow at ${formatTime(booking.startTime, 'UTC')}.`;
    
    case 'cancellation':
      return `Your booking for ${booking.service.name} with ${booking.provider.name} on ${formatDate(booking.startTime, 'UTC')} at ${formatTime(booking.startTime, 'UTC')} has been cancelled.`;
    
    case 'modification':
      return `Your booking for ${booking.service.name} with ${booking.provider.name} has been updated to ${formatDate(booking.startTime, 'UTC')} at ${formatTime(booking.startTime, 'UTC')}.`;
    
    default:
      return '';
  }
};

// Get service providers
export const getServiceProviders = async (): Promise<ServiceProvider[]> => {
  try {
    const { data, error } = await supabase
      .from('service_providers')
      .select(`
        *,
        services(*),
        availability:availabilities(*)
      `);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting service providers:', error);
    throw error;
  }
};

// Get services
export const getServices = async (): Promise<Service[]> => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting services:', error);
    throw error;
  }
};

// Create or update service provider availability
export const setProviderAvailability = async (
  providerId: string,
  availability: Omit<Availability, 'id'>[]
): Promise<void> => {
  try {
    // Delete existing availability
    const { error: deleteError } = await supabase
      .from('availabilities')
      .delete()
      .eq('provider_id', providerId);

    if (deleteError) throw deleteError;

    // Insert new availability
    if (availability.length > 0) {
      const { error: insertError } = await supabase
        .from('availabilities')
        .insert(availability.map(a => ({
          ...a,
          provider_id: providerId,
          id: uuidv4()
        })));

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error setting provider availability:', error);
    throw error;
  }
};

// Create or update schedule settings
export const setScheduleSettings = async (
  providerId: string,
  settings: Omit<ScheduleSettings, 'id'>
): Promise<void> => {
  try {
    // Check if settings already exist
    const { data, error: checkError } = await supabase
      .from('schedule_settings')
      .select('id')
      .eq('provider_id', providerId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

    if (data) {
      // Update existing settings
      const { error: updateError } = await supabase
        .from('schedule_settings')
        .update({
          min_advance_time: settings.minAdvanceTime,
          max_advance_time: settings.maxAdvanceTime,
          allow_cancellation: settings.allowCancellation,
          cancellation_time_limit: settings.cancellationTimeLimit,
          working_hours: settings.workingHours,
          holiday_dates: settings.holidayDates
        })
        .eq('id', data.id);

      if (updateError) throw updateError;

      // Delete existing break times
      const { error: deleteError } = await supabase
        .from('break_times')
        .delete()
        .eq('provider_id', providerId);

      if (deleteError) throw deleteError;

      // Insert new break times
      if (settings.breakTimes.length > 0) {
        const { error: insertError } = await supabase
          .from('break_times')
          .insert(settings.breakTimes.map(b => ({
            ...b,
            provider_id: providerId,
            id: uuidv4()
          })));

        if (insertError) throw insertError;
      }
    } else {
      // Create new settings
      const { error: insertError } = await supabase
        .from('schedule_settings')
        .insert([{
          id: uuidv4(),
          provider_id: providerId,
          min_advance_time: settings.minAdvanceTime,
          max_advance_time: settings.maxAdvanceTime,
          allow_cancellation: settings.allowCancellation,
          cancellation_time_limit: settings.cancellationTimeLimit,
          working_hours: settings.workingHours,
          holiday_dates: settings.holidayDates
        }]);

      if (insertError) throw insertError;

      // Insert break times
      if (settings.breakTimes.length > 0) {
        const { error: breakError } = await supabase
          .from('break_times')
          .insert(settings.breakTimes.map(b => ({
            ...b,
            provider_id: providerId,
            id: uuidv4()
          })));

        if (breakError) throw breakError;
      }
    }
  } catch (error) {
    console.error('Error setting schedule settings:', error);
    throw error;
  }
};

// Get schedule settings
export const getScheduleSettings = async (
  providerId: string
): Promise<ScheduleSettings | null> => {
  try {
    const { data: settings, error: settingsError } = await supabase
      .from('schedule_settings')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
    if (!settings) return null;

    // Get break times
    const { data: breakTimes, error: breakError } = await supabase
      .from('break_times')
      .select('*')
      .eq('provider_id', providerId);

    if (breakError) throw breakError;

    return {
      ...settings,
      breakTimes: breakTimes || []
    };
  } catch (error) {
    console.error('Error getting schedule settings:', error);
    throw error;
  }
};

// Send reminder notifications for upcoming bookings
export const sendReminderNotifications = async (): Promise<void> => {
  try {
    // Get bookings that are tomorrow and haven't had reminders sent
    const tomorrow = addDays(new Date(), 1);
    const tomorrowStart = startOfDay(tomorrow);
    const tomorrowEnd = endOfDay(tomorrow);

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id')
      .gte('start_time', tomorrowStart.toISOString())
      .lte('start_time', tomorrowEnd.toISOString())
      .eq('status', 'confirmed')
      .eq('reminder_sent', false);

    if (error) throw error;

    // Send reminder for each booking
    for (const booking of bookings) {
      await sendBookingNotification({
        type: 'reminder',
        bookingId: booking.id
      });
    }
  } catch (error) {
    console.error('Error sending reminder notifications:', error);
    throw error;
  }
};

// Log scheduling event
export const logSchedulingEvent = async (
  event: {
    type: string;
    bookingId?: string;
    userId?: string;
    providerId?: string;
    details?: any;
  }
): Promise<void> => {
  try {
    await supabase
      .from('scheduling_logs')
      .insert([{
        id: uuidv4(),
        event_type: event.type,
        booking_id: event.bookingId,
        user_id: event.userId,
        provider_id: event.providerId,
        details: event.details,
        created_at: new Date().toISOString()
      }]);
  } catch (error) {
    console.error('Error logging scheduling event:', error);
    // Don't throw here to prevent disrupting the main flow
  }
};