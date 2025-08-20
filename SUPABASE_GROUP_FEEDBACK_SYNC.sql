-- Group Feedback Synchronization System
-- This extends the manual sync system to handle supervisor feedback for group students
-- Run this in your Supabase SQL Editor after running the simple fix

-- ============================================================================
-- 1. GROUP FEEDBACK SYNC FUNCTIONS
-- ============================================================================

-- Function to manually sync feedback for a specific group
CREATE OR REPLACE FUNCTION sync_group_feedback_manual(source_student_id UUID, feedback_id_param UUID)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_id_var UUID;
  group_member_id UUID;
  source_feedback RECORD;
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
  
  -- Get the source feedback (check if feedback table exists first)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback') THEN
    EXECUTE format('SELECT * FROM public.feedback WHERE id = $1 AND student_id = $2')
    INTO source_feedback
    USING feedback_id_param, source_student_id;
  ELSE
    RETURN 'Feedback table does not exist';
  END IF;
  
  -- If no feedback found, return early
  IF source_feedback IS NULL THEN
    RETURN 'No feedback found for the specified student and feedback ID';
  END IF;
  
  -- Sync to all other group members
  FOR group_member_id IN 
    SELECT gm.student_id
    FROM public.group_members gm
    WHERE gm.group_id = group_id_var
      AND gm.student_id != source_student_id
  LOOP
    -- Check if feedback already exists for this group member
    IF NOT EXISTS (
      SELECT 1 FROM public.feedback 
      WHERE student_id = group_member_id 
        AND supervisor_id = source_feedback.supervisor_id
        AND project_type = source_feedback.project_type
        AND created_at = source_feedback.created_at
    ) THEN
      -- Insert feedback for group member
      INSERT INTO public.feedback (
        student_id,
        supervisor_id,
        project_type,
        status,
        comments,
        document_url,
        created_at,
        updated_at
      ) VALUES (
        group_member_id,
        source_feedback.supervisor_id,
        source_feedback.project_type,
        source_feedback.status,
        source_feedback.comments,
        source_feedback.document_url,
        source_feedback.created_at,
        NOW()
      );
      
      sync_count := sync_count + 1;
    END IF;
  END LOOP;
  
  RETURN format('Successfully synced feedback to %s group members', sync_count);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. APPLICATION-LEVEL FEEDBACK SYNC FUNCTION
-- ============================================================================

-- Function to be called from the application after feedback is given
CREATE OR REPLACE FUNCTION handle_group_feedback_sync(student_id_param UUID, supervisor_id_param UUID, project_type_param TEXT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_info RECORD;
  latest_feedback RECORD;
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
      'message', 'Individual feedback - no sync needed',
      'is_group', false
    );
    RETURN result;
  END IF;
  
  -- Get the latest feedback for this student and project type
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback') THEN
    SELECT * INTO latest_feedback
    FROM public.feedback
    WHERE student_id = student_id_param
      AND supervisor_id = supervisor_id_param
      AND project_type = project_type_param
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If feedback found, sync it
    IF latest_feedback IS NOT NULL THEN
      SELECT sync_group_feedback_manual(student_id_param, latest_feedback.id) INTO sync_result;
      
      result := json_build_object(
        'success', true,
        'message', sync_result,
        'is_group', true,
        'group_name', group_info.group_name,
        'member_count', group_info.member_count
      );
    ELSE
      result := json_build_object(
        'success', false,
        'message', 'No feedback found to sync',
        'is_group', true
      );
    END IF;
  ELSE
    result := json_build_object(
      'success', false,
      'message', 'Feedback table does not exist',
      'is_group', true
    );
  END IF;
  
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
-- 3. SUPERVISOR FEEDBACK HELPER FUNCTIONS
-- ============================================================================

-- Function to sync feedback to all group members when supervisor gives feedback to one
CREATE OR REPLACE FUNCTION supervisor_feedback_group_sync(
  target_student_id UUID,
  supervisor_id_param UUID,
  project_type_param TEXT,
  status_param TEXT,
  comments_param TEXT,
  document_url_param TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_id_var UUID;
  group_member_id UUID;
  group_info RECORD;
  sync_count INTEGER := 0;
  result JSON;
BEGIN
  -- Check if target student is in a group
  SELECT 
    sg.id as group_id,
    sg.name as group_name,
    COUNT(gm.student_id) as member_count
  INTO group_info
  FROM public.student_groups sg
  JOIN public.group_members gm ON sg.id = gm.group_id
  WHERE gm.student_id = target_student_id
    AND sg.status = 'active'
  GROUP BY sg.id, sg.name;
  
  -- If not in a group, just create feedback for the individual student
  IF group_info IS NULL THEN
    -- Insert feedback for individual student
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback') THEN
      INSERT INTO public.feedback (
        student_id,
        supervisor_id,
        project_type,
        status,
        comments,
        document_url,
        created_at,
        updated_at
      ) VALUES (
        target_student_id,
        supervisor_id_param,
        project_type_param,
        status_param,
        comments_param,
        document_url_param,
        NOW(),
        NOW()
      );
    END IF;
    
    result := json_build_object(
      'success', true,
      'message', 'Individual feedback created',
      'is_group', false,
      'affected_students', 1
    );
    RETURN result;
  END IF;
  
  -- Create feedback for all group members
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback') THEN
    FOR group_member_id IN 
      SELECT gm.student_id
      FROM public.group_members gm
      WHERE gm.group_id = group_info.group_id
    LOOP
      -- Insert feedback for each group member
      INSERT INTO public.feedback (
        student_id,
        supervisor_id,
        project_type,
        status,
        comments,
        document_url,
        created_at,
        updated_at
      ) VALUES (
        group_member_id,
        supervisor_id_param,
        project_type_param,
        status_param,
        comments_param,
        document_url_param,
        NOW(),
        NOW()
      );
      
      sync_count := sync_count + 1;
    END LOOP;
  END IF;
  
  result := json_build_object(
    'success', true,
    'message', format('Group feedback created for %s students', sync_count),
    'is_group', true,
    'group_name', group_info.group_name,
    'affected_students', sync_count
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  result := json_build_object(
    'success', false,
    'message', SQLERRM,
    'is_group', COALESCE(group_info.group_id IS NOT NULL, false)
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. UTILITY FUNCTIONS FOR FEEDBACK
-- ============================================================================

-- Function to get all feedback for a group (from any member)
CREATE OR REPLACE FUNCTION get_group_feedback(student_id_param UUID)
RETURNS JSON AS $$
DECLARE
  group_id_var UUID;
  feedback_list JSON;
  result JSON;
BEGIN
  -- Get group ID for the student
  SELECT sg.id INTO group_id_var
  FROM public.student_groups sg
  JOIN public.group_members gm ON sg.id = gm.group_id
  WHERE gm.student_id = student_id_param
    AND sg.status = 'active';
  
  -- If not in a group, get individual feedback
  IF group_id_var IS NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback') THEN
      SELECT json_agg(
        json_build_object(
          'id', f.id,
          'project_type', f.project_type,
          'status', f.status,
          'comments', f.comments,
          'document_url', f.document_url,
          'created_at', f.created_at,
          'supervisor_name', p.full_name
        )
      ) INTO feedback_list
      FROM public.feedback f
      JOIN public.profiles p ON f.supervisor_id = p.id
      WHERE f.student_id = student_id_param
      ORDER BY f.created_at DESC;
    END IF;
    
    result := json_build_object(
      'is_group', false,
      'feedback', COALESCE(feedback_list, '[]'::json)
    );
  ELSE
    -- Get feedback for all group members
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback') THEN
      SELECT json_agg(DISTINCT
        json_build_object(
          'id', f.id,
          'project_type', f.project_type,
          'status', f.status,
          'comments', f.comments,
          'document_url', f.document_url,
          'created_at', f.created_at,
          'supervisor_name', p.full_name,
          'student_name', s.full_name
        )
      ) INTO feedback_list
      FROM public.feedback f
      JOIN public.profiles p ON f.supervisor_id = p.id
      JOIN public.profiles s ON f.student_id = s.id
      JOIN public.group_members gm ON f.student_id = gm.student_id
      WHERE gm.group_id = group_id_var
      ORDER BY f.created_at DESC;
    END IF;
    
    result := json_build_object(
      'is_group', true,
      'feedback', COALESCE(feedback_list, '[]'::json)
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. TEST FUNCTIONS
-- ============================================================================

-- Test function for feedback sync
CREATE OR REPLACE FUNCTION test_group_feedback_sync()
RETURNS TEXT AS $$
BEGIN
  RETURN 'Group feedback synchronization functions are ready. Use supervisor_feedback_group_sync() when supervisors give feedback to automatically sync across group members.';
END;
$$ LANGUAGE plpgsql;

-- Run the test
SELECT test_group_feedback_sync();

-- ============================================================================
-- USAGE INSTRUCTIONS FOR SUPERVISORS
-- ============================================================================

/*
HOW TO USE GROUP FEEDBACK SYNC:

1. WHEN SUPERVISOR GIVES FEEDBACK:
   Instead of inserting directly into feedback table, call:
   
   SELECT supervisor_feedback_group_sync(
     'target-student-id',
     'supervisor-id', 
     'project-type',
     'approved/rejected/revisions',
     'feedback comments',
     'optional-document-url'
   );

2. THIS WILL:
   - Check if student is in a group
   - If individual: Create feedback for just that student
   - If group: Create identical feedback for ALL group members
   - Return JSON with success/failure and affected student count

3. TO GET ALL FEEDBACK FOR A STUDENT (INCLUDING GROUP FEEDBACK):
   SELECT get_group_feedback('student-id');

4. INTEGRATION IN SUPERVISOR DASHBOARD:
   - Replace direct feedback INSERT statements
   - Use supervisor_feedback_group_sync() function instead
   - Handle the JSON response to show success/error messages

BENEFITS:
- Supervisors give feedback once, all group members receive it
- Maintains individual feedback for non-group students
- Proper error handling and logging
- Easy integration with existing supervisor dashboard
*/
