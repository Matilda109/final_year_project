-- Project Assessment Table for storing supervisor evaluations
CREATE TABLE IF NOT EXISTS project_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL,
  project_title TEXT NOT NULL,
  total_score NUMERIC(5,2) NOT NULL,
  general_comments TEXT,
  criteria_scores JSONB NOT NULL,
  is_group_assessment BOOLEAN DEFAULT FALSE,
  group_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  supervisor_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Add RLS policies for project_assessments
ALTER TABLE project_assessments ENABLE ROW LEVEL SECURITY;

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Policy for supervisors to view their own assessments
CREATE POLICY "Supervisors can view their own assessments" 
ON project_assessments FOR SELECT 
TO authenticated
USING (
  supervisor_id = auth.uid() OR
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

-- Policy for supervisors to insert their own assessments
CREATE POLICY "Supervisors can insert assessments" 
ON project_assessments FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'supervisor' OR role = 'admin'
  )
);

-- Policy for supervisors to update their own assessments
CREATE POLICY "Supervisors can update their own assessments" 
ON project_assessments FOR UPDATE
TO authenticated
USING (supervisor_id = auth.uid())
WITH CHECK (supervisor_id = auth.uid());

-- Create view for students to see their own assessments
CREATE OR REPLACE VIEW student_assessments_view AS
SELECT 
  pa.id,
  pa.student_id,
  pa.project_title,
  pa.total_score,
  pa.general_comments,
  pa.criteria_scores,
  pa.is_group_assessment,
  pa.group_name,
  pa.created_at,
  u.email as supervisor_email,
  u.raw_user_meta_data->>'full_name' as supervisor_name
FROM 
  project_assessments pa
JOIN 
  auth.users u ON pa.supervisor_id = u.id;

-- Create RLS policy for the view
CREATE POLICY "Students can view their own assessments" 
ON student_assessments_view FOR SELECT 
TO authenticated
USING (
  student_id = (SELECT student_id FROM profiles WHERE user_id = auth.uid()) OR
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin' OR role = 'supervisor'
  )
);

-- Create function to get assessment statistics for supervisors
CREATE OR REPLACE FUNCTION get_supervisor_assessment_stats(supervisor_uuid UUID)
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
CREATE OR REPLACE FUNCTION get_student_assessment_stats(student_id_param TEXT)
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
    student_id = student_id_param;
END;
$$;

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_assessments_modtime
BEFORE UPDATE ON project_assessments
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
