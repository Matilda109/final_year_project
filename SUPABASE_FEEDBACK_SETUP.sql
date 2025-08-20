-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id),
    supervisor_id UUID NOT NULL REFERENCES public.profiles(id),
    project_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('approved', 'revisions', 'rejected')),
    comments TEXT NOT NULL,
    document_url TEXT,
    submission_id UUID REFERENCES public.project_submissions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create trigger for feedback to update updated_at column
CREATE TRIGGER set_updated_at_feedback
BEFORE UPDATE ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create feedback view
CREATE OR REPLACE VIEW public.feedback_view AS
SELECT
    f.id,
    f.student_id,
    f.supervisor_id,
    f.project_type,
    f.status,
    f.comments,
    f.document_url,
    f.submission_id,
    f.created_at,
    f.updated_at,
    s_profile.full_name AS student_name,
    s_profile.reference_number AS student_reference,
    sup_profile.full_name AS supervisor_name,
    sup_profile.reference_number AS supervisor_reference,
    ps.title AS project_title
FROM
    public.feedback f
JOIN
    public.profiles s_profile ON f.student_id = s_profile.id
JOIN
    public.profiles sup_profile ON f.supervisor_id = sup_profile.id
LEFT JOIN
    public.project_submissions ps ON f.submission_id = ps.id;

-- Add RLS policies for feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow supervisors to create feedback
CREATE POLICY "Supervisors can create feedback" ON public.feedback
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.user_type = 'supervisor'
        )
    );

-- Allow supervisors to view feedback they've given
CREATE POLICY "Supervisors can view feedback they've given" ON public.feedback
    FOR SELECT
    TO authenticated
    USING (
        supervisor_id = auth.uid()
    );

-- Allow students to view feedback they've received
CREATE POLICY "Students can view feedback they've received" ON public.feedback
    FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid()
    );

-- Allow supervisors to update their own feedback
CREATE POLICY "Supervisors can update their own feedback" ON public.feedback
    FOR UPDATE
    TO authenticated
    USING (
        supervisor_id = auth.uid()
    )
    WITH CHECK (
        supervisor_id = auth.uid()
    );

-- Allow supervisors to delete their own feedback
CREATE POLICY "Supervisors can delete their own feedback" ON public.feedback
    FOR DELETE
    TO authenticated
    USING (
        supervisor_id = auth.uid()
    );

-- Grant access to the feedback view
GRANT SELECT ON public.feedback_view TO authenticated; 