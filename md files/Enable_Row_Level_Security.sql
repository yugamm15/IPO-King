-- ==============================================================================
-- IPO KING - PRODUCTION ROW LEVEL SECURITY (RLS) & ACCESS CONTROL POLICIES
-- ==============================================================================
-- Execute this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- This locks down all tables against unauthenticated / public access.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON ALL PRODUCTION TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_verifications ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. CLEAN UP PREVIOUS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated full access to customers" ON customers;
DROP POLICY IF EXISTS "Allow service role full access to customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated access to customers" ON customers;
DROP POLICY IF EXISTS "Allow service role access to customers" ON customers;

DROP POLICY IF EXISTS "Allow authenticated access to customer_beneficiaries" ON customer_beneficiaries;
DROP POLICY IF EXISTS "Allow authenticated access to customer_documents" ON customer_documents;

DROP POLICY IF EXISTS "Allow authenticated full access to applications" ON applications;
DROP POLICY IF EXISTS "Allow authenticated access to applications" ON applications;

DROP POLICY IF EXISTS "Allow public read access to active ipos" ON ipos;
DROP POLICY IF EXISTS "Allow authenticated full access to ipos" ON ipos;
DROP POLICY IF EXISTS "Allow authenticated mutations to ipos" ON ipos;

DROP POLICY IF EXISTS "Allow public read access to banks" ON banks;
DROP POLICY IF EXISTS "Allow authenticated full access to banks" ON banks;
DROP POLICY IF EXISTS "Allow authenticated mutations to banks" ON banks;

DROP POLICY IF EXISTS "Allow public read access to system_settings" ON system_settings;
DROP POLICY IF EXISTS "Allow authenticated mutations to system_settings" ON system_settings;

DROP POLICY IF EXISTS "Allow authenticated access to profiles" ON profiles;

DROP POLICY IF EXISTS "Allow service role full access to otp_verifications" ON otp_verifications;
DROP POLICY IF EXISTS "Allow backend anon read/write to otp_verifications" ON otp_verifications;

-- ------------------------------------------------------------------------------
-- 3. CUSTOMERS & PII DATA (STRICTLY AUTHENTICATED & SERVICE ROLE ONLY)
-- Anonymous users CANNOT read or write any customer PAN, Bank, or Demat data.
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow authenticated access to customers"
ON customers
FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated access to customer_beneficiaries"
ON customer_beneficiaries
FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated access to customer_documents"
ON customer_documents
FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. APPLICATIONS & FINANCIAL LEDGER (STRICTLY AUTHENTICATED & SERVICE ROLE)
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow authenticated access to applications"
ON applications
FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. IPOS CATALOG (Public can read active IPOs; only authenticated can edit)
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow public read access to active ipos"
ON ipos
FOR SELECT
TO anon, authenticated, service_role
USING (true);

CREATE POLICY "Allow authenticated mutations to ipos"
ON ipos
FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. BANKS CATALOG (Public can read banks list; only authenticated can mutate)
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow public read access to banks"
ON banks
FOR SELECT
TO anon, authenticated, service_role
USING (true);

CREATE POLICY "Allow authenticated mutations to banks"
ON banks
FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. SYSTEM SETTINGS (Public can read calculation defaults; only authenticated can edit)
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow public read access to system_settings"
ON system_settings
FOR SELECT
TO anon, authenticated, service_role
USING (true);

CREATE POLICY "Allow authenticated mutations to system_settings"
ON system_settings
FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 8. PROFILES TABLE (Authenticated users and service role only)
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow authenticated access to profiles"
ON profiles
FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 9. OTP VERIFICATIONS (STRICTLY SERVICE ROLE / BACKEND API)
-- Prevents any client-side reading or tampering of OTP security hashes.
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow service role full access to otp_verifications"
ON otp_verifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- VERIFICATION QUERY
-- Run this to check all RLS status:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- ==============================================================================
