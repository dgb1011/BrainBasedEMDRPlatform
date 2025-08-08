-- Client Integration Schema
-- This enables multi-tenant, self-service Kajabi integration

-- Client configurations table
CREATE TABLE IF NOT EXISTS client_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(255) UNIQUE NOT NULL,
  domain VARCHAR(255),
  kajabi_webhook_url TEXT,
  kajabi_webhook_secret TEXT,
  email_config JSONB DEFAULT '{}',
  integration_status VARCHAR(50) DEFAULT 'not_connected',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client-specific webhooks table
CREATE TABLE IF NOT EXISTS client_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(255) NOT NULL,
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook logs table for tracking client webhook activity
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add client_id to existing tables for multi-tenancy
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS client_id VARCHAR(255);
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS client_id VARCHAR(255);
ALTER TABLE consultation_sessions ADD COLUMN IF NOT EXISTS client_id VARCHAR(255);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_configs_client_id ON client_configs(client_id);
CREATE INDEX IF NOT EXISTS idx_client_webhooks_client_id ON client_webhooks(client_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_client_id ON webhook_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_students_client_id ON students(client_id);
CREATE INDEX IF NOT EXISTS idx_consultants_client_id ON consultants(client_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_client_id ON consultation_sessions(client_id);

-- Add RLS policies for client data isolation
ALTER TABLE client_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_configs
CREATE POLICY "Clients can view their own config" ON client_configs
  FOR SELECT USING (client_id = current_setting('app.client_id', true)::text);

CREATE POLICY "Clients can update their own config" ON client_configs
  FOR UPDATE USING (client_id = current_setting('app.client_id', true)::text);

CREATE POLICY "Clients can insert their own config" ON client_configs
  FOR INSERT WITH CHECK (client_id = current_setting('app.client_id', true)::text);

-- RLS policies for client_webhooks
CREATE POLICY "Clients can view their own webhooks" ON client_webhooks
  FOR SELECT USING (client_id = current_setting('app.client_id', true)::text);

CREATE POLICY "Clients can update their own webhooks" ON client_webhooks
  FOR UPDATE USING (client_id = current_setting('app.client_id', true)::text);

CREATE POLICY "Clients can insert their own webhooks" ON client_webhooks
  FOR INSERT WITH CHECK (client_id = current_setting('app.client_id', true)::text);

-- RLS policies for webhook_logs
CREATE POLICY "Clients can view their own webhook logs" ON webhook_logs
  FOR SELECT USING (client_id = current_setting('app.client_id', true)::text);

CREATE POLICY "Clients can insert their own webhook logs" ON webhook_logs
  FOR INSERT WITH CHECK (client_id = current_setting('app.client_id', true)::text);

-- RLS policies for existing tables with client_id
CREATE POLICY "Clients can view their own users" ON users
  FOR SELECT USING (client_id = current_setting('app.client_id', true)::text);

CREATE POLICY "Clients can view their own students" ON students
  FOR SELECT USING (client_id = current_setting('app.client_id', true)::text);

CREATE POLICY "Clients can view their own consultants" ON consultants
  FOR SELECT USING (client_id = current_setting('app.client_id', true)::text);

CREATE POLICY "Clients can view their own sessions" ON consultation_sessions
  FOR SELECT USING (client_id = current_setting('app.client_id', true)::text);

-- Add comments for documentation
COMMENT ON TABLE client_configs IS 'Client-specific configuration for Kajabi integration and other settings';
COMMENT ON TABLE client_webhooks IS 'Client-specific webhook configurations for Kajabi integration';
COMMENT ON TABLE webhook_logs IS 'Log of all webhook events processed for each client';
COMMENT ON COLUMN users.client_id IS 'Client ID for multi-tenant data isolation';
COMMENT ON COLUMN students.client_id IS 'Client ID for multi-tenant data isolation';
COMMENT ON COLUMN consultants.client_id IS 'Client ID for multi-tenant data isolation';
COMMENT ON COLUMN consultation_sessions.client_id IS 'Client ID for multi-tenant data isolation';
