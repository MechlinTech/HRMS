-- ===================================================
-- MANUAL STORAGE SETUP FOR REFERRAL RESUMES BUCKET
-- ===================================================
-- Run these commands in your Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query)
-- 
-- NOTE: This app uses custom users table in public schema,
-- not Supabase auth schema

-- 1. First, check if bucket exists (optional - just to verify)
SELECT * FROM storage.buckets WHERE id = 'referral-resumes';

-- 2. Create the bucket if it doesn't exist (you mentioned you already created it)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('referral-resumes', 'referral-resumes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Enable RLS on storage.objects (should already be enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Drop any existing conflicting policies (run these one by one, ignore errors if policy doesn't exist)
DROP POLICY IF EXISTS "Users can upload referral resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view referral resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update referral resume uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete referral resume files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload referral resumes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view referral resumes" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users access to referral resumes" ON storage.objects;

-- 5. Create new policies for users in the public.users table

-- Allow users from public.users table to upload files
CREATE POLICY "Users can upload referral resumes"
  ON storage.objects 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    bucket_id = 'referral-resumes' 
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.status = 'active'
    )
  );

-- Allow users from public.users table to view/download files  
CREATE POLICY "Users can view referral resumes"
  ON storage.objects 
  FOR SELECT 
  TO authenticated 
  USING (
    bucket_id = 'referral-resumes'
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.status = 'active'
    )
  );

-- Allow users from public.users table to update files
CREATE POLICY "Users can update referral resume uploads"
  ON storage.objects 
  FOR UPDATE 
  TO authenticated 
  USING (
    bucket_id = 'referral-resumes'
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.status = 'active'
    )
  );

-- Allow users from public.users table to delete files (needed for cleanup)
CREATE POLICY "Users can delete referral resume files"
  ON storage.objects 
  FOR DELETE 
  TO authenticated 
  USING (
    bucket_id = 'referral-resumes'
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.status = 'active'
    )
  );

-- 6. Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%Users can%';

-- ===================================================
-- ALTERNATIVE: Simple approach for apps without Supabase auth
-- ===================================================

-- Drop the above policies if they don't work
-- DROP POLICY "Users can upload referral resumes" ON storage.objects;
-- DROP POLICY "Users can view referral resumes" ON storage.objects;
-- DROP POLICY "Users can update referral resume uploads" ON storage.objects;
-- DROP POLICY "Users can delete referral resume files" ON storage.objects;

-- Policy that allows anyone (including anonymous users) to access referral resumes
-- This works for apps that handle authentication separately
-- CREATE POLICY "Allow anyone to access referral resumes"
--   ON storage.objects 
--   FOR ALL 
--   TO anon, authenticated 
--   USING (bucket_id = 'referral-resumes')
--   WITH CHECK (bucket_id = 'referral-resumes');

-- ===================================================
-- FALLBACK: If RLS is causing too many issues, disable it temporarily
-- ===================================================
-- WARNING: Only use this for development/testing
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
