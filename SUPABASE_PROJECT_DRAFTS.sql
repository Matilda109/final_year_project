-- Create the project_drafts table
CREATE TABLE IF NOT EXISTS public.project_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up Row Level Security
ALTER TABLE public.project_drafts ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to select their own drafts
CREATE POLICY "Users can view their own drafts"
  ON public.project_drafts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own drafts
CREATE POLICY "Users can insert their own drafts"
  ON public.project_drafts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own drafts
CREATE POLICY "Users can update their own drafts"
  ON public.project_drafts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to delete their own drafts
CREATE POLICY "Users can delete their own drafts"
  ON public.project_drafts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_project_drafts_updated_at
BEFORE UPDATE ON public.project_drafts
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_drafts TO authenticated; 