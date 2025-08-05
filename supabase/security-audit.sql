-- =====================================================
-- SECURITY AUDIT LOG TABLE
-- =====================================================

-- Create security audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" ON security_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON security_audit_log
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role'
    );

-- Create indexes for performance
CREATE INDEX idx_security_audit_user_id ON security_audit_log(user_id);
CREATE INDEX idx_security_audit_event_type ON security_audit_log(event_type);
CREATE INDEX idx_security_audit_created_at ON security_audit_log(created_at);
CREATE INDEX idx_security_audit_table_name ON security_audit_log(table_name);

-- =====================================================
-- SECURITY FUNCTIONS
-- =====================================================

-- Function to get current user's IP address
CREATE OR REPLACE FUNCTION get_client_ip() RETURNS INET AS $$
BEGIN
    RETURN inet_client_addr();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's user agent
CREATE OR REPLACE FUNCTION get_user_agent() RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('request.headers', true)::json->>'user-agent';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced security event logging function
CREATE OR REPLACE FUNCTION log_security_event_enhanced(
    event_type TEXT,
    table_name TEXT,
    record_id UUID DEFAULT NULL,
    details JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
    INSERT INTO security_audit_log (
        event_type,
        table_name,
        record_id,
        user_id,
        details,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        event_type,
        table_name,
        record_id,
        auth.uid(),
        details,
        get_client_ip(),
        get_user_agent(),
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC AUDIT LOGGING
-- =====================================================

-- Function to automatically log data access
CREATE OR REPLACE FUNCTION audit_data_access() RETURNS TRIGGER AS $$
BEGIN
    -- Log the access event
    PERFORM log_security_event_enhanced(
        'data_access',
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'operation', TG_OP,
            'old_data', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END,
            'new_data', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE '{}'::jsonb END
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_certifications_access
    AFTER INSERT OR UPDATE OR DELETE ON certifications
    FOR EACH ROW EXECUTE FUNCTION audit_data_access();

CREATE TRIGGER audit_student_documents_access
    AFTER INSERT OR UPDATE OR DELETE ON student_documents
    FOR EACH ROW EXECUTE FUNCTION audit_data_access();

CREATE TRIGGER audit_video_sessions_access
    AFTER INSERT OR UPDATE OR DELETE ON video_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_data_access();

CREATE TRIGGER audit_payments_access
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION audit_data_access();

-- =====================================================
-- SECURITY VIEWS FOR ADMINS
-- =====================================================

-- View for recent security events
CREATE OR REPLACE VIEW recent_security_events AS
SELECT 
    sal.event_type,
    sal.table_name,
    sal.record_id,
    u.email as user_email,
    u.role as user_role,
    sal.ip_address,
    sal.created_at,
    sal.details
FROM security_audit_log sal
LEFT JOIN users u ON sal.user_id = u.id
WHERE sal.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY sal.created_at DESC;

-- Grant access to admins only
REVOKE ALL ON recent_security_events FROM PUBLIC;
GRANT SELECT ON recent_security_events TO authenticated;

-- =====================================================
-- SECURITY MONITORING FUNCTIONS
-- =====================================================

-- Function to check for suspicious activity
CREATE OR REPLACE FUNCTION check_suspicious_activity() RETURNS TABLE(
    user_id UUID,
    user_email TEXT,
    event_count BIGINT,
    time_period TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sal.user_id,
        u.email,
        COUNT(*) as event_count,
        'last_hour' as time_period
    FROM security_audit_log sal
    JOIN users u ON sal.user_id = u.id
    WHERE sal.created_at >= NOW() - INTERVAL '1 hour'
    GROUP BY sal.user_id, u.email
    HAVING COUNT(*) > 100; -- Threshold for suspicious activity
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get failed authentication attempts
CREATE OR REPLACE FUNCTION get_failed_auth_attempts() RETURNS TABLE(
    ip_address INET,
    attempt_count BIGINT,
    last_attempt TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sal.ip_address,
        COUNT(*) as attempt_count,
        MAX(sal.created_at) as last_attempt
    FROM security_audit_log sal
    WHERE sal.event_type = 'auth_failed'
    AND sal.created_at >= NOW() - INTERVAL '1 hour'
    GROUP BY sal.ip_address
    HAVING COUNT(*) > 5; -- Threshold for failed attempts
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 