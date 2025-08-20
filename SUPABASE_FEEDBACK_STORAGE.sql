-- Create storage policies for feedback files

-- For uploading files (INSERT)
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

-- For viewing files (SELECT)
CREATE POLICY "Anyone can view feedback files" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] = 'feedback'
  );

-- For updating files (UPDATE)
CREATE POLICY "Supervisors can update their own feedback files" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] = 'feedback' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- For deleting files (DELETE)
CREATE POLICY "Supervisors can delete their own feedback files" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] = 'feedback' AND
    (storage.foldername(name))[2] = auth.uid()::text
  ); 