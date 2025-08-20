-- SUPABASE_ADMIN_ASSESSMENT_FIX.sql
-- Fix RLS policies to ensure all assessments are visible to admins

-- Helper functions for role checking
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_supervisor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'supervisor'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Drop existing policies on project_assessments
DROP POLICY IF EXISTS "Supervisors can insert their own assessments" ON project_assessments;
DROP POLICY IF EXISTS "Supervisors can update their own assessments" ON project_assessments;
DROP POLICY IF EXISTS "Supervisors can delete their own assessments" ON project_assessments;
DROP POLICY IF EXISTS "Supervisors can view their own assessments" ON project_assessments;
DROP POLICY IF EXISTS "Admins can view all assessments" ON project_assessments;
DROP POLICY IF EXISTS "Admins can manage all assessments" ON project_assessments;

-- Create new policies with clearer names and improved logic

-- SELECT policy for supervisors - they can only see their own assessments
CREATE POLICY "Supervisors can view their own assessments"
ON project_assessments
FOR SELECT
TO authenticated
USING (
  supervisor_id = auth.uid() AND is_supervisor()
);

-- SELECT policy for admins - they can see ALL assessments regardless of supervisor
CREATE POLICY "Admins can view all assessments"
ON project_assessments
FOR SELECT
TO authenticated
USING (
  is_admin()
);

-- INSERT policy for supervisors - they can only insert with their own ID
CREATE POLICY "Supervisors can insert their own assessments"
ON project_assessments
FOR INSERT
TO authenticated
WITH CHECK (
  supervisor_id = auth.uid() AND is_supervisor()
);

-- INSERT policy for admins - they can insert assessments for any supervisor
CREATE POLICY "Admins can insert any assessment"
ON project_assessments
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin()
);

-- UPDATE policy for supervisors - they can only update their own assessments
CREATE POLICY "Supervisors can update their own assessments"
ON project_assessments
FOR UPDATE
TO authenticated
USING (
  supervisor_id = auth.uid() AND is_supervisor()
)
WITH CHECK (
  supervisor_id = auth.uid() AND is_supervisor()
);

-- UPDATE policy for admins - they can update any assessment
CREATE POLICY "Admins can update any assessment"
ON project_assessments
FOR UPDATE
TO authenticated
USING (
  is_admin()
)
WITH CHECK (
  is_admin()
);

-- DELETE policy for supervisors - they can only delete their own assessments
CREATE POLICY "Supervisors can delete their own assessments"
ON project_assessments
FOR DELETE
TO authenticated
USING (
  supervisor_id = auth.uid() AND is_supervisor()
);

-- DELETE policy for admins - they can delete any assessment
CREATE POLICY "Admins can delete any assessment"
ON project_assessments
FOR DELETE
TO authenticated
USING (
  is_admin()
);

-- Ensure RLS is enabled on the table
ALTER TABLE project_assessments ENABLE ROW LEVEL SECURITY;

-- Verify if project_assessments table exists and create it if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'project_assessments'
  ) THEN
    CREATE TABLE project_assessments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      student_id TEXT NOT NULL,
      supervisor_id UUID NOT NULL REFERENCES auth.users(id),
      project_title TEXT NOT NULL,
      total_score NUMERIC NOT NULL,
      general_comments TEXT,
      criteria_scores JSONB NOT NULL,
      is_group_assessment BOOLEAN DEFAULT FALSE,
      group_name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    ALTER TABLE project_assessments ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;
