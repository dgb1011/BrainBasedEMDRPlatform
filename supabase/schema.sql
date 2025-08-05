-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'consultant', 'admin')),
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students table
CREATE TABLE students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  phone TEXT,
  timezone TEXT DEFAULT 'UTC',
  course_completion_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_verified_hours DECIMAL(5,2) DEFAULT 0,
  certification_status TEXT DEFAULT 'in_progress' CHECK (certification_status IN ('in_progress', 'completed', 'pending')),
  preferred_session_length INTEGER DEFAULT 60,
  consultation_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consultants table
CREATE TABLE consultants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  license_number TEXT NOT NULL,
  specializations TEXT[] DEFAULT '{}',
  hourly_rate DECIMAL(8,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  bio TEXT,
  years_experience INTEGER DEFAULT 0,
  total_hours_completed DECIMAL(8,2) DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 5.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consultation sessions table
CREATE TABLE consultation_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE NOT NULL,
  video_session_id UUID,
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
  session_type TEXT DEFAULT 'consultation' CHECK (session_type IN ('consultation', 'practice', 'supervision')),
  notes TEXT,
  hours_towards_consultation DECIMAL(3,2) DEFAULT 0,
  consultant_feedback TEXT,
  student_reflection TEXT,
  student_evaluation_score INTEGER CHECK (student_evaluation_score >= 1 AND student_evaluation_score <= 5),
  consultant_evaluation_score INTEGER CHECK (consultant_evaluation_score >= 1 AND consultant_evaluation_score <= 5),
  is_verified BOOLEAN DEFAULT false,
  recording_url TEXT,
  technical_issues_reported BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video sessions table
CREATE TABLE video_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id TEXT UNIQUE NOT NULL,
  recording_enabled BOOLEAN DEFAULT false,
  recording_url TEXT,
  recording_duration_seconds INTEGER,
  video_quality TEXT DEFAULT '720p',
  connection_quality_avg DECIMAL(3,2),
  technical_issues JSONB,
  session_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student documents table
CREATE TABLE student_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('case_study', 'reflection', 'certification_request', 'other')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  reviewer_id UUID REFERENCES consultants(id),
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Certifications table
CREATE TABLE certifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  certification_number TEXT UNIQUE NOT NULL,
  issued_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  total_hours_completed DECIMAL(5,2) NOT NULL,
  issued_by UUID REFERENCES consultants(id),
  certificate_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consultant availability table
CREATE TABLE consultant_availability (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(consultant_id, day_of_week, start_time, end_time)
);

-- Payments table
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES consultation_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  related_entity_type TEXT,
  related_entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_consultants_user_id ON consultants(user_id);
CREATE INDEX idx_consultation_sessions_student_id ON consultation_sessions(student_id);
CREATE INDEX idx_consultation_sessions_consultant_id ON consultation_sessions(consultant_id);
CREATE INDEX idx_consultation_sessions_scheduled_start ON consultation_sessions(scheduled_start);
CREATE INDEX idx_consultation_sessions_status ON consultation_sessions(status);
CREATE INDEX idx_student_documents_student_id ON student_documents(student_id);
CREATE INDEX idx_student_documents_status ON student_documents(status);
CREATE INDEX idx_certifications_student_id ON certifications(student_id);
CREATE INDEX idx_consultant_availability_consultant_id ON consultant_availability(consultant_id);
CREATE INDEX idx_payments_session_id ON payments(session_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consultants_updated_at BEFORE UPDATE ON consultants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consultation_sessions_updated_at BEFORE UPDATE ON consultation_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_documents_updated_at BEFORE UPDATE ON student_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_certifications_updated_at BEFORE UPDATE ON certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consultant_availability_updated_at BEFORE UPDATE ON consultant_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Students can view their own data
CREATE POLICY "Students can view own data" ON students
  FOR SELECT USING (auth.uid() = user_id);

-- Students can update their own data
CREATE POLICY "Students can update own data" ON students
  FOR UPDATE USING (auth.uid() = user_id);

-- Consultants can view their own data
CREATE POLICY "Consultants can view own data" ON consultants
  FOR SELECT USING (auth.uid() = user_id);

-- Consultants can update their own data
CREATE POLICY "Consultants can update own data" ON consultants
  FOR UPDATE USING (auth.uid() = user_id);

-- Students can view their own sessions
CREATE POLICY "Students can view own sessions" ON consultation_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students WHERE students.user_id = auth.uid() AND students.id = consultation_sessions.student_id
    )
  );

-- Consultants can view sessions they're involved in
CREATE POLICY "Consultants can view own sessions" ON consultation_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM consultants WHERE consultants.user_id = auth.uid() AND consultants.id = consultation_sessions.consultant_id
    )
  );

-- Admins can view all data
CREATE POLICY "Admins can view all data" ON users FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Admins can view all students" ON students FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Admins can view all consultants" ON consultants FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Admins can view all sessions" ON consultation_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Insert function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile when auth user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 