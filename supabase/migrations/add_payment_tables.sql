-- Payment System Database Schema
-- BrainBased EMDR Platform

-- Payment Intents Table
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES consultation_sessions(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending',
  client_secret TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consultant Payments Table
CREATE TABLE IF NOT EXISTS consultant_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES consultation_sessions(id) ON DELETE CASCADE,
  consultant_id UUID REFERENCES consultants(user_id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  consultant_fee DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  interval TEXT DEFAULT 'monthly' CHECK (interval IN ('monthly', 'yearly')),
  features JSONB DEFAULT '[]',
  stripe_price_id TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  max_consultations INTEGER,
  max_hours INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Subscriptions Table
CREATE TABLE IF NOT EXISTS customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refunds Table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES consultation_sessions(id) ON DELETE CASCADE,
  stripe_refund_id TEXT UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT DEFAULT 'customer_request',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Stripe Connect Accounts Table (for consultants)
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID REFERENCES consultants(user_id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_status TEXT DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'restricted')),
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  requirements JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add payment fields to consultation_sessions table
ALTER TABLE consultation_sessions 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'none' CHECK (refund_status IN ('none', 'pending', 'processed', 'failed')),
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMP WITH TIME ZONE;

-- Add Stripe fields to consultants table
ALTER TABLE consultants 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '[]';

-- Add Stripe fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS default_payment_method_id TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_intents_session_id ON payment_intents(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_stripe_id ON payment_intents(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_consultant_payments_consultant_id ON consultant_payments(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_payments_session_id ON consultant_payments(session_id);
CREATE INDEX IF NOT EXISTS idx_consultant_payments_status ON consultant_payments(status);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_customer_id ON customer_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_status ON customer_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_refunds_session_id ON refunds(session_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_consultant_id ON stripe_connect_accounts(consultant_id);

-- Row Level Security Policies

-- Payment Intents RLS
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment intents" ON payment_intents
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM consultation_sessions 
      WHERE student_id = auth.uid() OR consultant_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payment intents" ON payment_intents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Consultant Payments RLS
ALTER TABLE consultant_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consultants can view their own payments" ON consultant_payments
  FOR SELECT USING (consultant_id = auth.uid());

CREATE POLICY "Admins can view all consultant payments" ON consultant_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Customer Subscriptions RLS
ALTER TABLE customer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions" ON customer_subscriptions
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions" ON customer_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Refunds RLS
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view refunds for their sessions" ON refunds
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM consultation_sessions 
      WHERE student_id = auth.uid() OR consultant_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all refunds" ON refunds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Stripe Connect Accounts RLS
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consultants can view their own connect accounts" ON stripe_connect_accounts
  FOR SELECT USING (consultant_id = auth.uid());

CREATE POLICY "Admins can view all connect accounts" ON stripe_connect_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Functions for payment processing

-- Function to calculate consultant earnings
CREATE OR REPLACE FUNCTION calculate_consultant_earnings(
  consultant_uuid UUID,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  total_earnings DECIMAL(10,2),
  completed_sessions INTEGER,
  pending_payments INTEGER,
  platform_fees DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(cp.amount), 0) as total_earnings,
    COUNT(CASE WHEN cp.status = 'completed' THEN 1 END) as completed_sessions,
    COUNT(CASE WHEN cp.status = 'pending' THEN 1 END) as pending_payments,
    COALESCE(SUM(cp.platform_fee), 0) as platform_fees
  FROM consultant_payments cp
  WHERE cp.consultant_id = consultant_uuid
    AND (start_date IS NULL OR cp.created_at >= start_date)
    AND (end_date IS NULL OR cp.created_at <= end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update payment status
CREATE OR REPLACE FUNCTION update_payment_status(
  session_uuid UUID,
  new_status TEXT,
  payment_intent_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE consultation_sessions 
  SET 
    payment_status = new_status,
    payment_completed_at = CASE WHEN new_status = 'completed' THEN NOW() ELSE payment_completed_at END,
    payment_failed_at = CASE WHEN new_status = 'failed' THEN NOW() ELSE payment_failed_at END,
    stripe_payment_intent_id = COALESCE(payment_intent_id, stripe_payment_intent_id),
    updated_at = NOW()
  WHERE id = session_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price, interval, features, stripe_price_id) VALUES
('Basic Plan', 'Essential consultation tracking', 29.99, 'monthly', '["Up to 10 consultations per month", "Basic reporting", "Email support"]', 'price_basic_monthly'),
('Professional Plan', 'Full consultation management', 79.99, 'monthly', '["Unlimited consultations", "Advanced reporting", "Priority support", "Certificate generation"]', 'price_professional_monthly'),
('Enterprise Plan', 'Complete platform access', 199.99, 'monthly', '["Everything in Professional", "Custom integrations", "Dedicated support", "White-label options"]', 'price_enterprise_monthly')
ON CONFLICT (stripe_price_id) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_payment_intents_updated_at BEFORE UPDATE ON payment_intents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultant_payments_updated_at BEFORE UPDATE ON consultant_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_subscriptions_updated_at BEFORE UPDATE ON customer_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_connect_accounts_updated_at BEFORE UPDATE ON stripe_connect_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
