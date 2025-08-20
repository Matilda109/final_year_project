-- This SQL script sets up the project submissions table and related views
-- Run this in your Supabase SQL Editor

-- Create project submissions table
CREATE TABLE IF NOT EXISTS public.project_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  supervisor_id UUID NOT NULL REFERENCES public.profiles(id),
  project_type TEXT NOT NULL CHECK (project_type IN ('proposal', 'literature', 'methodology', 'implementation', 'thesis')),
  title TEXT NOT NULL,
  abstract TEXT,
  keywords TEXT[],
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add Row Level Security (RLS) policies
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;

-- Policy to allow students to view their own submissions
CREATE POLICY "Students can view their own submissions" 
ON public.project_submissions
FOR SELECT 
USING (
  auth.uid() = student_id
);

-- Policy to allow supervisors to view submissions assigned to them
CREATE POLICY "Supervisors can view submissions assigned to them" 
ON public.project_submissions
FOR SELECT 
USING (
  auth.uid() = supervisor_id
);

-- Policy to allow students to insert their own submissions
CREATE POLICY "Students can insert their own submissions" 
ON public.project_submissions
FOR INSERT 
WITH CHECK (
  auth.uid() = student_id
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

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_project_submissions_updated_at
BEFORE UPDATE ON public.project_submissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a view to show project submissions with student and supervisor details
CREATE OR REPLACE VIEW public.project_submissions_view AS
SELECT 
  ps.id,
  ps.student_id,
  ps.supervisor_id,
  s.full_name AS student_name,
  s.reference_number AS student_reference,
  p.full_name AS supervisor_name,
  p.reference_number AS supervisor_reference,
  ps.project_type,
  ps.title,
  ps.abstract,
  ps.keywords,
  ps.document_url,
  ps.status,
  ps.feedback,
  ps.submitted_at,
  ps.reviewed_at,
  ps.created_at,
  ps.updated_at
FROM 
  public.project_submissions ps
JOIN 
  public.profiles s ON ps.student_id = s.id
JOIN 
  public.profiles p ON ps.supervisor_id = p.id
WHERE 
  s.user_type = 'student' AND p.user_type = 'supervisor';

-- Create a view for pending submissions count
CREATE OR REPLACE VIEW public.pending_submissions_count AS
SELECT 
  supervisor_id,
  COUNT(*) AS total
FROM 
  public.project_submissions
WHERE 
  status = 'pending'
GROUP BY 
  supervisor_id; 