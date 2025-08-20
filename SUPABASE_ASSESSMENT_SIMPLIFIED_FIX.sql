-- SUPABASE_ASSESSMENT_SIMPLIFIED_FIX.sql
-- Simplified fix for project_assessments RLS policies

-- First, drop all existing policies on the project_assessments table
DROP POLICY IF EXISTS "Supervisors can insert their own assessments" ON project_assessments;
DROP POLICY IF EXISTS "Supervisors can update their own assessments" ON project_assessments;
DROP POLICY IF EXISTS "Supervisors can delete their own assessments" ON project_assessments;
DROP POLICY IF EXISTS "Supervisors can view their own assessments" ON project_assessments;
DROP POLICY IF EXISTS "Admins can view all assessments" ON project_assessments;
DROP POLICY IF EXISTS "Admins can insert any assessment" ON project_assessments;
DROP POLICY IF EXISTS "Admins can update any assessment" ON project_assessments;
DROP POLICY IF EXISTS "Admins can delete any assessment" ON project_assessments;
DROP POLICY IF EXISTS "Admins can manage all assessments" ON project_assessments;

-- Create a simple SELECT policy that allows:
-- 1. Supervisors to see their own assessments
-- 2. Admins to see all assessments
CREATE POLICY "Select assessments policy"
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

-- Create a simple INSERT policy that allows:
-- 1. Supervisors to insert assessments with their own ID
-- 2. Admins to insert any assessment
CREATE POLICY "Insert assessments policy"
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

-- Create a simple UPDATE policy that allows:
-- 1. Supervisors to update their own assessments
-- 2. Admins to update any assessment
CREATE POLICY "Update assessments policy"
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

-- Create a simple DELETE policy that allows:
-- 1. Supervisors to delete their own assessments
-- 2. Admins to delete any assessment
CREATE POLICY "Delete assessments policy"
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
