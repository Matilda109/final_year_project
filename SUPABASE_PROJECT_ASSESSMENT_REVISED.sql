-- Project Assessment Table for storing supervisor evaluations
-- This script creates and configures the project assessment functionality
-- Compatible with existing student-supervisor relationships and group assignments

-- Create project_assessments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.project_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id), -- Changed to UUID to match profiles table
  project_title TEXT NOT NULL,
  total_score NUMERIC(5,2) NOT NULL,
  general_comments TEXT,
  criteria_scores JSONB NOT NULL,
  is_group_assessment BOOLEAN DEFAULT FALSE,
  group_id UUID REFERENCES public.student_groups(id), -- Added proper foreign key
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  supervisor_id UUID NOT NULL REFERENCES public.profiles(id) -- Changed to reference profiles
);

-- Add RLS policies for project_assessments
ALTER TABLE public.project_assessments ENABLE ROW LEVEL SECURITY;

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_assessments_modtime
BEFORE UPDATE ON public.project_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();

-- Create user_roles table if it doesn't exist (for admin/supervisor role management)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Policy for supervisors to view assessments
CREATE POLICY "Supervisors can view assessments" 
ON public.project_assessments FOR SELECT 
TO authenticated
USING (
  -- Supervisor can view their own assessments
  supervisor_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR
  -- Admins can view all assessments
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Policy for supervisors to insert assessments
CREATE POLICY "Supervisors can insert assessments" 
ON public.project_assessments FOR INSERT 
TO authenticated
WITH CHECK (
  -- Only supervisors and admins can insert assessments
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.user_id = ur.user_id
    WHERE p.user_id = auth.uid() 
    AND p.id = supervisor_id -- Ensure the supervisor_id matches the current user's profile
    AND (ur.role = 'supervisor' OR ur.role = 'admin')
  )
);

-- Policy for supervisors to update their own assessments
CREATE POLICY "Supervisors can update their own assessments" 
ON public.project_assessments FOR UPDATE
TO authenticated
USING (
  supervisor_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  supervisor_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Create view for students to see their own assessments
CREATE OR REPLACE VIEW public.student_assessments_view AS
SELECT 
  pa.id,
  pa.student_id,
  s.reference_number AS student_reference,
  s.full_name AS student_name,
  pa.project_title,
  pa.total_score,
  pa.general_comments,
  pa.criteria_scores,
  pa.is_group_assessment,
  sg.name AS group_name,
  pa.created_at,
  pa.updated_at,
  sup.full_name AS supervisor_name,
  sup.reference_number AS supervisor_reference,
  sup.email AS supervisor_email
FROM 
  public.project_assessments pa
JOIN 
  public.profiles s ON pa.student_id = s.id
JOIN 
  public.profiles sup ON pa.supervisor_id = sup.id
LEFT JOIN
  public.student_groups sg ON pa.group_id = sg.id;

-- Create RLS policy for the view
CREATE POLICY "Students can view their own assessments" 
ON public.student_assessments_view FOR SELECT 
TO authenticated
USING (
  -- Students can view their own assessments
  student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR
  -- Group members can view group assessments
  (is_group_assessment = true AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = (SELECT group_id FROM public.student_assessments_view WHERE id = id)
    AND gm.student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ))
  OR
  -- Supervisors can view assessments for their students
  EXISTS (
    SELECT 1 FROM public.student_supervisor_relationships ssr
    WHERE ssr.supervisor_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND ssr.student_id = student_id
  )
  OR
  -- Admins can view all assessments
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create function to get assessment statistics for supervisors
CREATE OR REPLACE FUNCTION public.get_supervisor_assessment_stats(supervisor_uuid UUID)
RETURNS TABLE (
  total_assessments BIGINT,
  average_score NUMERIC(5,2),
  individual_assessments BIGINT,
  group_assessments BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_assessments,
    COALESCE(AVG(total_score), 0)::NUMERIC(5,2) as average_score,
    COUNT(*) FILTER (WHERE NOT is_group_assessment)::BIGINT as individual_assessments,
    COUNT(*) FILTER (WHERE is_group_assessment)::BIGINT as group_assessments
  FROM 
    project_assessments
  WHERE 
    supervisor_id = supervisor_uuid;
END;
$$;

-- Create function to get assessment statistics for students
CREATE OR REPLACE FUNCTION public.get_student_assessment_stats(student_uuid UUID)
RETURNS TABLE (
  total_assessments BIGINT,
  average_score NUMERIC(5,2),
  individual_assessments BIGINT,
  group_assessments BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_assessments,
    COALESCE(AVG(total_score), 0)::NUMERIC(5,2) as average_score,
    COUNT(*) FILTER (WHERE NOT is_group_assessment)::BIGINT as individual_assessments,
    COUNT(*) FILTER (WHERE is_group_assessment)::BIGINT as group_assessments
  FROM 
    project_assessments
  WHERE 
    student_id = student_uuid;
END;
$$;

-- Create function to get group assessment statistics
CREATE OR REPLACE FUNCTION public.get_group_assessment_stats(group_uuid UUID)
RETURNS TABLE (
  total_assessments BIGINT,
  average_score NUMERIC(5,2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_assessments,
    COALESCE(AVG(total_score), 0)::NUMERIC(5,2) as average_score
  FROM 
    project_assessments
  WHERE 
    group_id = group_uuid;
END;
$$;

-- Create function to sync group assessments
-- This ensures all group members get the same assessment
CREATE OR REPLACE FUNCTION public.sync_group_assessment()
RETURNS TRIGGER AS $$
DECLARE
  student_record RECORD;
BEGIN
  -- Only proceed if this is a group assessment
  IF NEW.is_group_assessment = TRUE AND NEW.group_id IS NOT NULL THEN
    -- For each student in the group
    FOR student_record IN 
      SELECT student_id FROM public.group_members WHERE group_id = NEW.group_id
    LOOP
      -- Skip the student who already has the assessment
      IF student_record.student_id != NEW.student_id THEN
        -- Create identical assessment for this group member
        INSERT INTO public.project_assessments (
          student_id, project_title, total_score, general_comments,
          criteria_scores, is_group_assessment, group_id, supervisor_id
        ) VALUES (
          student_record.student_id, NEW.project_title, NEW.total_score, NEW.general_comments,
          NEW.criteria_scores, TRUE, NEW.group_id, NEW.supervisor_id
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync group assessments
CREATE TRIGGER sync_group_assessment_trigger
AFTER INSERT ON public.project_assessments
FOR EACH ROW
EXECUTE FUNCTION public.sync_group_assessment();

-- Add cleanup to comprehensive cleanup script
COMMENT ON TABLE public.project_assessments IS 'Stores supervisor evaluations of student projects';
