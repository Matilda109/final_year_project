-- Create resources table
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comment to the table
COMMENT ON TABLE public.resources IS 'Stores resources that can be accessed by students';

-- Create storage bucket for resources if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the resources table
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS admin_all_resources ON public.resources;
DROP POLICY IF EXISTS read_resources ON public.resources;
DROP POLICY IF EXISTS temp_insert_resources ON public.resources;
DROP POLICY IF EXISTS temp_delete_resources ON public.resources;

-- Create updated policies for resources table
-- Policy for admins: can do everything (using multiple conditions to ensure it works)
CREATE POLICY admin_all_resources
  ON public.resources
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_type' = 'admin') OR 
    (auth.jwt() ->> 'role' = 'admin') OR
    (auth.jwt() ->> 'email' IN (SELECT email FROM auth.users WHERE raw_user_meta_data->>'user_type' = 'admin'))
  );

-- More permissive policy for writes during testing
-- You can remove this later when everything is working
CREATE POLICY temp_insert_resources
  ON public.resources
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Temporary policy for deletes during testing
-- You can remove this later when everything is working
CREATE POLICY temp_delete_resources
  ON public.resources
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy for students and supervisors: can only read
CREATE POLICY read_resources
  ON public.resources
  FOR SELECT
  TO authenticated
  USING (true); -- Allow all authenticated users to read

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resources_updated_at
BEFORE UPDATE ON public.resources
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Storage policies for resources bucket
-- Drop existing policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects FOR SELECT;
DROP POLICY IF EXISTS "Resource Upload Access" ON storage.objects FOR INSERT;
DROP POLICY IF EXISTS "Resource Delete Access" ON storage.objects FOR DELETE;

-- Allow anyone to read resources
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'resources');

-- Allow all authenticated users to upload to resources bucket (more permissive)
CREATE POLICY "Resource Upload Access" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resources');

-- Allow all authenticated users to delete resources from storage (more permissive)
CREATE POLICY "Resource Delete Access" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'resources'); 