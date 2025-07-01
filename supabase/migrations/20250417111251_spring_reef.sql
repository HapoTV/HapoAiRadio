/*
  # Create Scheduling System Tables
  
  1. New Tables
    - `service_providers` - Stores information about service providers
    - `services` - Stores information about available services
    - `availabilities` - Stores provider availability windows
    - `bookings` - Stores booking information
    - `break_times` - Stores provider break times
    - `schedule_settings` - Stores provider schedule settings
    - `booking_notifications` - Stores notification history
    - `scheduling_logs` - Stores system logs for auditing
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create service_providers table
CREATE TABLE IF NOT EXISTS service_providers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration integer NOT NULL, -- in minutes
  price numeric NOT NULL,
  buffer_time integer DEFAULT 0, -- in minutes
  provider_id uuid REFERENCES service_providers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create availabilities table
CREATE TABLE IF NOT EXISTS availabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES service_providers(id) ON DELETE CASCADE,
  day_of_week integer, -- 0-6, where 0 is Sunday
  start_time text NOT NULL, -- HH:MM format
  end_time text NOT NULL, -- HH:MM format
  is_recurring boolean DEFAULT true,
  date text, -- YYYY-MM-DD format for non-recurring availability
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT valid_time_format CHECK (
    start_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' AND
    end_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
  ),
  CONSTRAINT valid_date_format CHECK (
    date IS NULL OR date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  ),
  CONSTRAINT valid_times CHECK (start_time < end_time),
  CONSTRAINT day_or_date CHECK (
    (is_recurring = true AND day_of_week IS NOT NULL AND date IS NULL) OR
    (is_recurring = false AND day_of_week IS NULL AND date IS NOT NULL)
  )
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES service_providers(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no-show')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id),
  reminder_sent boolean DEFAULT false,
  parent_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  recurrence_rule jsonb,
  CONSTRAINT valid_times CHECK (start_time < end_time)
);

-- Create break_times table
CREATE TABLE IF NOT EXISTS break_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES service_providers(id) ON DELETE CASCADE,
  day_of_week integer, -- 0-6, where 0 is Sunday
  start_time text NOT NULL, -- HH:MM format
  end_time text NOT NULL, -- HH:MM format
  is_recurring boolean DEFAULT true,
  date text, -- YYYY-MM-DD format for non-recurring breaks
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT valid_time_format CHECK (
    start_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' AND
    end_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
  ),
  CONSTRAINT valid_date_format CHECK (
    date IS NULL OR date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  ),
  CONSTRAINT valid_times CHECK (start_time < end_time),
  CONSTRAINT day_or_date CHECK (
    (is_recurring = true AND day_of_week IS NOT NULL AND date IS NULL) OR
    (is_recurring = false AND day_of_week IS NULL AND date IS NOT NULL)
  )
);

-- Create schedule_settings table
CREATE TABLE IF NOT EXISTS schedule_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES service_providers(id) ON DELETE CASCADE,
  min_advance_time integer DEFAULT 60, -- in minutes
  max_advance_time integer DEFAULT 30, -- in days
  allow_cancellation boolean DEFAULT true,
  cancellation_time_limit integer DEFAULT 24, -- in hours
  working_hours jsonb DEFAULT '{
    "0": {"start": "09:00", "end": "17:00", "isWorkingDay": false},
    "1": {"start": "09:00", "end": "17:00", "isWorkingDay": true},
    "2": {"start": "09:00", "end": "17:00", "isWorkingDay": true},
    "3": {"start": "09:00", "end": "17:00", "isWorkingDay": true},
    "4": {"start": "09:00", "end": "17:00", "isWorkingDay": true},
    "5": {"start": "09:00", "end": "17:00", "isWorkingDay": true},
    "6": {"start": "09:00", "end": "17:00", "isWorkingDay": false}
  }'::jsonb,
  holiday_dates text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_min_advance_time CHECK (min_advance_time >= 0),
  CONSTRAINT valid_max_advance_time CHECK (max_advance_time > 0),
  CONSTRAINT valid_cancellation_time_limit CHECK (cancellation_time_limit > 0)
);

-- Create booking_notifications table
CREATE TABLE IF NOT EXISTS booking_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('confirmation', 'reminder', 'cancellation', 'modification')),
  message text NOT NULL,
  sent_at timestamptz NOT NULL,
  delivery_status text NOT NULL CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create scheduling_logs table
CREATE TABLE IF NOT EXISTS scheduling_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id),
  provider_id uuid REFERENCES service_providers(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_availabilities_provider ON availabilities(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_break_times_provider ON break_times(provider_id);
CREATE INDEX IF NOT EXISTS idx_notifications_booking ON booking_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_logs_booking ON scheduling_logs(booking_id);

-- Enable RLS
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow users to view service providers"
  ON service_providers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow users to view services"
  ON services FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow users to view availabilities"
  ON availabilities FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow users to view their own bookings"
  ON bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR provider_id = auth.uid());

CREATE POLICY "Allow users to create bookings"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to update their own bookings"
  ON bookings FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR provider_id = auth.uid())
  WITH CHECK (user_id = auth.uid() OR provider_id = auth.uid());

CREATE POLICY "Allow providers to view their break times"
  ON break_times FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Allow providers to manage their break times"
  ON break_times FOR ALL TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Allow providers to view their schedule settings"
  ON schedule_settings FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Allow providers to manage their schedule settings"
  ON schedule_settings FOR ALL TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Allow users to view their booking notifications"
  ON booking_notifications FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid() OR provider_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to view their scheduling logs"
  ON scheduling_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR provider_id = auth.uid());

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_services_timestamp
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_timestamp
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_settings_timestamp
  BEFORE UPDATE ON schedule_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to log booking events
CREATE OR REPLACE FUNCTION log_booking_event()
RETURNS TRIGGER AS $$
DECLARE
  change_data jsonb;
BEGIN
  -- For UPDATE operations with status change
  IF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
    change_data := jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status);
  -- For UPDATE operations with other changes
  ELSIF TG_OP = 'UPDATE' THEN
    -- Create a jsonb object with the changes
    change_data := jsonb_build_object('changes', jsonb_object(ARRAY[
      -- Add all fields that might have changed
      'status', NEW.status,
      'start_time', NEW.start_time,
      'end_time', NEW.end_time,
      'notes', NEW.notes,
      'updated_at', NEW.updated_at
    ]));
  -- For INSERT operations
  ELSIF TG_OP = 'INSERT' THEN
    change_data := jsonb_build_object('booking', row_to_json(NEW));
  -- For DELETE operations
  ELSE
    change_data := jsonb_build_object('booking', row_to_json(OLD));
  END IF;

  -- Insert the log entry
  INSERT INTO scheduling_logs (
    event_type,
    booking_id,
    user_id,
    provider_id,
    details
  ) VALUES (
    CASE
      WHEN TG_OP = 'INSERT' THEN 'booking_created'
      WHEN TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN 'status_changed'
      WHEN TG_OP = 'UPDATE' THEN 'booking_updated'
      WHEN TG_OP = 'DELETE' THEN 'booking_deleted'
    END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.provider_id ELSE NEW.provider_id END,
    change_data
  );
  
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger for booking events
CREATE TRIGGER log_booking_events
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION log_booking_event();

-- Create function to send booking notifications
CREATE OR REPLACE FUNCTION send_booking_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- When a booking is created, send confirmation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO booking_notifications (
      booking_id,
      type,
      message,
      sent_at,
      delivery_status
    ) VALUES (
      NEW.id,
      'confirmation',
      'Your booking has been created and is pending confirmation.',
      now(),
      'pending'
    );
  
  -- When a booking status changes, send appropriate notification
  ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
    INSERT INTO booking_notifications (
      booking_id,
      type,
      message,
      sent_at,
      delivery_status
    ) VALUES (
      NEW.id,
      CASE
        WHEN NEW.status = 'confirmed' THEN 'confirmation'
        WHEN NEW.status = 'cancelled' THEN 'cancellation'
        ELSE 'modification'
      END,
      CASE
        WHEN NEW.status = 'confirmed' THEN 'Your booking has been confirmed.'
        WHEN NEW.status = 'cancelled' THEN 'Your booking has been cancelled.'
        WHEN NEW.status = 'completed' THEN 'Your booking has been marked as completed.'
        WHEN NEW.status = 'no-show' THEN 'You were marked as no-show for your booking.'
        ELSE 'Your booking has been updated.'
      END,
      now(),
      'pending'
    );
  END IF;
  
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger for booking notifications
CREATE TRIGGER send_booking_notifications
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION send_booking_notification();