-- Storage Policies for BrainBased EMDR Platform
-- Run this in Supabase SQL Editor after creating the buckets

-- Documents Bucket Policies
-- Students can upload their own documents
CREATE POLICY "Students can upload their own documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT user_id FROM students WHERE user_id = auth.uid()
  )
);

-- Students can view their own documents
CREATE POLICY "Students can view their own documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT user_id FROM students WHERE user_id = auth.uid()
  )
);

-- Consultants can view documents of students they're working with
CREATE POLICY "Consultants can view student documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT user_id FROM consultants WHERE user_id = auth.uid()
  )
);

-- Admins can view all documents
CREATE POLICY "Admins can view all documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);

-- Recordings Bucket Policies
-- Students can view recordings of their sessions
CREATE POLICY "Students can view their session recordings" ON storage.objects
FOR SELECT USING (
  bucket_id = 'recordings' AND
  auth.uid() IN (
    SELECT user_id FROM students WHERE user_id = auth.uid()
  )
);

-- Consultants can upload and view recordings
CREATE POLICY "Consultants can manage recordings" ON storage.objects
FOR ALL USING (
  bucket_id = 'recordings' AND
  auth.uid() IN (
    SELECT user_id FROM consultants WHERE user_id = auth.uid()
  )
);

-- Admins can view all recordings
CREATE POLICY "Admins can view all recordings" ON storage.objects
FOR SELECT USING (
  bucket_id = 'recordings' AND
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);

-- Certificates Bucket Policies
-- Students can view their own certificates
CREATE POLICY "Students can view their certificates" ON storage.objects
FOR SELECT USING (
  bucket_id = 'certificates' AND
  auth.uid() IN (
    SELECT user_id FROM students WHERE user_id = auth.uid()
  )
);

-- Consultants can upload certificates for students
CREATE POLICY "Consultants can upload certificates" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'certificates' AND
  auth.uid() IN (
    SELECT user_id FROM consultants WHERE user_id = auth.uid()
  )
);

-- Admins can manage all certificates
CREATE POLICY "Admins can manage all certificates" ON storage.objects
FOR ALL USING (
  bucket_id = 'certificates' AND
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);

-- File organization policies
-- Ensure files are organized by user and type
CREATE OR REPLACE FUNCTION check_file_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Documents should be in user-specific folders
  IF NEW.bucket_id = 'documents' THEN
    IF NOT (NEW.name LIKE auth.uid() || '/%') THEN
      RAISE EXCEPTION 'Documents must be organized in user folders';
    END IF;
  END IF;
  
  -- Recordings should be in session-specific folders
  IF NEW.bucket_id = 'recordings' THEN
    IF NOT (NEW.name LIKE 'sessions/%') THEN
      RAISE EXCEPTION 'Recordings must be organized in session folders';
    END IF;
  END IF;
  
  -- Certificates should be in user-specific folders
  IF NEW.bucket_id = 'certificates' THEN
    IF NOT (NEW.name LIKE 'users/%') THEN
      RAISE EXCEPTION 'Certificates must be organized in user folders';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for file organization
CREATE TRIGGER enforce_file_organization
  BEFORE INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION check_file_organization(); 