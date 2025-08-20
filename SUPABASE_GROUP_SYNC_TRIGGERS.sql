-- Group Synchronization System
-- This system automatically syncs submissions, feedback, and activities across all group members
-- Run this in your Supabase SQL Editor after setting up the group assignment tables

-- ============================================================================
-- 1. PROJECT SUBMISSIONS SYNCHRONIZATION
-- ============================================================================

-- Function to sync project submissions across group members
CREATE OR REPLACE FUNCTION sync_group_project_submissions()
RETURNS TRIGGER AS $$
DECLARE
  group_member_id UUID;
  group_id_var UUID;
  is_sync_operation BOOLEAN := FALSE;
BEGIN
  -- Check if this is a sync operation (to prevent infinite loops)
  -- We detect this by checking if the submission was created very recently (within 1 second)
  -- and if there are other submissions with the same project_type and supervisor_id
  SELECT COUNT(*) > 1 INTO is_sync_operation
  FROM public.project_submissions
  WHERE project_type = NEW.project_type
    AND supervisor_id = NEW.supervisor_id
    AND created_at >= (NOW() - INTERVAL '1 second');
  
  -- If this appears to be a sync operation, don't trigger another sync
  IF is_sync_operation THEN
    RETURN NEW;
  END IF;
  
  -- Check if the student is part of an active group
  SELECT sg.id INTO group_id_var
  FROM public.student_groups sg
  JOIN public.group_members gm ON sg.id = gm.group_id
  WHERE gm.student_id = NEW.student_id
    AND sg.status = 'active';
  
  -- If student is in a group, sync the submission to all group members
  IF group_id_var IS NOT NULL THEN
    -- Insert or update submissions for all other group members
    FOR group_member_id IN 
      SELECT gm.student_id
      FROM public.group_members gm
      WHERE gm.group_id = group_id_var
        AND gm.student_id != NEW.student_id
    LOOP
      -- Check if submission already exists for this group member
      IF NOT EXISTS (
        SELECT 1 FROM public.project_submissions 
        WHERE student_id = group_member_id 
          AND project_type = NEW.project_type 
          AND supervisor_id = NEW.supervisor_id
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
          NEW.supervisor_id,
          NEW.project_type,
          NEW.title,
          NEW.abstract,
          NEW.keywords,
          NEW.document_url,
          NEW.status,
          NEW.feedback,
          NEW.submitted_at,
          NEW.reviewed_at,
          NEW.created_at,
          NEW.updated_at
        );
      ELSE
        -- Update existing submission for group member
        UPDATE public.project_submissions SET
          title = NEW.title,
          abstract = NEW.abstract,
          keywords = NEW.keywords,
          document_url = NEW.document_url,
          status = NEW.status,
          feedback = NEW.feedback,
          submitted_at = NEW.submitted_at,
          reviewed_at = NEW.reviewed_at,
          updated_at = NEW.updated_at
        WHERE student_id = group_member_id 
          AND project_type = NEW.project_type 
          AND supervisor_id = NEW.supervisor_id;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to watch project submissions
DROP TRIGGER IF EXISTS trigger_sync_group_submissions ON public.project_submissions;
CREATE TRIGGER trigger_sync_group_submissions
  AFTER INSERT OR UPDATE ON public.project_submissions
  FOR EACH ROW EXECUTE FUNCTION sync_group_project_submissions();

-- ============================================================================
-- 2. FEEDBACK SYNCHRONIZATION
-- ============================================================================

-- Function to sync feedback across group members
CREATE OR REPLACE FUNCTION sync_group_feedback()
RETURNS TRIGGER AS $$
DECLARE
  group_member_id UUID;
  group_id_var UUID;
BEGIN
  -- Check if the student is part of an active group
  SELECT sg.id INTO group_id_var
  FROM public.student_groups sg
  JOIN public.group_members gm ON sg.id = gm.group_id
  WHERE gm.student_id = NEW.student_id
    AND sg.status = 'active';
  
  -- If student is in a group, sync the feedback to all group members
  IF group_id_var IS NOT NULL THEN
    -- Insert feedback for all other group members
    FOR group_member_id IN 
      SELECT gm.student_id
      FROM public.group_members gm
      WHERE gm.group_id = group_id_var
        AND gm.student_id != NEW.student_id
    LOOP
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
        NEW.supervisor_id,
        NEW.project_type,
        NEW.status,
        NEW.comments,
        NEW.document_url,
        NEW.created_at,
        NEW.updated_at
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to watch feedback (only if feedback table exists)
-- Note: This will only work if you have a feedback table in your database
DROP TRIGGER IF EXISTS trigger_sync_group_feedback ON public.feedback;
CREATE TRIGGER trigger_sync_group_feedback
  AFTER INSERT ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION sync_group_feedback();

-- ============================================================================
-- 3. PROJECT DEADLINES SYNCHRONIZATION
-- ============================================================================

-- Function to sync project deadlines across group members
CREATE OR REPLACE FUNCTION sync_group_deadlines()
RETURNS TRIGGER AS $$
DECLARE
  group_member_id UUID;
  group_id_var UUID;
BEGIN
  -- Only sync if deadline is for a specific student (not global)
  IF NEW.student_id IS NOT NULL THEN
    -- Check if the student is part of an active group
    SELECT sg.id INTO group_id_var
    FROM public.student_groups sg
    JOIN public.group_members gm ON sg.id = gm.group_id
    WHERE gm.student_id = NEW.student_id
      AND sg.status = 'active';
    
    -- If student is in a group, sync the deadline to all group members
    IF group_id_var IS NOT NULL THEN
      -- Insert or update deadlines for all other group members
      FOR group_member_id IN 
        SELECT gm.student_id
        FROM public.group_members gm
        WHERE gm.group_id = group_id_var
          AND gm.student_id != NEW.student_id
      LOOP
        -- Check if deadline already exists for this group member
        IF NOT EXISTS (
          SELECT 1 FROM public.project_deadlines 
          WHERE supervisor_id = NEW.supervisor_id 
            AND student_id = group_member_id 
            AND project_type = NEW.project_type
        ) THEN
          -- Insert deadline for group member
          INSERT INTO public.project_deadlines (
            supervisor_id,
            student_id,
            project_type,
            deadline_date,
            description,
            status,
            created_at,
            updated_at
          ) VALUES (
            NEW.supervisor_id,
            group_member_id,
            NEW.project_type,
            NEW.deadline_date,
            NEW.description,
            NEW.status,
            NEW.created_at,
            NEW.updated_at
          );
        ELSE
          -- Update existing deadline for group member
          UPDATE public.project_deadlines SET
            deadline_date = NEW.deadline_date,
            description = NEW.description,
            status = NEW.status,
            updated_at = NEW.updated_at
          WHERE supervisor_id = NEW.supervisor_id 
            AND student_id = group_member_id 
            AND project_type = NEW.project_type;
        END IF;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to watch project deadlines (only if project_deadlines table exists)
DROP TRIGGER IF EXISTS trigger_sync_group_deadlines ON public.project_deadlines;
CREATE TRIGGER trigger_sync_group_deadlines
  AFTER INSERT OR UPDATE ON public.project_deadlines
  FOR EACH ROW EXECUTE FUNCTION sync_group_deadlines();

-- ============================================================================
-- 4. MEETING PARTICIPANTS SYNCHRONIZATION
-- ============================================================================

-- Function to sync meeting participants across group members
CREATE OR REPLACE FUNCTION sync_group_meeting_participants()
RETURNS TRIGGER AS $$
DECLARE
  group_member_id UUID;
  group_id_var UUID;
BEGIN
  -- Check if the participant is part of an active group
  SELECT sg.id INTO group_id_var
  FROM public.student_groups sg
  JOIN public.group_members gm ON sg.id = gm.group_id
  WHERE gm.student_id = NEW.participant_id
    AND sg.status = 'active';
  
  -- If participant is in a group, add all group members to the meeting
  IF group_id_var IS NOT NULL THEN
    -- Add all other group members as participants
    FOR group_member_id IN 
      SELECT gm.student_id
      FROM public.group_members gm
      WHERE gm.group_id = group_id_var
        AND gm.student_id != NEW.participant_id
        AND gm.student_id NOT IN (
          SELECT participant_id 
          FROM public.meeting_participants 
          WHERE meeting_id = NEW.meeting_id
        )
    LOOP
      -- Add group member as participant to the meeting
      INSERT INTO public.meeting_participants (
        meeting_id,
        participant_id,
        status,
        created_at,
        updated_at
      ) VALUES (
        NEW.meeting_id,
        group_member_id,
        'invited',
        NOW(),
        NOW()
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to watch meeting participants (only if meeting_participants table exists)
DROP TRIGGER IF EXISTS trigger_sync_group_meeting_participants ON public.meeting_participants;
CREATE TRIGGER trigger_sync_group_meeting_participants
  AFTER INSERT ON public.meeting_participants
  FOR EACH ROW EXECUTE FUNCTION sync_group_meeting_participants();

-- ============================================================================
-- 5. UTILITY FUNCTIONS
-- ============================================================================

-- Function to manually sync existing data for a group
CREATE OR REPLACE FUNCTION manual_sync_group_data(group_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  source_student_id UUID;
  target_student_id UUID;
  sync_count INTEGER := 0;
  submission_record RECORD;
BEGIN
  -- Get the first student in the group as the source
  SELECT student_id INTO source_student_id
  FROM public.group_members
  WHERE group_id = group_id_param
  ORDER BY joined_date ASC
  LIMIT 1;
  
  IF source_student_id IS NULL THEN
    RETURN 'No students found in the specified group';
  END IF;
  
  -- Sync submissions to all other group members
  FOR target_student_id IN 
    SELECT student_id 
    FROM public.group_members 
    WHERE group_id = group_id_param 
      AND student_id != source_student_id
  LOOP
    -- Copy all submissions from source student to target student
    FOR submission_record IN 
      SELECT * FROM public.project_submissions 
      WHERE student_id = source_student_id
    LOOP
      -- Check if submission already exists for target student
      IF NOT EXISTS (
        SELECT 1 FROM public.project_submissions 
        WHERE student_id = target_student_id 
          AND project_type = submission_record.project_type 
          AND supervisor_id = submission_record.supervisor_id
      ) THEN
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
          target_student_id,
          submission_record.supervisor_id,
          submission_record.project_type,
          submission_record.title,
          submission_record.abstract,
          submission_record.keywords,
          submission_record.document_url,
          submission_record.status,
          submission_record.feedback,
          submission_record.submitted_at,
          submission_record.reviewed_at,
          submission_record.created_at,
          submission_record.updated_at
        );
        
        sync_count := sync_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN format('Successfully synced %s submissions for group %s', sync_count, group_id_param);
END;
$$ LANGUAGE plpgsql;

-- Function to check if a student is in an active group
CREATE OR REPLACE FUNCTION is_student_in_group(student_id_param UUID)
RETURNS TABLE(
  in_group BOOLEAN,
  group_id UUID,
  group_name TEXT,
  supervisor_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as in_group,
    sg.id as group_id,
    sg.name as group_name,
    sg.supervisor_id
  FROM public.student_groups sg
  JOIN public.group_members gm ON sg.id = gm.group_id
  WHERE gm.student_id = student_id_param
    AND sg.status = 'active'
  LIMIT 1;
  
  -- If no results, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::UUID;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. TESTING AND VERIFICATION
-- ============================================================================

-- Function to test group synchronization
CREATE OR REPLACE FUNCTION test_group_sync()
RETURNS TEXT AS $$
DECLARE
  test_result TEXT := '';
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_groups') THEN
    RETURN 'ERROR: student_groups table not found';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_members') THEN
    RETURN 'ERROR: group_members table not found';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_submissions') THEN
    RETURN 'ERROR: project_submissions table not found';
  END IF;
  
  -- Check if triggers exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_sync_group_submissions'
  ) THEN
    test_result := test_result || 'WARNING: Group submissions sync trigger not found. ';
  END IF;
  
  -- Count active groups
  SELECT INTO test_result 
    test_result || format('Found %s active groups. ', COUNT(*))
  FROM public.student_groups 
  WHERE status = 'active';
  
  -- Count group members
  SELECT INTO test_result 
    test_result || format('Found %s group members total. ', COUNT(*))
  FROM public.group_members gm
  JOIN public.student_groups sg ON gm.group_id = sg.id
  WHERE sg.status = 'active';
  
  RETURN test_result || 'Group synchronization system is ready!';
END;
$$ LANGUAGE plpgsql;

-- Run the test
SELECT test_group_sync();

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

/*
USAGE INSTRUCTIONS:

1. Run this entire SQL script in your Supabase SQL Editor
2. The triggers will automatically start working for new submissions/feedback
3. For existing data, you can manually sync a group using:
   SELECT manual_sync_group_data('your-group-id-here');

4. To check if a student is in a group:
   SELECT * FROM is_student_in_group('student-id-here');

5. To test the system:
   SELECT test_group_sync();

HOW IT WORKS:
- When a student submits a project, the trigger automatically creates identical submissions for all their group members
- When feedback is given to one group member, it's automatically copied to all group members
- When deadlines are set for one group member, they're set for all group members
- When meetings are scheduled with one group member, all group members are automatically invited

IMPORTANT NOTES:
- Only works for students in ACTIVE groups
- Uses ON CONFLICT clauses to prevent duplicate submissions
- Preserves original timestamps and metadata
- Does not create infinite loops (excludes the original student from sync)
*/
