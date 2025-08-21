-- Migration: Add Twilio integration fields
-- This migration adds fields to support Twilio Video, SendGrid email, and SMS services

-- Add Twilio Video fields to consultation_sessions table
ALTER TABLE consultation_sessions 
ADD COLUMN IF NOT EXISTS twilio_room_sid TEXT,
ADD COLUMN IF NOT EXISTS twilio_room_name TEXT,
ADD COLUMN IF NOT EXISTS video_session_status TEXT DEFAULT 'pending' CHECK (video_session_status IN ('pending', 'created', 'connected', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS recording_sid TEXT,
ADD COLUMN IF NOT EXISTS recording_status TEXT DEFAULT 'none' CHECK (recording_status IN ('none', 'recording', 'paused', 'stopped', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS recording_url TEXT,
ADD COLUMN IF NOT EXISTS session_start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS session_end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_status_update TIMESTAMP WITH TIME ZONE;

-- Add indexes for Twilio fields
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_twilio_room_sid 
ON consultation_sessions(twilio_room_sid);

CREATE INDEX IF NOT EXISTS idx_consultation_sessions_video_session_status 
ON consultation_sessions(video_session_status);

CREATE INDEX IF NOT EXISTS idx_consultation_sessions_recording_sid 
ON consultation_sessions(recording_sid);

CREATE INDEX IF NOT EXISTS idx_consultation_sessions_recording_status 
ON consultation_sessions(recording_status);

-- Add phone numbers for SMS notifications
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verification_code TEXT,
ADD COLUMN IF NOT EXISTS phone_verification_expires TIMESTAMP WITH TIME ZONE;

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

ALTER TABLE consultants 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

-- Create table for email delivery tracking
CREATE TABLE IF NOT EXISTS email_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES consultation_sessions(id) ON DELETE CASCADE,
  email_type VARCHAR(50) NOT NULL, -- session_confirmation, session_reminder, session_completion, certificate_ready
  recipient_email TEXT NOT NULL,
  sendgrid_message_id TEXT,
  delivery_status VARCHAR(50) DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'dropped', 'spam', 'unsubscribed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE
);

-- Create table for SMS delivery tracking
CREATE TABLE IF NOT EXISTS sms_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES consultation_sessions(id) ON DELETE CASCADE,
  sms_type VARCHAR(50) NOT NULL, -- session_confirmation, session_reminder, session_completion, certificate_ready
  recipient_phone TEXT NOT NULL,
  twilio_message_sid TEXT,
  delivery_status VARCHAR(50) DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'failed', 'undelivered')),
  error_code TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Create table for Twilio webhook logs
CREATE TABLE IF NOT EXISTS twilio_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type VARCHAR(50) NOT NULL, -- video_status, recording_status, sms_status, email_status
  event_type VARCHAR(50) NOT NULL,
  room_sid TEXT,
  recording_sid TEXT,
  message_sid TEXT,
  status VARCHAR(50),
  payload JSONB,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT
);

-- Add indexes for delivery tracking
CREATE INDEX IF NOT EXISTS idx_email_deliveries_user_id ON email_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_session_id ON email_deliveries(session_id);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_email_type ON email_deliveries(email_type);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_delivery_status ON email_deliveries(delivery_status);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_sent_at ON email_deliveries(sent_at);

CREATE INDEX IF NOT EXISTS idx_sms_deliveries_user_id ON sms_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_deliveries_session_id ON sms_deliveries(session_id);
CREATE INDEX IF NOT EXISTS idx_sms_deliveries_sms_type ON sms_deliveries(sms_type);
CREATE INDEX IF NOT EXISTS idx_sms_deliveries_delivery_status ON sms_deliveries(delivery_status);
CREATE INDEX IF NOT EXISTS idx_sms_deliveries_sent_at ON sms_deliveries(sent_at);

CREATE INDEX IF NOT EXISTS idx_twilio_webhook_logs_webhook_type ON twilio_webhook_logs(webhook_type);
CREATE INDEX IF NOT EXISTS idx_twilio_webhook_logs_room_sid ON twilio_webhook_logs(room_sid);
CREATE INDEX IF NOT EXISTS idx_twilio_webhook_logs_recording_sid ON twilio_webhook_logs(recording_sid);
CREATE INDEX IF NOT EXISTS idx_twilio_webhook_logs_message_sid ON twilio_webhook_logs(message_sid);
CREATE INDEX IF NOT EXISTS idx_twilio_webhook_logs_processed_at ON twilio_webhook_logs(processed_at);

-- Add phone number indexes
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
CREATE INDEX IF NOT EXISTS idx_consultants_phone ON consultants(phone);

-- Enable RLS for new tables
ALTER TABLE email_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE twilio_webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for email deliveries
CREATE POLICY "Users can view their own email deliveries" ON email_deliveries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all email deliveries" ON email_deliveries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- RLS policies for SMS deliveries
CREATE POLICY "Users can view their own SMS deliveries" ON sms_deliveries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all SMS deliveries" ON sms_deliveries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- RLS policies for webhook logs (admin only)
CREATE POLICY "Admins can view webhook logs" ON twilio_webhook_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Comments for documentation
COMMENT ON COLUMN consultation_sessions.twilio_room_sid IS 'Twilio Video room SID for this session';
COMMENT ON COLUMN consultation_sessions.twilio_room_name IS 'Twilio Video room name (emdr-session-{id})';
COMMENT ON COLUMN consultation_sessions.video_session_status IS 'Current status of the Twilio video session';
COMMENT ON COLUMN consultation_sessions.recording_sid IS 'Twilio recording SID if session is being recorded';
COMMENT ON COLUMN consultation_sessions.recording_status IS 'Current status of session recording';
COMMENT ON COLUMN consultation_sessions.recording_url IS 'URL to download the session recording';
COMMENT ON COLUMN consultation_sessions.session_start_time IS 'Actual start time of the video session';
COMMENT ON COLUMN consultation_sessions.session_end_time IS 'Actual end time of the video session';

COMMENT ON TABLE email_deliveries IS 'Tracking table for SendGrid email delivery status';
COMMENT ON TABLE sms_deliveries IS 'Tracking table for Twilio SMS delivery status';
COMMENT ON TABLE twilio_webhook_logs IS 'Log of all Twilio webhook events for debugging and monitoring';

COMMENT ON COLUMN users.phone_number IS 'User phone number for SMS notifications and 2FA';
COMMENT ON COLUMN users.phone_verified IS 'Whether the phone number has been verified';
COMMENT ON COLUMN students.phone IS 'Student phone number for session notifications';
COMMENT ON COLUMN consultants.phone IS 'Consultant phone number for session notifications';

-- Function to calculate session duration automatically
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- If session_end_time is being set and session_start_time exists
  IF NEW.session_end_time IS NOT NULL AND NEW.session_start_time IS NOT NULL THEN
    -- Calculate duration in minutes
    NEW.actual_duration := EXTRACT(EPOCH FROM (NEW.session_end_time - NEW.session_start_time)) / 60;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate session duration
DROP TRIGGER IF EXISTS trigger_calculate_session_duration ON consultation_sessions;
CREATE TRIGGER trigger_calculate_session_duration
  BEFORE UPDATE ON consultation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_session_duration();
