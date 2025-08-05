-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- BrainBased EMDR Platform
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CERTIFICATIONS TABLE POLICIES
-- =====================================================

-- Students can view their own certifications
CREATE POLICY "Students can view own certifications" ON certifications
    FOR SELECT USING (
        auth.uid() = student_id
    );

-- Students can create certification requests
CREATE POLICY "Students can create certifications" ON certifications
    FOR INSERT WITH CHECK (
        auth.uid() = student_id
    );

-- Students can update their own certification requests (before approval)
CREATE POLICY "Students can update own certifications" ON certifications
    FOR UPDATE USING (
        auth.uid() = student_id AND status = 'pending'
    );

-- Consultants can view certifications for students they're assigned to
CREATE POLICY "Consultants can view assigned certifications" ON certifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            WHERE cs.consultant_id = auth.uid()
            AND cs.student_id = certifications.student_id
        )
    );

-- Consultants can update certifications they're responsible for
CREATE POLICY "Consultants can update assigned certifications" ON certifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            WHERE cs.consultant_id = auth.uid()
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
        auth.uid() = consultant_id
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
        auth.uid() = student_id
    );

-- Students can create payment records
CREATE POLICY "Students can create payments" ON payments
    FOR INSERT WITH CHECK (
        auth.uid() = student_id
    );

-- Consultants can view payments for their sessions
CREATE POLICY "Consultants can view session payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            WHERE cs.consultant_id = auth.uid()
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
        auth.uid() = student_id
    );

-- Students can upload their own documents
CREATE POLICY "Students can create own documents" ON student_documents
    FOR INSERT WITH CHECK (
        auth.uid() = student_id
    );

-- Students can update their own documents (before review)
CREATE POLICY "Students can update own documents" ON student_documents
    FOR UPDATE USING (
        auth.uid() = student_id AND status = 'pending'
    );

-- Students can delete their own documents (before review)
CREATE POLICY "Students can delete own documents" ON student_documents
    FOR DELETE USING (
        auth.uid() = student_id AND status = 'pending'
    );

-- Consultants can view documents for students they're assigned to
CREATE POLICY "Consultants can view assigned documents" ON student_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            WHERE cs.consultant_id = auth.uid()
            AND cs.student_id = student_documents.student_id
        )
    );

-- Consultants can update documents they're reviewing
CREATE POLICY "Consultants can update assigned documents" ON student_documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM consultation_sessions cs
            WHERE cs.consultant_id = auth.uid()
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
        auth.uid() = student_id
    );

-- Students can create video session records
CREATE POLICY "Students can create video sessions" ON video_sessions
    FOR INSERT WITH CHECK (
        auth.uid() = student_id
    );

-- Students can update their own video sessions
CREATE POLICY "Students can update own video sessions" ON video_sessions
    FOR UPDATE USING (
        auth.uid() = student_id
    );

-- Consultants can view video sessions they're involved in
CREATE POLICY "Consultants can view assigned video sessions" ON video_sessions
    FOR SELECT USING (
        auth.uid() = consultant_id
    );

-- Consultants can update video sessions they're leading
CREATE POLICY "Consultants can update assigned video sessions" ON video_sessions
    FOR UPDATE USING (
        auth.uid() = consultant_id
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
-- ADDITIONAL SECURITY POLICIES
-- =====================================================

-- Prevent users from accessing other users' data
CREATE POLICY "Users can only access own user data" ON users
    FOR SELECT USING (
        auth.uid() = id
    );

-- Only admins can create/update user roles
CREATE POLICY "Only admins can manage user roles" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- =====================================================
-- AUDIT TRAIL FUNCTION
-- =====================================================

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    event_type TEXT,
    table_name TEXT,
    record_id UUID,
    user_id UUID,
    details JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
    INSERT INTO security_audit_log (
        event_type,
        table_name,
        record_id,
        user_id,
        details,
        created_at
    ) VALUES (
        event_type,
        table_name,
        record_id,
        user_id,
        details,
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLICY COMMENTS
-- =====================================================

COMMENT ON POLICY "Students can view own certifications" ON certifications IS 'Students can only view their own certification records';
COMMENT ON POLICY "Consultants can view assigned certifications" ON certifications IS 'Consultants can view certifications for students they are assigned to';
COMMENT ON POLICY "Admins can manage all certifications" ON certifications IS 'Admins have full access to all certification records';

COMMENT ON POLICY "Consultants can manage own availability" ON consultant_availability IS 'Consultants can manage their own availability schedules';
COMMENT ON POLICY "Students can view consultant availability" ON consultant_availability IS 'Students can view consultant availability for booking purposes';

COMMENT ON POLICY "Users can view own notifications" ON notifications IS 'Users can only view their own notifications';
COMMENT ON POLICY "System can create notifications" ON notifications IS 'System can create notifications using service role';

COMMENT ON POLICY "Students can view own payments" ON payments IS 'Students can view their own payment records';
COMMENT ON POLICY "Admins can manage all payments" ON payments IS 'Admins have full access to all payment records';

COMMENT ON POLICY "Students can view own documents" ON student_documents IS 'Students can view their own uploaded documents';
COMMENT ON POLICY "Consultants can view assigned documents" ON student_documents IS 'Consultants can view documents for students they are assigned to';

COMMENT ON POLICY "Students can view own video sessions" ON video_sessions IS 'Students can view their own video session records';
COMMENT ON POLICY "Consultants can view assigned video sessions" ON video_sessions IS 'Consultants can view video sessions they are involved in'; 