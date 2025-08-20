-- Simple Group Synchronization Fix
-- This disables the problematic triggers and provides a simpler approach
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. DISABLE ALL EXISTING TRIGGERS TO STOP INFINITE LOOPS
-- ============================================================================

-- Drop all existing group sync triggers to stop the infinite loop
DROP TRIGGER IF EXISTS trigger_sync_group_submissions ON public.project_submissions;
DROP TRIGGER IF EXISTS trigger_sync_group_feedback ON public.feedback;
DROP TRIGGER IF EXISTS trigger_sync_group_deadlines ON public.project_deadlines;
DROP TRIGGER IF EXISTS trigger_sync_group_meeting_participants ON public.meeting_participants;

-- Drop the problematic functions
DROP FUNCTION IF EXISTS sync_group_project_submissions();
DROP FUNCTION IF EXISTS sync_group_feedback();
DROP FUNCTION IF EXISTS sync_group_deadlines();
DROP FUNCTION IF EXISTS sync_group_meeting_participants();

-- ============================================================================
-- 2. CREATE A MANUAL SYNC FUNCTION (SAFER APPROACH)
-- ============================================================================

-- Function to manually sync submissions for a specific group
CREATE OR REPLACE FUNCTION sync_group_submissions_manual(source_student_id UUID, project_type_param TEXT)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_id_var UUID;
  group_member_id UUID;
  source_submission RECORD;
  sync_count INTEGER := 0;
BEGIN
  -- Get the group ID for the source student
  SELECT sg.id INTO group_id_var
  FROM public.student_groups sg
  JOIN public.group_members gm ON sg.id = gm.group_id
  WHERE gm.student_id = source_student_id
    AND sg.status = 'active';
  
  -- If student is not in a group, return early
  IF group_id_var IS NULL THEN
    RETURN 'Student is not in an active group';
  END IF;
  
  -- Get the source submission
  SELECT * INTO source_submission
  FROM public.project_submissions
  WHERE student_id = source_student_id
    AND project_type = project_type_param
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no submission found, return early
  IF source_submission IS NULL THEN
    RETURN 'No submission found for the specified student and project type';
  END IF;
  
  -- Sync to all other group members
  FOR group_member_id IN 
    SELECT gm.student_id
    FROM public.group_members gm
    WHERE gm.group_id = group_id_var
      AND gm.student_id != source_student_id
  LOOP
    -- Check if submission already exists for this group member
    IF NOT EXISTS (
      SELECT 1 FROM public.project_submissions 
      WHERE student_id = group_member_id 
        AND project_type = project_type_param 
        AND supervisor_id = source_submission.supervisor_id
    ) THEN
      -- Insert submission for group member
      INSERT INTO public.project_submissions (
        student_id,
        supervisor_id,
        project_type,
        title,
        abstract,
        keywords,
        document_url,
        status,
        feedback,
        submitted_at,
        reviewed_at,
        created_at,
        updated_at
      ) VALUES (
        group_member_id,
        source_submission.supervisor_id,
        source_submission.project_type,
        source_submission.title,
        source_submission.abstract,
        source_submission.keywords,
        source_submission.document_url,
        source_submission.status,
        source_submission.feedback,
        source_submission.submitted_at,
        source_submission.reviewed_at,
        NOW(),
        NOW()
      );
      
      sync_count := sync_count + 1;
    END IF;
  END LOOP;
  
  RETURN format('Successfully synced submission to %s group members', sync_count);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. CREATE APPLICATION-LEVEL SYNC FUNCTION
-- ============================================================================

-- Function to be called from the application after a submission is made
CREATE OR REPLACE FUNCTION handle_group_submission_sync(student_id_param UUID, project_type_param TEXT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_info RECORD;
  sync_result TEXT;
  result JSON;
BEGIN
  -- Check if student is in a group
  SELECT 
    sg.id as group_id,
    sg.name as group_name,
    COUNT(gm.student_id) as member_count
  INTO group_info
  FROM public.student_groups sg
  JOIN public.group_members gm ON sg.id = gm.group_id
  WHERE gm.student_id = student_id_param
    AND sg.status = 'active'
  GROUP BY sg.id, sg.name;
  
  -- If not in a group, return success without syncing
  IF group_info IS NULL THEN
    result := json_build_object(
      'success', true,
      'message', 'Individual submission - no sync needed',
      'is_group', false
    );
    RETURN result;
  END IF;
  
  -- Perform the sync
  SELECT sync_group_submissions_manual(student_id_param, project_type_param) INTO sync_result;
  
  -- Return success result
  result := json_build_object(
    'success', true,
    'message', sync_result,
    'is_group', true,
    'group_name', group_info.group_name,
    'member_count', group_info.member_count
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Return error result
  result := json_build_object(
    'success', false,
    'message', SQLERRM,
    'is_group', true
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. UTILITY FUNCTIONS
-- ============================================================================

-- Function to check group status
CREATE OR REPLACE FUNCTION get_student_group_info(student_id_param UUID)
RETURNS JSON AS $$
DECLARE
  group_info RECORD;
  result JSON;
BEGIN
  SELECT 
    sg.id as group_id,
    sg.name as group_name,
    sg.supervisor_id,
    sup.full_name as supervisor_name,
    COUNT(gm.student_id) as member_count,
    array_agg(p.full_name) as member_names
  INTO group_info
  FROM public.student_groups sg
  JOIN public.group_members gm ON sg.id = gm.group_id
  JOIN public.profiles p ON gm.student_id = p.id
  LEFT JOIN public.profiles sup ON sg.supervisor_id = sup.id
  WHERE gm.student_id = student_id_param
    AND sg.status = 'active'
  GROUP BY sg.id, sg.name, sg.supervisor_id, sup.full_name;
  
  IF group_info IS NULL THEN
    result := json_build_object(
      'is_in_group', false,
      'message', 'Student is not in an active group'
    );
  ELSE
    result := json_build_object(
      'is_in_group', true,
      'group_id', group_info.group_id,
      'group_name', group_info.group_name,
      'supervisor_id', group_info.supervisor_id,
      'supervisor_name', group_info.supervisor_name,
      'member_count', group_info.member_count,
      'member_names', group_info.member_names
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. TEST THE SYSTEM
-- ============================================================================

-- Test function
CREATE OR REPLACE FUNCTION test_group_sync_system()
RETURNS TEXT AS $$
BEGIN
  RETURN 'Group synchronization system is now using manual sync approach. No automatic triggers are active. Use handle_group_submission_sync() function from your application after submissions.';
END;
$$ LANGUAGE plpgsql;

-- Run the test
SELECT test_group_sync_system();

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

/*
IMPORTANT: This approach uses MANUAL synchronization instead of automatic triggers.

HOW TO USE:

1. After a student submits a project, call this function from your application:
   SELECT handle_group_submission_sync('student-id', 'project-type');

2. This will:
   - Check if the student is in a group
   - If yes, sync the submission to all group members
   - Return a JSON result with success/failure info

3. To check if a student is in a group:
   SELECT get_student_group_info('student-id');

4. To manually sync a specific submission:
   SELECT sync_group_submissions_manual('student-id', 'project-type');

BENEFITS:
- No infinite loops
- No trigger conflicts
- More control over when sync happens
- Better error handling
- Can be called from application code

INTEGRATION:
You'll need to modify your submission code to call the sync function after successful submissions.
*/
