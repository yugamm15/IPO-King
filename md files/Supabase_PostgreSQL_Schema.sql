-- ============================================================================
-- IPO MANAGEMENT SYSTEM - Complete Enterprise Supabase PostgreSQL Schema
-- Includes Clean Table Reset + All 9 Enterprise Tables + RLS Policies Disabled
-- ============================================================================

-- STEP 1: DROP ALL EXISTING TABLES IN CORRECT DEPENDENCY ORDER
DROP TABLE IF EXISTS bulk_import_logs CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS ipo_allotments CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS customer_documents CASCADE;
DROP TABLE IF EXISTS customer_beneficiaries CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS ipos CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- STEP 2: CREATE ALL ENTERPRISE TABLES

-- 1. USERS TABLE
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. CUSTOMERS TABLE (All 17 Excel Columns Mapped + Extended Fields)
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    customer_no INT UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    name VARCHAR(150),
    ca_number VARCHAR(50),
    pan_number VARCHAR(20) UNIQUE NOT NULL,
    dpid VARCHAR(50),
    bank_account_no VARCHAR(50),
    login_id VARCHAR(100),
    password_encrypted VARCHAR(255),
    code VARCHAR(50),
    mobile_number VARCHAR(20),
    balance NUMERIC(15, 2) DEFAULT 0.00,
    phone_alternate VARCHAR(20),
    email VARCHAR(100),
    phone_other VARCHAR(20),
    return_amount NUMERIC(12, 2) DEFAULT 0.00,
    tds_remarks TEXT,
    beneficiary_name VARCHAR(100),
    bank_name VARCHAR(100),
    ifsc_code VARCHAR(20),
    upi_id VARCHAR(100),
    address TEXT,
    kyc_status VARCHAR(20) DEFAULT 'verified',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CUSTOMER BENEFICIARIES TABLE
CREATE TABLE customer_beneficiaries (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    beneficiary_name VARCHAR(100) NOT NULL,
    beneficiary_bank_account VARCHAR(50),
    beneficiary_ifsc VARCHAR(20),
    beneficiary_relationship VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CUSTOMER DOCUMENTS TABLE
CREATE TABLE customer_documents (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE
);

-- 5. IPOS TABLE (IPO Master Catalog)
CREATE TABLE ipos (
    id SERIAL PRIMARY KEY,
    ipo_name VARCHAR(150) UNIQUE NOT NULL,
    company_name VARCHAR(150),
    symbol VARCHAR(50),
    price_band_min NUMERIC(10, 2) DEFAULT 0,
    price_band_max NUMERIC(10, 2) DEFAULT 0,
    lot_size INT DEFAULT 1,
    subscription_open_date VARCHAR(100),
    subscription_close_date VARCHAR(100),
    open_date DATE,
    close_date DATE,
    listing_date DATE,
    status VARCHAR(50) DEFAULT 'open',
    gain_est VARCHAR(100) DEFAULT '+₹150/sh Est.',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. APPLICATIONS TABLE (Customer IPO Bids)
CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    ipo_id INT REFERENCES ipos(id) ON DELETE CASCADE,
    application_number VARCHAR(100),
    category VARCHAR(50) DEFAULT 'RETAIL',
    quantity INT NOT NULL DEFAULT 1,
    bid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    allotment_status VARCHAR(50) DEFAULT 'Pending',
    allotted_quantity INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. IPO ALLOTMENTS & PROFIT SPLIT LEDGER (40-60 Split & 10% TDS)
CREATE TABLE ipo_allotments (
    id SERIAL PRIMARY KEY,
    application_id INT REFERENCES applications(id) ON DELETE CASCADE,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    ipo_id INT REFERENCES ipos(id) ON DELETE CASCADE,
    applied_qty INT NOT NULL DEFAULT 0,
    allotted_qty INT NOT NULL DEFAULT 0,
    allotment_price NUMERIC(10, 2) DEFAULT 0,
    listing_price NUMERIC(10, 2) DEFAULT 0,
    total_profit NUMERIC(12, 2) DEFAULT 0.00,
    customer_profit_share_40pct NUMERIC(12, 2) DEFAULT 0.00,
    company_profit_share_60pct NUMERIC(12, 2) DEFAULT 0.00,
    tds_amount_10pct NUMERIC(12, 2) DEFAULT 0.00,
    net_payout NUMERIC(12, 2) DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. PAYMENT TRANSACTIONS TABLE
CREATE TABLE payment_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    application_id INT REFERENCES applications(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    reference_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. BULK IMPORT LOGS TABLE
CREATE TABLE bulk_import_logs (
    id SERIAL PRIMARY KEY,
    import_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255),
    total_rows INT DEFAULT 0,
    successful_rows INT DEFAULT 0,
    failed_rows INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- STEP 3: DISABLE ROW LEVEL SECURITY (RLS) FOR UNRESTRICTED FULL APP ACCESS
ALTER TABLE ipos DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_allotments DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_beneficiaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_import_logs DISABLE ROW LEVEL SECURITY;
