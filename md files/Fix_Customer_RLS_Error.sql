-- ==============================================================================
-- IPO KING - Fix for Customer & Application RLS Policy Error
-- ==============================================================================
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
--
-- This resolves:
-- "Database error: new row violates row-level security policy for table 'customers'"
-- and allows both Manual Customer Creation and Bulk Excel Import to succeed.
-- ==============================================================================

-- OPTION A: DISABLE RLS (Recommended for internal admin dashboard apps)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_beneficiaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ipos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS banks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bulk_import_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ipo_allotments DISABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- OPTION B: IF YOU PREFER TO KEEP RLS ENABLED WITH OPEN POLICIES FOR THE APP:
-- (Uncomment below if you strictly want RLS enabled)
-- ------------------------------------------------------------------------------
/*
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon and auth full access to customers" ON customers;
CREATE POLICY "Allow anon and auth full access to customers"
ON customers FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

ALTER TABLE IF EXISTS customer_beneficiaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon and auth full access to customer_beneficiaries" ON customer_beneficiaries;
CREATE POLICY "Allow anon and auth full access to customer_beneficiaries"
ON customer_beneficiaries FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

ALTER TABLE IF EXISTS customer_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon and auth full access to customer_documents" ON customer_documents;
CREATE POLICY "Allow anon and auth full access to customer_documents"
ON customer_documents FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

ALTER TABLE IF EXISTS applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon and auth full access to applications" ON applications;
CREATE POLICY "Allow anon and auth full access to applications"
ON applications FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);
*/

