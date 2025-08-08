-- Scheduling system tables

-- Consultant availability slots
CREATE TABLE IF NOT EXISTS consultant_availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  specific_date DATE, -- For one-time availability
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_sessions INTEGER DEFAULT 1,
  buffer_minutes INTEGER DEFAULT 15,
  is_recurring BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consultant blocked dates
CREATE TABLE IF NOT EXISTS consultant_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE NOT NULL,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consultant preferences
CREATE TABLE IF NOT EXISTS consultant_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE UNIQUE NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  advance_booking_days INTEGER DEFAULT 30,
  minimum_notice_hours INTEGER DEFAULT 24,
  auto_approve BOOLEAN DEFAULT true,
  max_daily_hours INTEGER DEFAULT 8,
  max_weekly_hours INTEGER DEFAULT 40,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session waitlist
CREATE TABLE IF NOT EXISTS session_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  preferred_time TIMESTAMP WITH TIME ZONE NOT NULL,
  preferred_duration INTEGER DEFAULT 60,
  preferred_consultants TEXT[], -- Array of consultant IDs
  status VARCHAR(50) DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'booked', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session history for tracking changes
CREATE TABLE IF NOT EXISTS session_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES consultation_sessions(id) ON DELETE CASCADE NOT NULL,
  action VARCHAR(50) NOT NULL, -- booked, rescheduled, cancelled, completed
  old_time TIMESTAMP WITH TIME ZONE,
  new_time TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_consultant_availability_slots_consultant_id ON consultant_availability_slots(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_availability_slots_day_of_week ON consultant_availability_slots(day_of_week);
CREATE INDEX IF NOT EXISTS idx_consultant_availability_slots_specific_date ON consultant_availability_slots(specific_date);
CREATE INDEX IF NOT EXISTS idx_consultant_availability_slots_is_available ON consultant_availability_slots(is_available);

CREATE INDEX IF NOT EXISTS idx_consultant_blocked_dates_consultant_id ON consultant_blocked_dates(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_blocked_dates_blocked_date ON consultant_blocked_dates(blocked_date);

CREATE INDEX IF NOT EXISTS idx_session_waitlist_student_id ON session_waitlist(student_id);
CREATE INDEX IF NOT EXISTS idx_session_waitlist_status ON session_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_session_waitlist_preferred_time ON session_waitlist(preferred_time);

CREATE INDEX IF NOT EXISTS idx_session_history_session_id ON session_history(session_id);
CREATE INDEX IF NOT EXISTS idx_session_history_action ON session_history(action);
CREATE INDEX IF NOT EXISTS idx_session_history_created_at ON session_history(created_at DESC);

-- Add unique constraints
ALTER TABLE consultant_availability_slots 
ADD CONSTRAINT unique_consultant_slot UNIQUE (consultant_id, day_of_week, start_time, end_time);

ALTER TABLE consultant_blocked_dates 
ADD CONSTRAINT unique_consultant_blocked_date UNIQUE (consultant_id, blocked_date);

-- Add comments for documentation
COMMENT ON TABLE consultant_availability_slots IS 'Recurring and one-time availability slots for consultants';
COMMENT ON TABLE consultant_blocked_dates IS 'Dates when consultants are unavailable';
COMMENT ON TABLE consultant_preferences IS 'Scheduling preferences and rules for consultants';
COMMENT ON TABLE session_waitlist IS 'Students waiting for available slots';
COMMENT ON TABLE session_history IS 'Audit trail for session changes';

COMMENT ON COLUMN consultant_availability_slots.day_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN consultant_availability_slots.is_recurring IS 'True for weekly recurring slots, false for one-time slots';
COMMENT ON COLUMN session_waitlist.status IS 'Current status of waitlist entry';
COMMENT ON COLUMN session_history.action IS 'Type of action performed on the session';
