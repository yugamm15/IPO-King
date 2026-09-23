-- ============================================================================
-- IPO KING - CUSTOMER PROFIT SHARE MIGRATION SCRIPT
-- Supports: Supabase (PostgreSQL) & MySQL 5.7 / 8.0+
-- ============================================================================

-- ============================================================================
-- OPTION 1: SUPABASE / POSTGRESQL (Run in Supabase SQL Editor)
-- ============================================================================

-- 1. Add profit_share_percentage column to customers table with 40.00% default
ALTER TABLE customers ADD COLUMN IF NOT EXISTS profit_share_percentage NUMERIC(5, 2) DEFAULT 40.00;

-- 2. Backfill existing customer rows where profit_share_percentage is NULL
UPDATE customers SET profit_share_percentage = 40.00 WHERE profit_share_percentage IS NULL;

-- 3. Verify column addition
SELECT id, customer_no, full_name, pan_number, profit_share_percentage FROM customers LIMIT 10;


-- ============================================================================
-- OPTION 2: MYSQL (Run in MySQL / phpMyAdmin / Workbench)
-- ============================================================================

USE ipo_management;

-- 1. Add column to customers table if not exists
ALTER TABLE customers ADD COLUMN IF NOT EXISTS profit_share_percentage DECIMAL(5, 2) DEFAULT 40.00 AFTER bank_name;

-- 2. Backfill existing customer rows
UPDATE customers SET profit_share_percentage = 40.00 WHERE profit_share_percentage IS NULL;
