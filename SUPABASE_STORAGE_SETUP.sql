-- This SQL script sets up the storage bucket and policies for project documents
-- Run this in your Supabase SQL Editor

-- First, check if the projects bucket exists and create it if it doesn't
-- Note: This part might need to be done through the Supabase UI if your SQL permissions don't allow it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'projects') THEN
    -- This might fail if SQL doesn't have permissions to create buckets
    -- If it fails, create the bucket through the Supabase UI
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('projects', 'projects', true);
    
    RAISE NOTICE 'Created projects bucket';
  ELSE
    RAISE NOTICE 'Projects bucket already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create bucket via SQL. Please create it through the Supabase UI';
END $$;

-- Drop any existing policies for the projects bucket to start fresh
DROP POLICY IF EXISTS "Allow authenticated uploads to projects" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads from projects" ON storage.objects;

-- Create policy for uploads (only authenticated users)
CREATE POLICY "Allow authenticated uploads to projects"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = (SELECT id FROM storage.buckets WHERE name = 'projects'));

-- Create policy for downloads (public access)
CREATE POLICY "Allow public downloads from projects"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = (SELECT id FROM storage.buckets WHERE name = 'projects'));

-- Output instructions for manual setup if needed
DO $$
BEGIN
  RAISE NOTICE '
If the bucket creation failed, please follow these steps in the Supabase UI:
1. Go to Storage in the Supabase dashboard
2. Click "Create bucket"
3. Name it "projects" (all lowercase)
4. Set it to "Public"
5. Enable RLS (Row Level Security)
';
END $$; 