-- This SQL script sets up the student-supervisor relationship tables and views
-- Run this in your Supabase SQL Editor

-- Create the student_supervisor_relationships table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.student_supervisor_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  supervisor_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  project_title TEXT,
  assigned_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, supervisor_id)
);

-- Add constraint to ensure a student has only one active supervisor
ALTER TABLE public.student_supervisor_relationships DROP CONSTRAINT IF EXISTS unique_active_student_supervisor;
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_student_supervisor 
  ON public.student_supervisor_relationships (student_id) 
  WHERE status = 'active';

-- Create a view to show relationship details with names
CREATE OR REPLACE VIEW public.student_supervisor_relationships_view AS
SELECT 
  r.id,
  r.student_id,
  r.supervisor_id,
  s.full_name AS student_name,
  s.reference_number AS student_reference,
  p.full_name AS supervisor_name,
  p.reference_number AS supervisor_reference,
  s.department,
  r.status,
  r.project_title,
  r.assigned_date,
  r.created_at,
  r.updated_at
FROM 
  public.student_supervisor_relationships r
JOIN 
  public.profiles s ON r.student_id = s.id
JOIN 
  public.profiles p ON r.supervisor_id = p.id
WHERE 
  s.user_type = 'student' AND p.user_type = 'supervisor';

-- Create a view for supervisor workload
CREATE OR REPLACE VIEW public.supervisor_workload_view AS
SELECT 
  p.id AS supervisor_id,
  p.full_name AS supervisor_name,
  p.reference_number,
  p.department,
  COUNT(r.student_id) AS student_count
FROM 
  public.profiles p
LEFT JOIN 
  public.student_supervisor_relationships r ON p.id = r.supervisor_id AND r.status = 'active'
WHERE 
  p.user_type = 'supervisor'
GROUP BY 
  p.id, p.full_name, p.reference_number, p.department
ORDER BY 
  student_count DESC;

-- Add RLS policies
ALTER TABLE public.student_supervisor_relationships ENABLE ROW LEVEL SECURITY;

-- Policy for viewing relationships (allow all authenticated users to view)
CREATE POLICY "View relationships" 
  ON public.student_supervisor_relationships 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Policy for inserting relationships (allow admins only)
CREATE POLICY "Insert relationships" 
  ON public.student_supervisor_relationships 
  FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE user_type = 'admin'
    )
  );

-- Policy for updating relationships (allow admins only)
CREATE POLICY "Update relationships" 
  ON public.student_supervisor_relationships 
  FOR UPDATE 
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE user_type = 'admin'
    )
  );

-- Policy for deleting relationships (allow admins only)
CREATE POLICY "Delete relationships" 
  ON public.student_supervisor_relationships 
  FOR DELETE 
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE user_type = 'admin'
    )
  );

-- Grant access to the views
GRANT SELECT ON public.student_supervisor_relationships_view TO authenticated;
GRANT SELECT ON public.supervisor_workload_view TO authenticated; 