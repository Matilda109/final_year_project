-- This SQL script sets up the group assignment tables and views
-- Run this in your Supabase SQL Editor

-- Create the student_groups table
CREATE TABLE IF NOT EXISTS public.student_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  supervisor_id UUID NOT NULL REFERENCES public.profiles(id),
  project_title TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create the group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.student_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  joined_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, student_id)
);

-- Create a function to check if a student is already in an active group or individual assignment
CREATE OR REPLACE FUNCTION check_student_active_group()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the student is already in an active group
  IF EXISTS (
    SELECT 1 
    FROM public.group_members gm
    JOIN public.student_groups sg ON gm.group_id = sg.id
    WHERE gm.student_id = NEW.student_id 
    AND sg.status = 'active'
    AND gm.group_id != NEW.group_id
  ) THEN
    RAISE EXCEPTION 'Student is already a member of an active group';
  END IF;
  
  -- Check if the student already has an active individual supervisor assignment
  IF EXISTS (
    SELECT 1 
    FROM public.student_supervisor_relationships ssr
    WHERE ssr.student_id = NEW.student_id 
    AND ssr.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Student already has an active individual supervisor assignment';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the constraint
CREATE TRIGGER trigger_check_student_active_group
  BEFORE INSERT OR UPDATE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION check_student_active_group();

-- Create a view to show group details with supervisor information
CREATE OR REPLACE VIEW public.student_groups_view AS
SELECT 
  g.id,
  g.name,
  g.description,
  g.supervisor_id,
  s.full_name AS supervisor_name,
  s.reference_number AS supervisor_reference,
  s.department,
  g.project_title,
  g.status,
  g.created_date,
  g.created_at,
  g.updated_at,
  COUNT(gm.id) AS member_count
FROM 
  public.student_groups g
JOIN 
  public.profiles s ON g.supervisor_id = s.id
LEFT JOIN 
  public.group_members gm ON g.id = gm.group_id
WHERE 
  s.user_type = 'supervisor'
GROUP BY 
  g.id, g.name, g.description, g.supervisor_id, s.full_name, s.reference_number, s.department, g.project_title, g.status, g.created_date, g.created_at, g.updated_at;

-- Create a view to show group members with student information
CREATE OR REPLACE VIEW public.group_members_view AS
SELECT 
  gm.id,
  gm.group_id,
  gm.student_id,
  s.full_name AS student_name,
  s.reference_number AS student_reference,
  s.department AS student_department,
  gm.joined_date,
  g.name AS group_name,
  g.supervisor_id,
  sup.full_name AS supervisor_name
FROM 
  public.group_members gm
JOIN 
  public.profiles s ON gm.student_id = s.id
JOIN 
  public.student_groups g ON gm.group_id = g.id
JOIN 
  public.profiles sup ON g.supervisor_id = sup.id
WHERE 
  s.user_type = 'student' AND sup.user_type = 'supervisor';

-- Enable Row Level Security (RLS)
ALTER TABLE public.student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for student_groups
CREATE POLICY "Enable read access for all users" ON public.student_groups
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.student_groups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.student_groups
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.student_groups
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for group_members
CREATE POLICY "Enable read access for all users" ON public.group_members
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.group_members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.group_members
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.group_members
  FOR DELETE USING (auth.role() = 'authenticated');

-- Drop existing function if it exists (to handle return type changes)
DROP FUNCTION IF EXISTS get_group_statistics();

-- Create function to get group statistics
CREATE OR REPLACE FUNCTION get_group_statistics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_groups', (SELECT COUNT(*) FROM public.student_groups),
    'active_groups', (SELECT COUNT(*) FROM public.student_groups WHERE status = 'active'),
    'total_group_members', (SELECT COUNT(*) FROM public.group_members),
    'available_students', (
      SELECT COUNT(*) 
      FROM public.profiles p 
      WHERE p.user_type = 'student' 
      AND p.id NOT IN (
        SELECT DISTINCT gm.student_id 
        FROM public.group_members gm 
        JOIN public.student_groups g ON gm.group_id = g.id 
        WHERE g.status = 'active'
      )
      AND p.id NOT IN (
        SELECT DISTINCT ssr.student_id 
        FROM public.student_supervisor_relationships ssr 
        WHERE ssr.status = 'active'
      )
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON public.student_groups TO authenticated;
GRANT INSERT ON public.student_groups TO authenticated;
GRANT UPDATE ON public.student_groups TO authenticated;
GRANT DELETE ON public.student_groups TO authenticated;

GRANT SELECT ON public.group_members TO authenticated;
GRANT INSERT ON public.group_members TO authenticated;
GRANT UPDATE ON public.group_members TO authenticated;
GRANT DELETE ON public.group_members TO authenticated;

GRANT SELECT ON public.student_groups_view TO authenticated;
GRANT SELECT ON public.group_members_view TO authenticated;

GRANT EXECUTE ON FUNCTION get_group_statistics() TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_groups_supervisor_id ON public.student_groups(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_student_groups_status ON public.student_groups(status);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_student_id ON public.group_members(student_id);

-- Add triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_groups_updated_at 
  BEFORE UPDATE ON public.student_groups 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_members_updated_at 
  BEFORE UPDATE ON public.group_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
