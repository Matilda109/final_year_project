-- SUPABASE_ADMIN_ASSESSMENT_FUNCTION.sql
-- Create a function to bypass RLS for admin assessment fetching

-- First, check if the function already exists and drop it if it does
DROP FUNCTION IF EXISTS public.get_all_assessments_for_admin();

-- Create the function to get all assessments regardless of RLS
CREATE OR REPLACE FUNCTION public.get_all_assessments_for_admin()
RETURNS SETOF project_assessments
LANGUAGE plpgsql
SECURITY DEFINER -- This makes the function run with the privileges of the creator
AS $$
BEGIN
  -- Return all assessments without any filtering
  RETURN QUERY SELECT * FROM project_assessments;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_assessments_for_admin() TO authenticated;

-- Add comment to the function
COMMENT ON FUNCTION public.get_all_assessments_for_admin() IS 'Gets all project assessments bypassing RLS for admin dashboard';
