-- Fix RLS Policies for Group Synchronization
-- This script updates the RLS policies to allow group synchronization triggers to work
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. UPDATE PROJECT SUBMISSIONS RLS POLICIES
-- ============================================================================

-- Drop existing restrictive policies (both old and new names)
DROP POLICY IF EXISTS "Students can insert their own submissions" ON public.project_submissions;
DROP POLICY IF EXISTS "Students can view their own submissions" ON public.project_submissions;
DROP POLICY IF EXISTS "Supervisors can view submissions assigned to them" ON public.project_submissions;
DROP POLICY IF EXISTS "Supervisors can update submissions assigned to them" ON public.project_submissions;

-- Drop new policy names in case they already exist
DROP POLICY IF EXISTS "Students can view their own or group submissions" ON public.project_submissions;
DROP POLICY IF EXISTS "Students can insert their own or group submissions" ON public.project_submissions;
DROP POLICY IF EXISTS "Students can update their own or group submissions" ON public.project_submissions;

-- Create more flexible policies that allow group synchronization

-- Policy to allow students to view their own submissions OR submissions from their group members
CREATE POLICY "Students can view their own or group submissions" 
ON public.project_submissions
FOR SELECT 
USING (
  auth.uid() = project_submissions.student_id 
  OR 
  -- Allow if the authenticated user is in the same group as the submission owner
  EXISTS (
    SELECT 1 
    FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    JOIN public.student_groups sg ON gm1.group_id = sg.id
    WHERE gm1.student_id = auth.uid() 
      AND gm2.student_id = project_submissions.student_id
      AND sg.status = 'active'
  )
);

-- Policy to allow supervisors to view submissions assigned to them
CREATE POLICY "Supervisors can view submissions assigned to them" 
ON public.project_submissions
FOR SELECT 
USING (
  auth.uid() = supervisor_id
);

-- Policy to allow students to insert their own submissions OR submissions for group members
CREATE POLICY "Students can insert their own or group submissions" 
ON public.project_submissions
FOR INSERT 
WITH CHECK (
  auth.uid() = project_submissions.student_id 
  OR 
  -- Allow if the authenticated user is in the same group as the target student
  EXISTS (
    SELECT 1 
    FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    JOIN public.student_groups sg ON gm1.group_id = sg.id
    WHERE gm1.student_id = auth.uid() 
      AND gm2.student_id = project_submissions.student_id
      AND sg.status = 'active'
  )
);

-- Policy to allow students to update their own submissions OR submissions for group members
CREATE POLICY "Students can update their own or group submissions" 
ON public.project_submissions
FOR UPDATE 
USING (
  auth.uid() = project_submissions.student_id 
  OR 
  -- Allow if the authenticated user is in the same group as the submission owner
  EXISTS (
    SELECT 1 
    FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    JOIN public.student_groups sg ON gm1.group_id = sg.id
    WHERE gm1.student_id = auth.uid() 
      AND gm2.student_id = project_submissions.student_id
      AND sg.status = 'active'
  )
)
WITH CHECK (
  auth.uid() = project_submissions.student_id 
  OR 
  -- Allow if the authenticated user is in the same group as the target student
  EXISTS (
    SELECT 1 
    FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    JOIN public.student_groups sg ON gm1.group_id = sg.id
    WHERE gm1.student_id = auth.uid() 
      AND gm2.student_id = project_submissions.student_id
      AND sg.status = 'active'
  )
);

-- Policy to allow supervisors to update submissions assigned to them
CREATE POLICY "Supervisors can update submissions assigned to them" 
ON public.project_submissions
FOR UPDATE 
USING (
  auth.uid() = supervisor_id
)
WITH CHECK (
  auth.uid() = supervisor_id
);

-- ============================================================================
-- 2. UPDATE FEEDBACK RLS POLICIES (if feedback table exists)
-- ============================================================================

-- Check if feedback table exists and update policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback') THEN
    -- Drop existing policies (both old and new names)
    DROP POLICY IF EXISTS "Students can view their own feedback" ON public.feedback;
    DROP POLICY IF EXISTS "Supervisors can insert feedback" ON public.feedback;
    DROP POLICY IF EXISTS "Supervisors can view feedback they created" ON public.feedback;
    DROP POLICY IF EXISTS "Students can view their own or group feedback" ON public.feedback;
    DROP POLICY IF EXISTS "Supervisors can view and insert feedback" ON public.feedback;
    
    -- Create new policies that allow group synchronization
    CREATE POLICY "Students can view their own or group feedback" 
    ON public.feedback
    FOR SELECT 
    USING (
      auth.uid() = feedback.student_id 
      OR 
      -- Allow if the authenticated user is in the same group as the feedback recipient
      EXISTS (
        SELECT 1 
        FROM public.group_members gm1
        JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
        JOIN public.student_groups sg ON gm1.group_id = sg.id
        WHERE gm1.student_id = auth.uid() 
          AND gm2.student_id = feedback.student_id
          AND sg.status = 'active'
      )
    );
    
    CREATE POLICY "Supervisors can view and insert feedback" 
    ON public.feedback
    FOR ALL
    USING (
      auth.uid() = supervisor_id
    )
    WITH CHECK (
      auth.uid() = supervisor_id
    );
  END IF;
END $$;

-- ============================================================================
-- 3. UPDATE PROJECT DEADLINES RLS POLICIES (if project_deadlines table exists)
-- ============================================================================

-- Check if project_deadlines table exists and update policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_deadlines') THEN
    -- Drop existing policies (both old and new names)
    DROP POLICY IF EXISTS "Students can view their own deadlines" ON public.project_deadlines;
    DROP POLICY IF EXISTS "Supervisors can manage deadlines" ON public.project_deadlines;
    DROP POLICY IF EXISTS "Students can view their own or group deadlines" ON public.project_deadlines;
    DROP POLICY IF EXISTS "Supervisors can manage all deadlines" ON public.project_deadlines;
    
    -- Create new policies that allow group synchronization
    CREATE POLICY "Students can view their own or group deadlines" 
    ON public.project_deadlines
    FOR SELECT 
    USING (
      auth.uid() = project_deadlines.student_id 
      OR 
      -- Allow if the authenticated user is in the same group as the deadline recipient
      EXISTS (
        SELECT 1 
        FROM public.group_members gm1
        JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
        JOIN public.student_groups sg ON gm1.group_id = sg.id
        WHERE gm1.student_id = auth.uid() 
          AND gm2.student_id = project_deadlines.student_id
          AND sg.status = 'active'
      )
    );
    
    CREATE POLICY "Supervisors can manage all deadlines" 
    ON public.project_deadlines
    FOR ALL
    USING (
      auth.uid() = supervisor_id
    )
    WITH CHECK (
      auth.uid() = supervisor_id
    );
  END IF;
END $$;

-- ============================================================================
-- 4. CREATE SECURITY DEFINER FUNCTIONS FOR TRIGGERS
-- ============================================================================

-- Alternative approach: Create SECURITY DEFINER functions that bypass RLS
-- These functions run with elevated privileges to allow cross-student operations

CREATE OR REPLACE FUNCTION sync_group_project_submissions_secure()
RETURNS TRIGGER 
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
AS $$
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

-- Replace the existing trigger with the secure version
DROP TRIGGER IF EXISTS trigger_sync_group_submissions ON public.project_submissions;
CREATE TRIGGER trigger_sync_group_submissions
  AFTER INSERT OR UPDATE ON public.project_submissions
  FOR EACH ROW EXECUTE FUNCTION sync_group_project_submissions_secure();

-- ============================================================================
-- 5. TEST THE UPDATED SYSTEM
-- ============================================================================

-- Function to test if RLS policies are working correctly
CREATE OR REPLACE FUNCTION test_group_sync_rls()
RETURNS TEXT AS $$
DECLARE
  test_result TEXT := '';
BEGIN
  -- Check if policies exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Students can insert their own or group submissions'
  ) THEN
    test_result := test_result || 'Group-aware INSERT policy found. ';
  ELSE
    test_result := test_result || 'WARNING: Group-aware INSERT policy not found. ';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Students can view their own or group submissions'
  ) THEN
    test_result := test_result || 'Group-aware SELECT policy found. ';
  ELSE
    test_result := test_result || 'WARNING: Group-aware SELECT policy not found. ';
  END IF;
  
  RETURN test_result || 'RLS policies updated for group synchronization!';
END;
$$ LANGUAGE plpgsql;

-- Run the test
SELECT test_group_sync_rls();

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

/*
WHAT THIS SCRIPT DOES:

1. Updates RLS policies to allow group members to insert/update submissions for each other
2. Creates SECURITY DEFINER functions that can bypass RLS when needed
3. Ensures that group synchronization triggers work without permission errors

IMPORTANT NOTES:
- The SECURITY DEFINER approach allows triggers to bypass RLS safely
- Group members can now see each other's submissions automatically
- Supervisors maintain full access to all submissions from their assigned students
- The system maintains security while enabling group collaboration

AFTER RUNNING THIS SCRIPT:
- Group synchronization should work without RLS errors
- Students in groups can submit projects and see them sync automatically
- All security policies remain intact for non-group scenarios
*/
