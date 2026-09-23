-- ============================================================================
-- IPO KING - AADHAAR CARD NUMBER & BIRTHDATE (DOB) MIGRATION SCRIPT
-- Supports: Supabase (PostgreSQL) & MySQL 5.7 / 8.0+
-- ============================================================================

-- ============================================================================
-- OPTION 1: SUPABASE / POSTGRESQL (Run in Supabase Dashboard -> SQL Editor)
-- ============================================================================

-- 1. Add aadhaar_number and birthdate columns to customers table if not already present
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS birthdate DATE;

-- 2. (Optional) Create index on aadhaar_number for rapid lookups
CREATE INDEX IF NOT EXISTS idx_customers_aadhaar_number ON customers(aadhaar_number);

-- 3. Verify column addition
SELECT id, customer_no, full_name, pan_number, aadhaar_number, birthdate FROM customers LIMIT 10;


-- ============================================================================
-- OPTION 2: MYSQL 5.7 / 8.0+ (Run in phpMyAdmin / MySQL Workbench / Terminal)
-- ============================================================================

USE ipo_management;

-- 1. Add columns to customers table in MySQL
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(20) NULL AFTER pan_number,
ADD COLUMN IF NOT EXISTS birthdate DATE NULL AFTER aadhaar_number;

-- 2. Verify column addition
SELECT customer_id, customer_no, name, pan_number, aadhaar_number, birthdate FROM customers LIMIT 10;
