# Feedback System Setup

This document outlines the setup for the feedback system in the application.

## Database Schema

The feedback system uses the `feedback` table with the following structure:

```sql
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
```

## Storage Bucket Setup

The feedback system uses a Supabase storage bucket for file uploads:

1. Create a bucket named `project-files` in the Supabase dashboard
2. Set up the following storage policies:

**For uploading files (INSERT):**
```sql
CREATE POLICY "Supervisors can upload feedback files" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] = 'feedback' AND
    (storage.foldername(name))[2] = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.user_type = 'supervisor'
    )
  );
```

**For viewing files (SELECT):**
```sql
CREATE POLICY "Anyone can view feedback files" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] = 'feedback'
  );
```

**For updating files (UPDATE):**
```sql
CREATE POLICY "Supervisors can update their own feedback files" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] = 'feedback' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );
```

**For deleting files (DELETE):**
```sql
CREATE POLICY "Supervisors can delete their own feedback files" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] = 'feedback' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );
```

The file structure is:
```
project-files/
  feedback/
    [supervisor_id]/
      [random_filename].[extension]
```

## Key Fields

- `student_id`: The student who receives the feedback
- `supervisor_id`: The supervisor who gives the feedback
- `project_type`: The type of project milestone (proposal, literature, methodology, implementation, thesis)
- `status`: The status of the feedback (approved, revisions, rejected)
- `comments`: The feedback text (can be plain text or structured JSON)
- `document_url`: Optional URL to an attached document
- `submission_id`: Optional reference to a specific project submission

## Row Level Security Policies

The following RLS policies are applied:

1. Supervisors can create feedback
2. Supervisors can view, update, and delete their own feedback
3. Students can view feedback they've received

## Feedback View

A view called `feedback_view` is created to provide additional information about the feedback:

```sql
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
```

## Usage

### Supervisors

Supervisors can:
- Select a student and submission to provide feedback on
- Set the status of the feedback (approved, revisions, rejected)
- Write detailed comments
- Attach a review document
- View their feedback history

### Students

Students can:
- View feedback they've received from their supervisor
- See the status of their submissions
- Download attached review documents
- Respond to feedback (if revisions are required)

## Structured Comments

The feedback system supports structured comments in JSON format:

```json
[
  {
    "title": "Data Collection Section",
    "type": "negative",
    "content": "The data collection methodology is not clearly defined..."
  },
  {
    "title": "Analysis Approach",
    "type": "neutral",
    "content": "Your analysis approach needs more detail..."
  },
  {
    "title": "Literature Review",
    "type": "positive",
    "content": "Your literature review is thorough and well-structured..."
  }
]
```

The system will automatically detect and display structured comments with appropriate styling.

## Related Files

- `src/app/admin/supervisordashboard/components/pages/feedback.tsx` - Supervisor feedback interface
- `src/app/admin/studentdashboard/components/tabs/feedback-tab.tsx` - Student feedback display
- `src/app/admin/supervisordashboard/lib/data.ts` - Data fetching functions
- `src/app/admin/supervisordashboard/lib/types.ts` - Type definitions
- `SUPABASE_FEEDBACK_SETUP.sql` - SQL setup for the feedback system 