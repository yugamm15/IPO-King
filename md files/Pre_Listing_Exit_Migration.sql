-- ============================================================================
-- PRE-LISTING EXIT & GREY MARKET SALE (KOSTAK / SAUDA / PRE-LISTING EXIT)
-- Database Migration Script for Supabase PostgreSQL & MySQL
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SUPABASE / POSTGRESQL MIGRATION (Run in Supabase SQL Editor)
-- ----------------------------------------------------------------------------

-- Add Pre-Listing Exit columns to 'ipos' table
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS exit_mode VARCHAR(50) DEFAULT 'MARKET';
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS kostak_rate NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS sauda_rate NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS pre_listing_price NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS exit_notes TEXT;

-- Add Profit and Pre-Listing columns to 'applications' table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS exit_mode VARCHAR(50) DEFAULT 'MARKET';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS kostak_rate NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS sauda_rate NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS exit_price NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS profit_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS client_share_60 NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS admin_share_40 NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS tds_10 NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS net_payout NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS settlement_remarks VARCHAR(255);

-- ----------------------------------------------------------------------------
-- 2. MYSQL MIGRATION (Run in MySQL / phpMyAdmin)
-- ----------------------------------------------------------------------------

USE ipo_management;

-- Add Pre-Listing Exit columns to 'ipos' table
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS exit_mode VARCHAR(50) DEFAULT 'MARKET' AFTER status;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS kostak_rate DECIMAL(10, 2) DEFAULT 0.00 AFTER exit_mode;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS sauda_rate DECIMAL(10, 2) DEFAULT 0.00 AFTER kostak_rate;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS pre_listing_price DECIMAL(10, 2) DEFAULT 0.00 AFTER sauda_rate;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS exit_notes TEXT AFTER pre_listing_price;

-- Add Profit and Pre-Listing columns to 'applications' table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS exit_mode VARCHAR(50) DEFAULT 'MARKET' AFTER allotment_status;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS kostak_rate DECIMAL(10, 2) DEFAULT 0.00 AFTER exit_mode;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS sauda_rate DECIMAL(10, 2) DEFAULT 0.00 AFTER kostak_rate;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS exit_price DECIMAL(10, 2) DEFAULT 0.00 AFTER sauda_rate;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS profit_amount DECIMAL(12, 2) DEFAULT 0.00 AFTER exit_price;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS client_share_60 DECIMAL(12, 2) DEFAULT 0.00 AFTER profit_amount;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS admin_share_40 DECIMAL(12, 2) DEFAULT 0.00 AFTER client_share_60;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS tds_10 DECIMAL(12, 2) DEFAULT 0.00 AFTER admin_share_40;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS net_payout DECIMAL(12, 2) DEFAULT 0.00 AFTER tds_10;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS settlement_remarks VARCHAR(255) AFTER net_payout;
