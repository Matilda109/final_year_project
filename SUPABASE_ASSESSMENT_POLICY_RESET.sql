-- SUPABASE_ASSESSMENT_POLICY_RESET.sql
-- Reset and create new RLS policies for project_assessments

-- First, get a list of all existing policies on the project_assessments table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'project_assessments' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON project_assessments', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END
$$;

-- Create a simple SELECT policy with a unique name
CREATE POLICY "assessment_select_policy_v2"
ON project_assessments
FOR SELECT
TO authenticated
USING (
  supervisor_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create a simple INSERT policy with a unique name
CREATE POLICY "assessment_insert_policy_v2"
ON project_assessments
FOR INSERT
TO authenticated
WITH CHECK (
  supervisor_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create a simple UPDATE policy with a unique name
CREATE POLICY "assessment_update_policy_v2"
ON project_assessments
FOR UPDATE
TO authenticated
USING (
  supervisor_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  supervisor_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create a simple DELETE policy with a unique name
CREATE POLICY "assessment_delete_policy_v2"
ON project_assessments
FOR DELETE
TO authenticated
USING (
  supervisor_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Make sure RLS is enabled on the table
ALTER TABLE project_assessments ENABLE ROW LEVEL SECURITY;

-- Verify the policies have been created
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'project_assessments' 
AND schemaname = 'public';
