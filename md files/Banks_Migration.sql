-- ============================================================================
-- IPO KING - BANK MASTER & CUSTOMER BANK COLUMN SQL MIGRATION
-- Supports: Supabase (PostgreSQL) & MySQL 5.7 / 8.0+
-- ============================================================================

-- ============================================================================
-- OPTION 1: SUPABASE / POSTGRESQL QUERIES (Run in Supabase SQL Editor)
-- ============================================================================

-- 1. Create the 'banks' table if it doesn't already exist
CREATE TABLE IF NOT EXISTS banks (
    id SERIAL PRIMARY KEY,
    bank_name VARCHAR(150) UNIQUE NOT NULL,
    ifsc_prefix VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Disable Row Level Security (RLS) for unrestricted app access
ALTER TABLE banks DISABLE ROW LEVEL SECURITY;

-- 3. Ensure 'bank_name' column exists in the 'customers' table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);

-- 4. Seed Standard & Popular Indian Banks into 'banks' table
INSERT INTO banks (bank_name, ifsc_prefix) VALUES
    ('HDFC Bank', 'HDFC'),
    ('State Bank of India (SBI)', 'SBIN'),
    ('ICICI Bank', 'ICIC'),
    ('Axis Bank', 'UTIB'),
    ('Kotak Mahindra Bank', 'KKBK'),
    ('Punjab National Bank (PNB)', 'PUNB'),
    ('Bank of Baroda', 'BARB'),
    ('Canara Bank', 'CNRB'),
    ('Union Bank of India', 'UBIN'),
    ('IndusInd Bank', 'INDB'),
    ('IDFC FIRST Bank', 'IDFB'),
    ('Yes Bank', 'YESB'),
    ('Federal Bank', 'FDRL'),
    ('Bank of India (BOI)', 'BKID'),
    ('Central Bank of India', 'CBIN'),
    ('Indian Bank', 'IDIB'),
    ('AU Small Finance Bank', 'AUBL'),
    ('Bandhan Bank', 'BDBL')
ON CONFLICT (bank_name) DO NOTHING;


-- ============================================================================
-- OPTION 2: MYSQL QUERIES (Run in MySQL / phpMyAdmin / Workbench)
-- ============================================================================

-- 1. Use the ipo_management database
USE ipo_management;

-- 2. Create the 'banks' table
CREATE TABLE IF NOT EXISTS banks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bank_name VARCHAR(150) UNIQUE NOT NULL,
    ifsc_prefix VARCHAR(20) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bank_name (bank_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Add 'bank_name' column to 'customers' table if not exists
-- (Note: in MySQL, if bank_name already exists, this can be skipped)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) AFTER dpid;

-- 4. Seed Standard & Popular Indian Banks into 'banks' table
INSERT IGNORE INTO banks (bank_name, ifsc_prefix) VALUES
    ('HDFC Bank', 'HDFC'),
    ('State Bank of India (SBI)', 'SBIN'),
    ('ICICI Bank', 'ICIC'),
    ('Axis Bank', 'UTIB'),
    ('Kotak Mahindra Bank', 'KKBK'),
    ('Punjab National Bank (PNB)', 'PUNB'),
    ('Bank of Baroda', 'BARB'),
    ('Canara Bank', 'CNRB'),
    ('Union Bank of India', 'UBIN'),
    ('IndusInd Bank', 'INDB'),
    ('IDFC FIRST Bank', 'IDFB'),
    ('Yes Bank', 'YESB'),
    ('Federal Bank', 'FDRL'),
    ('Bank of India (BOI)', 'BKID'),
    ('Central Bank of India', 'CBIN'),
    ('Indian Bank', 'IDIB'),
    ('AU Small Finance Bank', 'AUBL'),
    ('Bandhan Bank', 'BDBL');
