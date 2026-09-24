-- ==============================================================================
-- IPO KING: SECURE STORAGE BUCKET CONFIGURATION & RLS POLICIES
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create or update the 'customer-docs' bucket as PRIVATE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'customer-docs',
    'customer-docs',
    false, -- Private bucket: Direct public access is blocked; requires signed URLs
    10485760, -- 10 MB per document
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 2. Drop any previous conflicting policies on storage.objects
DROP POLICY IF EXISTS "Allow upload customer documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow view customer documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow update customer documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete customer documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload customer documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view customer documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete customer documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload customer documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view customer documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update customer documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete customer documents" ON storage.objects;

-- 3. Policy: Allow uploading documents to 'customer-docs' (STRICTLY Authenticated & Service Role)
CREATE POLICY "Allow authenticated users to upload customer documents"
ON storage.objects FOR INSERT
TO authenticated, service_role
WITH CHECK (bucket_id = 'customer-docs');

-- 4. Policy: Allow viewing / signed URLs for 'customer-docs' (STRICTLY Authenticated & Service Role)
CREATE POLICY "Allow authenticated users to view customer documents"
ON storage.objects FOR SELECT
TO authenticated, service_role
USING (bucket_id = 'customer-docs');

-- 5. Policy: Allow updating documents in 'customer-docs' (STRICTLY Authenticated & Service Role)
CREATE POLICY "Allow authenticated users to update customer documents"
ON storage.objects FOR UPDATE
TO authenticated, service_role
USING (bucket_id = 'customer-docs');

-- 6. Policy: Allow deleting documents in 'customer-docs' (STRICTLY Authenticated & Service Role)
CREATE POLICY "Allow authenticated users to delete customer documents"
ON storage.objects FOR DELETE
TO authenticated, service_role
USING (bucket_id = 'customer-docs');
