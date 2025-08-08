-- Video conferencing related tables

-- Video rooms table
CREATE TABLE IF NOT EXISTS video_rooms (
  id VARCHAR(255) PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES consultation_sessions(id),
  created_by UUID NOT NULL REFERENCES users(id),
  ice_servers JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(50) NOT NULL DEFAULT 'waiting', -- waiting, active, ended
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  CONSTRAINT valid_status CHECK (status IN ('waiting', 'active', 'ended'))
);

-- Session recordings table
CREATE TABLE IF NOT EXISTS session_recordings (
  id VARCHAR(255) PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL REFERENCES video_rooms(id),
  session_id UUID NOT NULL REFERENCES consultation_sessions(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  file_url TEXT,
  file_size_bytes BIGINT,
  duration_seconds INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'recording', -- recording, processing, completed, failed
  metadata JSONB DEFAULT '{}',
  CONSTRAINT valid_recording_status CHECK (status IN ('recording', 'processing', 'completed', 'failed'))
);

-- Session attendance table for automatic tracking
CREATE TABLE IF NOT EXISTS session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES consultation_sessions(id),
  student_id UUID NOT NULL REFERENCES students(id),
  consultant_id UUID NOT NULL REFERENCES consultants(id),
  video_room_id VARCHAR(255) REFERENCES video_rooms(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  auto_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_session_attendance UNIQUE (session_id, student_id, consultant_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_rooms_session_id ON video_rooms(session_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_status ON video_rooms(status);
CREATE INDEX IF NOT EXISTS idx_video_rooms_created_at ON video_rooms(created_at);

CREATE INDEX IF NOT EXISTS idx_session_recordings_room_id ON session_recordings(room_id);
CREATE INDEX IF NOT EXISTS idx_session_recordings_session_id ON session_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_session_recordings_status ON session_recordings(status);

CREATE INDEX IF NOT EXISTS idx_session_attendance_session_id ON session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_student_id ON session_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_consultant_id ON session_attendance(consultant_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_video_room_id ON session_attendance(video_room_id);

-- Add actual_duration_minutes column to consultation_sessions if not exists
ALTER TABLE consultation_sessions 
ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER;

-- Add total_consultation_hours column to students if not exists
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS total_consultation_hours DECIMAL(5,2) DEFAULT 0;

-- Add certification_completed_at column to students if not exists
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS certification_completed_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON TABLE video_rooms IS 'Video conference rooms for consultation sessions';
COMMENT ON TABLE session_recordings IS 'Recordings of video consultation sessions';
COMMENT ON TABLE session_attendance IS 'Automatic attendance tracking for video sessions';

COMMENT ON COLUMN video_rooms.ice_servers IS 'ICE servers configuration for WebRTC';
COMMENT ON COLUMN video_rooms.status IS 'Current status of the video room';
COMMENT ON COLUMN session_recordings.status IS 'Current status of the recording';
COMMENT ON COLUMN session_attendance.auto_verified IS 'Whether attendance was automatically verified through video session';
