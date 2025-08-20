-- This SQL script sets up the storage bucket for project documents in Supabase
-- Run this in your Supabase SQL Editor

-- Create the storage bucket for project documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the project-documents bucket

-- Policy to allow authenticated users to view files in the bucket
CREATE POLICY "Anyone can view project documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'project-documents');

-- Policy to allow authenticated users to upload files to the bucket
CREATE POLICY "Authenticated users can upload project documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-documents' AND
  auth.role() = 'authenticated'
);

-- Policy to allow users to update their own files
CREATE POLICY "Users can update their own project documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'project-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'project-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow users to delete their own files
CREATE POLICY "Users can delete their own project documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'project-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Set up a trigger to clean up storage when a project submission is deleted
CREATE OR REPLACE FUNCTION delete_project_document()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the associated file from storage if it exists
  IF OLD.document_url IS NOT NULL THEN
    -- Extract the filename from the URL
    DECLARE
      filename TEXT;
    BEGIN
      filename := substring(OLD.document_url from '/([^/]+)$');
      IF filename IS NOT NULL THEN
        PERFORM storage.delete_object('project-documents', filename);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't block the deletion
      RAISE NOTICE 'Failed to delete storage object: %', SQLERRM;
    END;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run before a project submission is deleted
DROP TRIGGER IF EXISTS before_delete_project_submission ON public.project_submissions;
CREATE TRIGGER before_delete_project_submission
BEFORE DELETE ON public.project_submissions
FOR EACH ROW
EXECUTE FUNCTION delete_project_document(); 