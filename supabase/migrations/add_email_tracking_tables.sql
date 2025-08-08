-- Email tracking and scheduling tables

-- Email logs table for tracking all email activity
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL, -- sent, failed, opened, clicked, bounced
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  message_id VARCHAR(255),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled emails table for deferred sending
CREATE TABLE IF NOT EXISTS scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- session_reminder, milestone_notification, etc.
  recipient_email VARCHAR(255) NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email templates table for managing email content
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB DEFAULT '[]', -- List of required variables
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_event_type ON email_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_sent ON scheduled_emails(sent);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_type ON scheduled_emails(type);

CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active);

-- Add comments for documentation
COMMENT ON TABLE email_logs IS 'Tracks all email sending activity and events';
COMMENT ON TABLE scheduled_emails IS 'Queue for emails to be sent at a future time';
COMMENT ON TABLE email_templates IS 'Reusable email templates with variable substitution';

COMMENT ON COLUMN email_logs.event_type IS 'Type of email event (sent, failed, opened, clicked, bounced)';
COMMENT ON COLUMN scheduled_emails.type IS 'Type of scheduled email for processing';
COMMENT ON COLUMN email_templates.variables IS 'JSON array of required variables for template substitution';
