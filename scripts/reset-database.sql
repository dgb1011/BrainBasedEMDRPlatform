-- ========================================
-- BRAINBASED EMDR PLATFORM - DATABASE RESET
-- ========================================
-- This script will completely reset the database to a clean state
-- Use with EXTREME CAUTION - this will delete ALL data

-- Disable RLS temporarily for cleanup
SET row_security = off;

-- ========================================
-- 1. DELETE ALL USER DATA (in correct order to respect foreign keys)
-- ========================================

-- Delete consultation sessions first (references students and consultants)
DELETE FROM consultation_sessions;

-- Delete notifications (references users)
DELETE FROM notifications;

-- Delete notification preferences (references users)  
DELETE FROM notification_preferences;

-- Delete student and consultant profiles
DELETE FROM students;
DELETE FROM consultants;

-- Delete users (this will cascade to related data)
DELETE FROM users;

-- ========================================
-- 2. DELETE ALL OPERATIONAL DATA
-- ========================================

-- Delete certificates
DELETE FROM certificates;

-- Delete availability schedules
DELETE FROM consultant_availability;

-- Delete any file uploads or documents
-- (Note: This doesn't delete files from Supabase storage - see separate script)

-- ========================================
-- 3. RESET SEQUENCES (if any auto-increment IDs exist)
-- ========================================

-- Note: UUIDs don't need sequence resets, but if you have any serial columns:
-- ALTER SEQUENCE IF EXISTS some_sequence_name RESTART WITH 1;

-- ========================================
-- 4. VERIFY CLEAN STATE
-- ========================================

-- Check that all main tables are empty
DO $$
DECLARE
    user_count INTEGER;
    student_count INTEGER;
    consultant_count INTEGER;
    session_count INTEGER;
    notification_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO student_count FROM students;
    SELECT COUNT(*) INTO consultant_count FROM consultants;
    SELECT COUNT(*) INTO session_count FROM consultation_sessions;
    SELECT COUNT(*) INTO notification_count FROM notifications;
    
    RAISE NOTICE 'DATABASE RESET VERIFICATION:';
    RAISE NOTICE 'Users: %', user_count;
    RAISE NOTICE 'Students: %', student_count;
    RAISE NOTICE 'Consultants: %', consultant_count;
    RAISE NOTICE 'Sessions: %', session_count;
    RAISE NOTICE 'Notifications: %', notification_count;
    
    IF user_count = 0 AND student_count = 0 AND consultant_count = 0 AND session_count = 0 THEN
        RAISE NOTICE '✅ DATABASE SUCCESSFULLY RESET TO CLEAN STATE';
    ELSE
        RAISE NOTICE '❌ DATABASE RESET INCOMPLETE - SOME DATA REMAINS';
    END IF;
END $$;

-- Re-enable RLS
SET row_security = on;

-- ========================================
-- 5. RESET COMPLETE
-- ========================================
-- The database is now in a completely clean state
-- Ready for fresh production deployment
