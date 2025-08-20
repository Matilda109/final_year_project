-- Function to get all students in groups assigned to a supervisor
CREATE OR REPLACE FUNCTION public.get_supervisor_group_students(supervisor_uuid UUID)
RETURNS TABLE (
  student_id TEXT,
  reference_number TEXT,
  full_name TEXT,
  student_name TEXT,
  group_id UUID,
  group_name TEXT,
  project_title TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id::TEXT as student_id,
    p.reference_number,
    p.full_name,
    p.full_name as student_name,
    sg.id as group_id,
    sg.name as group_name,
    sg.project_title
  FROM 
    profiles p
  JOIN 
    group_members gm ON p.id = gm.student_id
  JOIN 
    student_groups sg ON gm.group_id = sg.id
  WHERE 
    sg.supervisor_id = supervisor_uuid
    AND sg.is_active = true;
END;
$$;
