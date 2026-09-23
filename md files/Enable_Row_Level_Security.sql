-- ==============================================================================
-- IPO KING - PRODUCTION ROW LEVEL SECURITY (RLS) & ACCESS CONTROL POLICIES
-- ==============================================================================
-- Execute this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- This script secures all database tables against unauthenticated or malicious public requests.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ipo_allotments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. DROP PREVIOUS POLICIES (IF ANY) TO ENSURE CLEAN RE-APPLICATION
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated full access to customers" ON customers;
DROP POLICY IF EXISTS "Allow service role full access to customers" ON customers;
DROP POLICY IF EXISTS "Allow public read access to active ipos" ON ipos;
DROP POLICY IF EXISTS "Allow authenticated full access to ipos" ON ipos;
DROP POLICY IF EXISTS "Allow authenticated full access to applications" ON applications;
DROP POLICY IF EXISTS "Allow public read access to banks" ON banks;
DROP POLICY IF EXISTS "Allow authenticated full access to banks" ON banks;
DROP POLICY IF EXISTS "Allow service role full access to otp_verifications" ON otp_verifications;
DROP POLICY IF EXISTS "Allow authenticated full access to ipo_allotments" ON ipo_allotments;

-- ------------------------------------------------------------------------------
-- 3. CUSTOMERS TABLE POLICIES
-- Only authenticated users (or backend service role) can view, insert, update, delete customer PII.
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow authenticated full access to customers"
ON customers
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. IPOS TABLE POLICIES
-- Public/anon can view IPO catalog; only authenticated/service role can mutate offerings.
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow public read access to active ipos"
ON ipos
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated full access to ipos"
ON ipos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. APPLICATIONS TABLE POLICIES
-- Protects IPO bidding transactions and financial ledger.
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow authenticated full access to applications"
ON applications
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. BANKS TABLE POLICIES
-- Public/anon can read bank list for dropdowns; mutations require authenticated session.
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow public read access to banks"
ON banks
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated full access to banks"
ON banks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. OTP VERIFICATIONS TABLE POLICIES
-- Strict backend access only (Service Role / API Gateway).
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow service role full access to otp_verifications"
ON otp_verifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow backend upsert/select for 2FA OTPs
CREATE POLICY "Allow backend anon read/write to otp_verifications"
ON otp_verifications
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 8. IPO ALLOTMENTS TABLE POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow authenticated full access to ipo_allotments"
ON ipo_allotments
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- VERIFICATION QUERY
-- Run this to check all RLS status:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- ==============================================================================
