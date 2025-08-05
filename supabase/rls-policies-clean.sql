-- =====================================================
-- CLEAN RLS POLICIES DEPLOYMENT
-- BrainBased EMDR Platform
-- =====================================================

-- First, drop all existing policies to avoid conflicts
-- Users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Only admins can manage user roles" ON users;

-- Students table policies
DROP POLICY IF EXISTS "Students can view own student profile" ON students;
DROP POLICY IF EXISTS "Students can update own student profile" ON students;
DROP POLICY IF EXISTS "Consultants can view assigned student profiles" ON students;
DROP POLICY IF EXISTS "Admins can manage all student profiles" ON students;

-- Consultants table policies
DROP POLICY IF EXISTS "Consultants can view own consultant profile" ON consultants;
DROP POLICY IF EXISTS "Consultants can update own consultant profile" ON consultants;
DROP POLICY IF EXISTS "Students can view consultant profiles" ON consultants;
DROP POLICY IF EXISTS "Admins can manage all consultant profiles" ON consultants;

-- Consultation sessions table policies
DROP POLICY IF EXISTS "Students can view own consultation sessions" ON consultation_sessions;
DROP POLICY IF EXISTS "Students can create consultation sessions" ON consultation_sessions;
DROP POLICY IF EXISTS "Students can update own sessions" ON consultation_sessions;
DROP POLICY IF EXISTS "Consultants can view assigned sessions" ON consultation_sessions;
DROP POLICY IF EXISTS "Consultants can update assigned sessions" ON consultation_sessions;
DROP POLICY IF EXISTS "Admins can manage all consultation sessions" ON consultation_sessions;

-- Certifications table policies
DROP POLICY IF EXISTS "Students can view own certifications" ON certifications;
DROP POLICY IF EXISTS "Students can create certifications" ON certifications;
DROP POLICY IF EXISTS "Students can update own certifications" ON certifications;
DROP POLICY IF EXISTS "Consultants can view assigned certifications" ON certifications;
DROP POLICY IF EXISTS "Consultants can update assigned certifications" ON certifications;
DROP POLICY IF EXISTS "Admins can manage all certifications" ON certifications;

-- Consultant availability table policies
DROP POLICY IF EXISTS "Consultants can manage own availability" ON consultant_availability;
DROP POLICY IF EXISTS "Students can view consultant availability" ON consultant_availability;
DROP POLICY IF EXISTS "Admins can view all availability" ON consultant_availability;

-- Notifications table policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Payments table policies
DROP POLICY IF EXISTS "Students can view own payments" ON payments;
DROP POLICY IF EXISTS "Students can create payments" ON payments;
DROP POLICY IF EXISTS "Consultants can view session payments" ON payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON payments;

-- Student documents table policies
DROP POLICY IF EXISTS "Students can view own documents" ON student_documents;
DROP POLICY IF EXISTS "Students can create own documents" ON student_documents;
DROP POLICY IF EXISTS "Students can update own documents" ON student_documents;
DROP POLICY IF EXISTS "Students can delete own documents" ON student_documents;
DROP POLICY IF EXISTS "Consultants can view assigned documents" ON student_documents;
DROP POLICY IF EXISTS "Consultants can update assigned documents" ON student_documents;
DROP POLICY IF EXISTS "Admins can manage all documents" ON student_documents;

-- Video sessions table policies
DROP POLICY IF EXISTS "Students can view own video sessions" ON video_sessions;
DROP POLICY IF EXISTS "Students can create video sessions" ON video_sessions;
DROP POLICY IF EXISTS "Students can update own video sessions" ON video_sessions;
DROP POLICY IF EXISTS "Consultants can view assigned video sessions" ON video_sessions;
DROP POLICY IF EXISTS "Consultants can update assigned video sessions" ON video_sessions;
DROP POLICY IF EXISTS "Admins can manage all video sessions" ON video_sessions;

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (
        auth.uid() = id
    );

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (
        auth.uid() = id
    ) WITH CHECK (
        auth.uid() = id
    );

-- Only admins can manage user roles
CREATE POLICY "Only admins can manage user roles" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- =====================================================
-- STUDENTS TABLE POLICIES
-- =====================================================

-- Students can view their own student profile
CREATE POLICY "Students can view own student profile" ON students
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Students can update their own student profile
CREATE POLICY "Students can update own student profile" ON students
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Consultants can view student profiles they're assigned to
CREATE POLICY "Consultants can view assigned student profiles" ON students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            JOIN consultants c ON cs.consultant_id = c.id
            WHERE c.user_id = auth.uid()
            AND cs.student_id = students.id
        )
    );

-- Admins can view and manage all student profiles
CREATE POLICY "Admins can manage all student profiles" ON students
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- CONSULTANTS TABLE POLICIES
-- =====================================================

-- Consultants can view their own consultant profile
CREATE POLICY "Consultants can view own consultant profile" ON consultants
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Consultants can update their own consultant profile
CREATE POLICY "Consultants can update own consultant profile" ON consultants
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Students can view consultant profiles for booking
CREATE POLICY "Students can view consultant profiles" ON consultants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'student'
        )
    );

-- Admins can view and manage all consultant profiles
CREATE POLICY "Admins can manage all consultant profiles" ON consultants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- CONSULTATION_SESSIONS TABLE POLICIES
-- =====================================================

-- Students can view their own consultation sessions
CREATE POLICY "Students can view own consultation sessions" ON consultation_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = consultation_sessions.student_id
        )
    );

-- Students can create consultation session requests
CREATE POLICY "Students can create consultation sessions" ON consultation_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = consultation_sessions.student_id
        )
    );

-- Students can update their own sessions (before they start)
CREATE POLICY "Students can update own sessions" ON consultation_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = consultation_sessions.student_id
        )
        AND consultation_sessions.status = 'scheduled'
    );

-- Consultants can view sessions they're assigned to
CREATE POLICY "Consultants can view assigned sessions" ON consultation_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM consultants c
            WHERE c.user_id = auth.uid()
            AND c.id = consultation_sessions.consultant_id
        )
    );

-- Consultants can update sessions they're leading
CREATE POLICY "Consultants can update assigned sessions" ON consultation_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM consultants c
            WHERE c.user_id = auth.uid()
            AND c.id = consultation_sessions.consultant_id
        )
    );

-- Admins can view and manage all consultation sessions
CREATE POLICY "Admins can manage all consultation sessions" ON consultation_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- CERTIFICATIONS TABLE POLICIES
-- =====================================================

-- Students can view their own certifications
CREATE POLICY "Students can view own certifications" ON certifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = certifications.student_id
        )
    );

-- Students can create certification requests
CREATE POLICY "Students can create certifications" ON certifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = certifications.student_id
        )
    );

-- Students can update their own certification requests (before approval)
CREATE POLICY "Students can update own certifications" ON certifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = certifications.student_id
        )
        AND certifications.status = 'pending'
    );

-- Consultants can view certifications for students they're assigned to
CREATE POLICY "Consultants can view assigned certifications" ON certifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            JOIN consultants c ON cs.consultant_id = c.id
            WHERE c.user_id = auth.uid()
            AND cs.student_id = certifications.student_id
        )
    );

-- Consultants can update certifications they're responsible for
CREATE POLICY "Consultants can update assigned certifications" ON certifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            JOIN consultants c ON cs.consultant_id = c.id
            WHERE c.user_id = auth.uid()
            AND cs.student_id = certifications.student_id
        )
    );

-- Admins can view and manage all certifications
CREATE POLICY "Admins can manage all certifications" ON certifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- CONSULTANT_AVAILABILITY TABLE POLICIES
-- =====================================================

-- Consultants can manage their own availability
CREATE POLICY "Consultants can manage own availability" ON consultant_availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM consultants c
            WHERE c.user_id = auth.uid()
            AND c.id = consultant_availability.consultant_id
        )
    );

-- Students can view consultant availability for booking
CREATE POLICY "Students can view consultant availability" ON consultant_availability
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'student'
        )
    );

-- Admins can view all availability for management
CREATE POLICY "Admins can view all availability" ON consultant_availability
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- NOTIFICATIONS TABLE POLICIES
-- =====================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- System can create notifications (using service role)
CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role'
    );

-- =====================================================
-- PAYMENTS TABLE POLICIES
-- =====================================================

-- Students can view their own payments
CREATE POLICY "Students can view own payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            JOIN students s ON cs.student_id = s.id
            WHERE s.user_id = auth.uid()
            AND cs.id = payments.session_id
        )
    );

-- Students can create payment records
CREATE POLICY "Students can create payments" ON payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            JOIN students s ON cs.student_id = s.id
            WHERE s.user_id = auth.uid()
            AND cs.id = payments.session_id
        )
    );

-- Consultants can view payments for their sessions
CREATE POLICY "Consultants can view session payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            JOIN consultants c ON cs.consultant_id = c.id
            WHERE c.user_id = auth.uid()
            AND cs.id = payments.session_id
        )
    );

-- Admins can view and manage all payments
CREATE POLICY "Admins can manage all payments" ON payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- STUDENT_DOCUMENTS TABLE POLICIES
-- =====================================================

-- Students can view their own documents
CREATE POLICY "Students can view own documents" ON student_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = student_documents.student_id
        )
    );

-- Students can upload their own documents
CREATE POLICY "Students can create own documents" ON student_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = student_documents.student_id
        )
    );

-- Students can update their own documents (before review)
CREATE POLICY "Students can update own documents" ON student_documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = student_documents.student_id
        )
        AND student_documents.status = 'pending'
    );

-- Students can delete their own documents (before review)
CREATE POLICY "Students can delete own documents" ON student_documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = student_documents.student_id
        )
        AND student_documents.status = 'pending'
    );

-- Consultants can view documents for students they're assigned to
CREATE POLICY "Consultants can view assigned documents" ON student_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            JOIN consultants c ON cs.consultant_id = c.id
            WHERE c.user_id = auth.uid()
            AND cs.student_id = student_documents.student_id
        )
    );

-- Consultants can update documents they're reviewing
CREATE POLICY "Consultants can update assigned documents" ON student_documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            JOIN consultants c ON cs.consultant_id = c.id
            WHERE c.user_id = auth.uid()
            AND cs.student_id = student_documents.student_id
        )
    );

-- Admins can view and manage all documents
CREATE POLICY "Admins can manage all documents" ON student_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- VIDEO_SESSIONS TABLE POLICIES
-- =====================================================

-- Students can view their own video sessions
CREATE POLICY "Students can view own video sessions" ON video_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            JOIN students s ON cs.student_id = s.id
            WHERE s.user_id = auth.uid()
            AND cs.video_session_id = video_sessions.id
        )
    );

-- Students can create video session records
CREATE POLICY "Students can create video sessions" ON video_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            JOIN students s ON cs.student_id = s.id
            WHERE s.user_id = auth.uid()
            AND cs.video_session_id = video_sessions.id
        )
    );

-- Students can update their own video sessions
CREATE POLICY "Students can update own video sessions" ON video_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            JOIN students s ON cs.student_id = s.id
            WHERE s.user_id = auth.uid()
            AND cs.video_session_id = video_sessions.id
        )
    );

-- Consultants can view video sessions they're involved in
CREATE POLICY "Consultants can view assigned video sessions" ON video_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            JOIN consultants c ON cs.consultant_id = c.id
            WHERE c.user_id = auth.uid()
            AND cs.video_session_id = video_sessions.id
        )
    );

-- Consultants can update video sessions they're leading
CREATE POLICY "Consultants can update assigned video sessions" ON video_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            JOIN consultants c ON cs.consultant_id = c.id
            WHERE c.user_id = auth.uid()
            AND cs.video_session_id = video_sessions.id
        )
    );

-- Admins can view and manage all video sessions
CREATE POLICY "Admins can manage all video sessions" ON video_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT 'RLS policies successfully deployed!' as status; 