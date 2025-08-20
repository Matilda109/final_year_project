-- SUPABASE COMPREHENSIVE USER DELETION CLEANUP
-- This script deletes all dependent records before allowing user deletion
-- Based on the actual foreign key constraints in your database

-- ==================================================
-- OPTION 1: Delete ALL dependent records (NUCLEAR OPTION)
-- Use this if you want to clean up everything and start fresh
-- ==================================================

DO $$
BEGIN
    RAISE NOTICE 'Starting comprehensive cleanup of all dependent records...';
    
    -- Delete all feedback records
    DELETE FROM feedback;
    RAISE NOTICE 'Deleted all feedback records';
    
    -- Delete all group member records
    DELETE FROM group_members;
    RAISE NOTICE 'Deleted all group member records';
    
    -- Delete all meeting participant records
    DELETE FROM meeting_participants;
    RAISE NOTICE 'Deleted all meeting participant records';
    
    -- Delete all project submission records
    DELETE FROM project_submissions;
    RAISE NOTICE 'Deleted all project submission records';
    
    -- Delete all student group records
    DELETE FROM student_groups;
    RAISE NOTICE 'Deleted all student group records';
    
    -- Delete all student supervisor relationship records
    DELETE FROM student_supervisor_relationships;
    RAISE NOTICE 'Deleted all student supervisor relationship records';
    
    -- Delete all meeting request records
    DELETE FROM meeting_requests;
    RAISE NOTICE 'Deleted all meeting request records';
    
    -- Delete all meeting records
    DELETE FROM meetings;
    RAISE NOTICE 'Deleted all meeting records';
    
    -- Delete all project deadline records
    DELETE FROM project_deadlines;
    RAISE NOTICE 'Deleted all project deadline records';
    
    RAISE NOTICE 'Comprehensive cleanup completed! You can now delete users freely.';
END $$;

-- ==================================================
-- OPTION 2: Delete records for a specific user only
-- Use this if you want to delete just one problematic user
-- ==================================================

/*
-- Replace 'USER_ID_HERE' with the actual user ID you want to delete
DO $$
DECLARE
    target_user_id UUID := 'USER_ID_HERE'; -- Replace with actual user ID
    deletion_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting cleanup for user: %', target_user_id;
    
    -- Delete feedback records (both as student and supervisor)
    DELETE FROM feedback WHERE student_id = target_user_id OR supervisor_id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % feedback records', deletion_count;
    
    -- Delete group member records
    DELETE FROM group_members WHERE student_id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % group member records', deletion_count;
    
    -- Delete meeting participant records
    DELETE FROM meeting_participants WHERE participant_id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % meeting participant records', deletion_count;
    
    -- Delete project submission records (both as student and supervisor)
    DELETE FROM project_submissions WHERE student_id = target_user_id OR supervisor_id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % project submission records', deletion_count;
    
    -- Delete student group records (where user is supervisor)
    DELETE FROM student_groups WHERE supervisor_id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % student group records', deletion_count;
    
    -- Delete student supervisor relationship records (both as student and supervisor)
    DELETE FROM student_supervisor_relationships WHERE student_id = target_user_id OR supervisor_id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % supervisor relationship records', deletion_count;
    
    -- Delete meeting request records (both as student and supervisor)
    DELETE FROM meeting_requests WHERE student_id = target_user_id OR supervisor_id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % meeting request records', deletion_count;
    
    -- Delete meeting records (where user created the meeting)
    DELETE FROM meetings WHERE created_by = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % meeting records', deletion_count;
    
    -- Delete project deadline records (both as student and supervisor)
    DELETE FROM project_deadlines WHERE student_id = target_user_id OR supervisor_id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % project deadline records', deletion_count;
    
    -- Finally delete the user profile
    DELETE FROM profiles WHERE id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    
    IF deletion_count > 0 THEN
        RAISE NOTICE 'Successfully deleted user profile';
    ELSE
        RAISE NOTICE 'User profile not found or already deleted';
    END IF;
    
    RAISE NOTICE 'Cleanup completed for user: %', target_user_id;
END $$;
*/

-- ==================================================
-- OPTION 3: Test what would be deleted for a specific user
-- Use this to see what records would be affected before actually deleting
-- ==================================================

/*
-- Replace 'USER_ID_HERE' with the actual user ID you want to test
DO $$
DECLARE
    target_user_id UUID := 'USER_ID_HERE'; -- Replace with actual user ID
    record_count INTEGER;
BEGIN
    RAISE NOTICE 'Testing deletion impact for user: %', target_user_id;
    
    -- Check feedback records
    SELECT COUNT(*) INTO record_count FROM feedback WHERE student_id = target_user_id OR supervisor_id = target_user_id;
    RAISE NOTICE 'Would delete % feedback records', record_count;
    
    -- Check group member records
    SELECT COUNT(*) INTO record_count FROM group_members WHERE student_id = target_user_id;
    RAISE NOTICE 'Would delete % group member records', record_count;
    
    -- Check meeting participant records
    SELECT COUNT(*) INTO record_count FROM meeting_participants WHERE participant_id = target_user_id;
    RAISE NOTICE 'Would delete % meeting participant records', record_count;
    
    -- Check project submission records
    SELECT COUNT(*) INTO record_count FROM project_submissions WHERE student_id = target_user_id OR supervisor_id = target_user_id;
    RAISE NOTICE 'Would delete % project submission records', record_count;
    
    -- Check student group records
    SELECT COUNT(*) INTO record_count FROM student_groups WHERE supervisor_id = target_user_id;
    RAISE NOTICE 'Would delete % student group records', record_count;
    
    -- Check supervisor relationship records
    SELECT COUNT(*) INTO record_count FROM student_supervisor_relationships WHERE student_id = target_user_id OR supervisor_id = target_user_id;
    RAISE NOTICE 'Would delete % supervisor relationship records', record_count;
    
    -- Check meeting request records
    SELECT COUNT(*) INTO record_count FROM meeting_requests WHERE student_id = target_user_id OR supervisor_id = target_user_id;
    RAISE NOTICE 'Would delete % meeting request records', record_count;
    
    -- Check meeting records
    SELECT COUNT(*) INTO record_count FROM meetings WHERE created_by = target_user_id;
    RAISE NOTICE 'Would delete % meeting records', record_count;
    
    -- Check project deadline records
    SELECT COUNT(*) INTO record_count FROM project_deadlines WHERE student_id = target_user_id OR supervisor_id = target_user_id;
    RAISE NOTICE 'Would delete % project deadline records', record_count;
    
END $$;
*/

-- ==================================================
-- INSTRUCTIONS FOR USE
-- ==================================================

/*
CHOOSE ONE OPTION:

OPTION 1 (NUCLEAR): Run the first script to delete ALL dependent records
- Use this if you want to clean up everything and start fresh
- Good for development/testing environments
- Will allow you to delete any user afterward

OPTION 2 (TARGETED): Uncomment and modify the second script to delete one specific user
- Replace 'USER_ID_HERE' with the actual UUID of the user causing problems
- More surgical approach, only affects one user's data

OPTION 3 (TEST): Uncomment and modify the third script to test what would be deleted
- Use this first to see the impact before actually deleting anything
- Replace 'USER_ID_HERE' with the actual UUID to test

AFTER RUNNING ANY OPTION:
- Your admin dashboard user deletion will work normally
- All table structures and functions remain intact
- You can continue development/testing as usual
*/
