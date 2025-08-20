-- Fix for project_assessments RLS policies
-- This script updates the RLS policies to allow supervisors to properly insert assessments

-- First, drop the existing insert policy
DROP POLICY IF EXISTS "Supervisors can insert assessments" ON public.project_assessments;

-- Create a new, more permissive insert policy that ensures supervisor_id matches auth.uid()
CREATE POLICY "Supervisors can insert assessments" 
ON public.project_assessments FOR INSERT 
TO authenticated
WITH CHECK (
  -- Supervisor must be inserting their own assessment (supervisor_id = auth.uid())
  -- OR they must be an admin
  supervisor_id = auth.uid() OR
  auth.uid() IN (
    SELECT user_id FROM public.user_roles 
    WHERE role = 'admin'
  )
);

-- Also update the update policy to be more explicit
DROP POLICY IF EXISTS "Supervisors can update their own assessments" ON public.project_assessments;

CREATE POLICY "Supervisors can update their own assessments" 
ON public.project_assessments FOR UPDATE
TO authenticated
USING (
  -- Supervisor can only update their own assessments
  supervisor_id = auth.uid() OR
  -- Admins can update any assessment
  auth.uid() IN (
    SELECT user_id FROM public.user_roles 
    WHERE role = 'admin'
  )
)
WITH CHECK (
  -- Same conditions for the check clause
  supervisor_id = auth.uid() OR
  auth.uid() IN (
    SELECT user_id FROM public.user_roles 
    WHERE role = 'admin'
  )
);

-- Add a delete policy for completeness
DROP POLICY IF EXISTS "Supervisors can delete their own assessments" ON public.project_assessments;

CREATE POLICY "Supervisors can delete their own assessments" 
ON public.project_assessments FOR DELETE
TO authenticated
USING (
  -- Supervisor can only delete their own assessments
  supervisor_id = auth.uid() OR
  -- Admins can delete any assessment
  auth.uid() IN (
    SELECT user_id FROM public.user_roles 
    WHERE role = 'admin'
  )
);

-- Verify that the user has the supervisor role
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'supervisor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify that the user has the admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
