import { User } from '@supabase/supabase-js';

export interface TimeSlot {
  id: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  isAvailable: boolean;
  isBooked: boolean;
}

export interface ScheduleDay {
  date: string; // ISO date string
  timeSlots: TimeSlot[];
}

export interface ServiceProvider {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  services: Service[];
  availability: Availability[];
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  bufferTime: number; // in minutes
  providerId: string;
}

export interface Availability {
  id: string;
  providerId: string;
  dayOfWeek: number; // 0-6, where 0 is Sunday
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isRecurring: boolean;
  date?: string; // ISO date string for non-recurring availability
}

export interface Booking {
  id: string;
  userId: string;
  providerId: string;
  serviceId: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  status: BookingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancelledBy?: string;
  reminderSent: boolean;
  recurrenceRule?: RecurrenceRule;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  count?: number;
  until?: string; // ISO date string
  byDay?: number[]; // 0-6, where 0 is Sunday
  byMonthDay?: number[]; // 1-31
}

export interface BookingRequest {
  serviceId: string;
  providerId: string;
  startTime: string; // ISO string
  notes?: string;
  recurrenceRule?: RecurrenceRule;
}

export interface ScheduleSettings {
  id: string;
  providerId: string;
  minAdvanceTime: number; // in minutes
  maxAdvanceTime: number; // in days
  allowCancellation: boolean;
  cancellationTimeLimit: number; // in hours
  workingHours: {
    [key: number]: { // 0-6, where 0 is Sunday
      start: string; // HH:MM format
      end: string; // HH:MM format
      isWorkingDay: boolean;
    };
  };
  breakTimes: BreakTime[];
  holidayDates: string[]; // ISO date strings
}

export interface BreakTime {
  id: string;
  providerId: string;
  dayOfWeek: number; // 0-6, where 0 is Sunday
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isRecurring: boolean;
  date?: string; // ISO date string for non-recurring breaks
}

export interface BookingWithDetails extends Booking {
  service: Service;
  provider: ServiceProvider;
  user: User;
}

export interface AvailabilityRequest {
  providerId: string;
  serviceId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  timezone: string;
}

export interface AvailabilityResponse {
  days: ScheduleDay[];
  timezone: string;
}

export interface BookingConfirmation {
  booking: BookingWithDetails;
  confirmationCode: string;
}

export interface BookingNotification {
  type: 'confirmation' | 'reminder' | 'cancellation' | 'modification';
  booking: BookingWithDetails;
  message: string;
  sentAt: string; // ISO string
  deliveryStatus: 'pending' | 'sent' | 'failed';
}