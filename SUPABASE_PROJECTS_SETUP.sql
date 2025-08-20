-- This SQL script sets up the project repository table and related views
-- Run this in your Supabase SQL Editor

-- Create projects repository table
CREATE TABLE IF NOT EXISTS public.project_repository (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  supervisor TEXT NOT NULL,
  year INTEGER NOT NULL,
  department TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  document_url TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add Row Level Security (RLS) policies
ALTER TABLE public.project_repository ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read projects
CREATE POLICY "Anyone can read projects" 
ON public.project_repository
FOR SELECT USING (true);

-- Policy to allow authenticated users to insert projects
CREATE POLICY "Authenticated users can insert projects" 
ON public.project_repository
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Policy to allow only admin users to update projects
CREATE POLICY "Admin users can update projects" 
ON public.project_repository
FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE user_type = 'admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE user_type = 'admin'
  )
);

-- Policy to allow only admin users to delete projects
CREATE POLICY "Admin users can delete projects" 
ON public.project_repository
FOR DELETE 
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE user_type = 'admin'
  )
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
CREATE TRIGGER update_project_repository_updated_at
BEFORE UPDATE ON public.project_repository
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 

-- Create project_deadlines table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.project_deadlines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_type TEXT NOT NULL,
    deadline_date TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT,
    supervisor_id UUID NOT NULL REFERENCES public.profiles(id),
    student_id UUID REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS policies for project_deadlines
ALTER TABLE public.project_deadlines ENABLE ROW LEVEL SECURITY;

-- Allow supervisors to create deadlines
CREATE POLICY "Supervisors can create deadlines" ON public.project_deadlines
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.user_type = 'supervisor'
        )
    );

-- Allow supervisors to view their own deadlines
CREATE POLICY "Supervisors can view their own deadlines" ON public.project_deadlines
    FOR SELECT
    TO authenticated
    USING (
        supervisor_id = auth.uid()
    );

-- Allow students to view deadlines assigned to them or all students from their supervisor
CREATE POLICY "Students can view their deadlines" ON public.project_deadlines
    FOR SELECT
    TO authenticated
    USING (
        (student_id = auth.uid() OR student_id IS NULL) AND
        EXISTS (
            SELECT 1 FROM public.student_supervisor_relationships
            WHERE student_supervisor_relationships.student_id = auth.uid()
            AND student_supervisor_relationships.supervisor_id = project_deadlines.supervisor_id
            AND student_supervisor_relationships.status = 'active'
        )
    );

-- Allow supervisors to update their own deadlines
CREATE POLICY "Supervisors can update their own deadlines" ON public.project_deadlines
    FOR UPDATE
    TO authenticated
    USING (
        supervisor_id = auth.uid()
    )
    WITH CHECK (
        supervisor_id = auth.uid()
    );

-- Allow supervisors to delete their own deadlines
CREATE POLICY "Supervisors can delete their own deadlines" ON public.project_deadlines
    FOR DELETE
    TO authenticated
    USING (
        supervisor_id = auth.uid()
    ); 

-- Create trigger for project_deadlines to update updated_at column
CREATE TRIGGER set_updated_at_project_deadlines
BEFORE UPDATE ON public.project_deadlines
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 