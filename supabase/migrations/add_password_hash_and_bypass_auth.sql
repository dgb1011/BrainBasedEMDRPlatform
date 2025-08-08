-- Migration to add password_hash column and bypass Supabase Auth
-- This allows us to use our own authentication system without relying on Supabase Auth

-- Add password_hash column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Remove the foreign key constraint to auth.users since we're bypassing Supabase Auth
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Update the users table to not depend on auth.users
ALTER TABLE users ALTER COLUMN id TYPE TEXT;
ALTER TABLE users ALTER COLUMN id SET DEFAULT 'user_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 9);

-- Update the students table to use TEXT for user_id
ALTER TABLE students ALTER COLUMN user_id TYPE TEXT;

-- Update the consultants table to use TEXT for user_id  
ALTER TABLE consultants ALTER COLUMN user_id TYPE TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_password_hash ON users(password_hash);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email));

-- Add a unique constraint on email to prevent duplicates
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Update the foreign key constraints to use TEXT
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_user_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE consultants DROP CONSTRAINT IF EXISTS consultants_user_id_fkey;
ALTER TABLE consultants ADD CONSTRAINT consultants_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add a check constraint for valid roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('student', 'consultant', 'admin'));

-- Create a function to generate user IDs
CREATE OR REPLACE FUNCTION generate_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'user_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 9);
END;
$$ LANGUAGE plpgsql;

-- Update the default value for id column
ALTER TABLE users ALTER COLUMN id SET DEFAULT generate_user_id();

-- Add a trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON users;
CREATE TRIGGER update_users_updated_at_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();
