-- Quick fix for the remaining view reference
-- Run this AFTER running the main SQL setup file

-- Update the get_group_statistics function to use the correct view name
CREATE OR REPLACE FUNCTION public.get_group_statistics()
RETURNS TABLE (
  total_groups BIGINT,
  active_groups BIGINT,
  total_members BIGINT,
  available_students BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.student_groups) as total_groups,
    (SELECT COUNT(*) FROM public.student_groups WHERE status = 'active') as active_groups,
    (SELECT COUNT(*) FROM public.group_members WHERE status = 'active') as total_members,
    (SELECT COUNT(*) FROM public.unassigned_students_admin_view) as available_students;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
