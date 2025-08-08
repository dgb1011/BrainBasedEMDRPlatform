-- Migration: Add verification fields to consultation_sessions table
-- This migration adds the dual verification system fields

-- Add verification fields to consultation_sessions table
ALTER TABLE consultation_sessions 
ADD COLUMN IF NOT EXISTS student_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consultant_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Add indexes for verification queries
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_student_confirmed 
ON consultation_sessions(student_confirmed);

CREATE INDEX IF NOT EXISTS idx_consultation_sessions_consultant_confirmed 
ON consultation_sessions(consultant_confirmed);

CREATE INDEX IF NOT EXISTS idx_consultation_sessions_verification_date 
ON consultation_sessions(verification_date);

-- Add comments for documentation
COMMENT ON COLUMN consultation_sessions.student_confirmed IS 'Whether the student has confirmed attendance for this session';
COMMENT ON COLUMN consultation_sessions.consultant_confirmed IS 'Whether the consultant has confirmed attendance for this session';
COMMENT ON COLUMN consultation_sessions.verification_date IS 'Date when both parties confirmed attendance and session was verified';
COMMENT ON COLUMN consultation_sessions.verification_notes IS 'Additional notes about the verification process'; 