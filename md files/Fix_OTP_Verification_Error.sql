-- ==============================================================================
-- IPO KING - Fix for "No active OTP found for this email" Error
-- ==============================================================================
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
--
-- Why this error occurs:
-- 1. Table RLS: 'otp_verifications' has Row-Level Security active, which prevents
--    the backend from storing OTPs across serverless container instances (e.g. on Vercel).
-- 2. Column Length: 'real_otp' and 'decoy_otp' were defined as VARCHAR(20), but
--    modern secure salted OTP hashes require VARCHAR(255) (64 hex characters).
-- ==============================================================================

-- 1. Ensure table exists with correct columns
CREATE TABLE IF NOT EXISTS otp_verifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    real_otp VARCHAR(255) NOT NULL,
    decoy_otp VARCHAR(255) NOT NULL,
    expires_at BIGINT NOT NULL,
    attempts INT DEFAULT 0,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Expand OTP hash columns to VARCHAR(255) if table was created with VARCHAR(20)
ALTER TABLE IF EXISTS otp_verifications ALTER COLUMN real_otp TYPE VARCHAR(255);
ALTER TABLE IF EXISTS otp_verifications ALTER COLUMN decoy_otp TYPE VARCHAR(255);

-- 3. Disable Row Level Security on otp_verifications so backend can store & verify OTPs
ALTER TABLE IF EXISTS otp_verifications DISABLE ROW LEVEL SECURITY;

-- 4. Clean up any stale expired records
DELETE FROM otp_verifications WHERE expires_at < (EXTRACT(EPOCH FROM NOW()) * 1000);

