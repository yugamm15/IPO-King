-- ==============================================================================
-- IPO KING: DATABASE SCHEMA UPDATE & STORAGE CONFIGURATION
-- Run this script in the Supabase Dashboard -> SQL Editor -> New Query
-- ==============================================================================

-- 1. ADD 'profit_share_percentage' COLUMN TO CUSTOMERS TABLE (Allows 0% to 100%)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS profit_share_percentage NUMERIC(5, 2) DEFAULT 40.00;
UPDATE customers SET profit_share_percentage = 40.00 WHERE profit_share_percentage IS NULL;

-- 2. CREATE 'cash_withdrawals' TABLE FOR CASH PAYOUT TRACKING
CREATE TABLE IF NOT EXISTS cash_withdrawals (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    customer_name VARCHAR(255),
    pan_number VARCHAR(20),
    amount NUMERIC(12, 2) NOT NULL,
    previous_balance NUMERIC(12, 2) DEFAULT 0.00,
    new_balance NUMERIC(12, 2) DEFAULT 0.00,
    withdrawal_date DATE DEFAULT CURRENT_DATE,
    payment_mode VARCHAR(50) DEFAULT 'Cash',
    reference_no VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Disable Row Level Security on cash_withdrawals so the client portal can record payouts
ALTER TABLE cash_withdrawals DISABLE ROW LEVEL SECURITY;

-- 3. CONFIGURE 'customer-docs' STORAGE BUCKET FOR PDF & IMAGE UPLOADS (50 MB Limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'customer-docs',
    'customer-docs',
    true, -- Publicly readable bucket so downloaded PDFs & images open without authentication barriers
    52428800, -- 50 MB file size limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/octet-stream'];

-- 4. DROP PREVIOUS RESTRICTIVE POLICIES ON storage.objects
DROP POLICY IF EXISTS "Allow anon customer-docs upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon customer-docs select" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon customer-docs update" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon customer-docs delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload customer documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view customer documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update customer documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete customer documents" ON storage.objects;

-- 5. CREATE OPEN RLS POLICIES FOR 'customer-docs' STORAGE BUCKET
CREATE POLICY "Allow anon customer-docs upload"
ON storage.objects FOR INSERT
TO anon, authenticated, public
WITH CHECK (bucket_id = 'customer-docs');

CREATE POLICY "Allow anon customer-docs select"
ON storage.objects FOR SELECT
TO anon, authenticated, public
USING (bucket_id = 'customer-docs');

CREATE POLICY "Allow anon customer-docs update"
ON storage.objects FOR UPDATE
TO anon, authenticated, public
USING (bucket_id = 'customer-docs');

CREATE POLICY "Allow anon customer-docs delete"
ON storage.objects FOR DELETE
TO anon, authenticated, public
USING (bucket_id = 'customer-docs');

-- 6. VERIFICATION QUERY
SELECT 'Success! Schema and Storage Bucket updated successfully.' AS status;

