-- Certificate system and professional directory tables

-- Update certifications table structure
ALTER TABLE certifications 
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(255) UNIQUE;

ALTER TABLE certifications 
ADD COLUMN IF NOT EXISTS qr_code_data TEXT;

ALTER TABLE certifications 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('generating', 'completed', 'failed', 'revoked'));

-- Professional directory table
CREATE TABLE IF NOT EXISTS professional_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE UNIQUE NOT NULL,
  certificate_number VARCHAR(255) NOT NULL,
  is_public BOOLEAN DEFAULT true,
  listing_status VARCHAR(50) DEFAULT 'active' CHECK (listing_status IN ('active', 'inactive', 'pending')),
  bio TEXT,
  specializations TEXT[],
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  website_url VARCHAR(255),
  location_city VARCHAR(100),
  location_state VARCHAR(50),
  location_country VARCHAR(50),
  years_experience INTEGER DEFAULT 0,
  additional_certifications TEXT[],
  languages TEXT[],
  profile_image_url TEXT,
  featured BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Storage buckets for certificates and recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('certificates', 'certificates', true, 52428800, ARRAY['application/pdf', 'text/html']),
  ('session-recordings', 'session-recordings', false, 1073741824, ARRAY['video/webm', 'video/mp4'])
ON CONFLICT (id) DO NOTHING;

-- Update session_recordings table structure
ALTER TABLE session_recordings 
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

ALTER TABLE session_recordings 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_certifications_verification_code ON certifications(verification_code);
CREATE INDEX IF NOT EXISTS idx_certifications_status ON certifications(status);
CREATE INDEX IF NOT EXISTS idx_certifications_student_id ON certifications(student_id);

CREATE INDEX IF NOT EXISTS idx_professional_directory_listing_status ON professional_directory(listing_status);
CREATE INDEX IF NOT EXISTS idx_professional_directory_is_public ON professional_directory(is_public);
CREATE INDEX IF NOT EXISTS idx_professional_directory_location ON professional_directory(location_city, location_state);
CREATE INDEX IF NOT EXISTS idx_professional_directory_featured ON professional_directory(featured);
CREATE INDEX IF NOT EXISTS idx_professional_directory_specializations ON professional_directory USING GIN(specializations);

CREATE INDEX IF NOT EXISTS idx_session_recordings_status ON session_recordings(status);
CREATE INDEX IF NOT EXISTS idx_session_recordings_session_id ON session_recordings(session_id);

-- Add RLS policies for professional directory
ALTER TABLE professional_directory ENABLE ROW LEVEL SECURITY;

-- Public can view active, public listings
CREATE POLICY "Public can view active listings" ON professional_directory
  FOR SELECT USING (is_public = true AND listing_status = 'active');

-- Users can view their own listing
CREATE POLICY "Users can view own listing" ON professional_directory
  FOR SELECT USING (student_id IN (
    SELECT id FROM students WHERE user_id = auth.uid()
  ));

-- Users can update their own listing
CREATE POLICY "Users can update own listing" ON professional_directory
  FOR UPDATE USING (student_id IN (
    SELECT id FROM students WHERE user_id = auth.uid()
  ));

-- Users can insert their own listing
CREATE POLICY "Users can insert own listing" ON professional_directory
  FOR INSERT WITH CHECK (student_id IN (
    SELECT id FROM students WHERE user_id = auth.uid()
  ));

-- Add RLS policies for certificates
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own certificates
CREATE POLICY "Users can view own certificates" ON certifications
  FOR SELECT USING (student_id IN (
    SELECT id FROM students WHERE user_id = auth.uid()
  ));

-- Admins and consultants can view all certificates
CREATE POLICY "Admins can view all certificates" ON certifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'consultant')
    )
  );

-- Add storage policies
CREATE POLICY "Authenticated users can view certificates" ON storage.objects
  FOR SELECT USING (bucket_id = 'certificates' AND auth.role() = 'authenticated');

CREATE POLICY "System can upload certificates" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'certificates' AND auth.role() = 'service_role');

CREATE POLICY "Authorized users can view recordings" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'session-recordings' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "System can manage recordings" ON storage.objects
  FOR ALL USING (bucket_id = 'session-recordings' AND auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE professional_directory IS 'Public directory of certified EMDR professionals';
COMMENT ON COLUMN professional_directory.listing_status IS 'Status of the directory listing';
COMMENT ON COLUMN professional_directory.featured IS 'Whether this listing is featured/promoted';
COMMENT ON COLUMN professional_directory.verified IS 'Whether the professional has been verified';
COMMENT ON COLUMN certifications.verification_code IS 'Unique code for certificate verification';
COMMENT ON COLUMN certifications.qr_code_data IS 'JSON data for QR code generation';
COMMENT ON COLUMN certifications.status IS 'Current status of the certificate';

-- Create a function to update professional directory when certificate is issued
CREATE OR REPLACE FUNCTION update_directory_on_certification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add to directory when certificate status becomes 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO professional_directory (student_id, certificate_number)
    VALUES (NEW.student_id, NEW.certificate_number)
    ON CONFLICT (student_id) DO UPDATE SET
      certificate_number = EXCLUDED.certificate_number,
      last_updated = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically add to directory
CREATE TRIGGER trigger_update_directory_on_certification
  AFTER INSERT OR UPDATE ON certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_directory_on_certification();
