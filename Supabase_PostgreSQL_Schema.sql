-- ============================================================================
-- IPO MANAGEMENT SYSTEM - Supabase / PostgreSQL Database Schema
-- For: Free Supabase Cloud Database & Local PostgreSQL
-- ============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'manager', 'agent')) DEFAULT 'agent',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CUSTOMERS TABLE (All 17 Excel Columns Mapped)
CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    customer_no INT UNIQUE,
    name VARCHAR(100) NOT NULL,
    ca_number VARCHAR(50),
    pan_number VARCHAR(20) UNIQUE NOT NULL,
    dpid VARCHAR(50),
    bank_account_no VARCHAR(50) UNIQUE,
    login_id VARCHAR(100),
    password_encrypted VARCHAR(255),
    code VARCHAR(50),
    mobile_number VARCHAR(20) NOT NULL,
    balance NUMERIC(15, 2) DEFAULT 0.00,
    phone_alternate VARCHAR(20),
    email VARCHAR(100),
    phone_other VARCHAR(20),
    return_amount NUMERIC(12, 2) DEFAULT 0.00,
    tds_remarks TEXT,
    beneficiary_name VARCHAR(100),
    
    -- Additional System Fields
    aadhar_number VARCHAR(20),
    bank_name VARCHAR(100),
    ifsc_code VARCHAR(20),
    demat_account_no VARCHAR(50),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(10),
    kyc_status VARCHAR(20) CHECK (kyc_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
    documents_uploaded BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(user_id)
);

-- 3. CUSTOMER BENEFICIARIES TABLE
CREATE TABLE IF NOT EXISTS customer_beneficiaries (
    beneficiary_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    beneficiary_name VARCHAR(100) NOT NULL,
    beneficiary_bank_account VARCHAR(50),
    beneficiary_ifsc VARCHAR(20),
    beneficiary_relationship VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CUSTOMER DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS customer_documents (
    document_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    document_type VARCHAR(20) CHECK (document_type IN ('PAN', 'AADHAR', 'BANK_PROOF', 'DEMAT_STATEMENT', 'OTHER')) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(50),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INT REFERENCES users(user_id),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_notes TEXT
);

-- 5. IPO MASTER TABLE
CREATE TABLE IF NOT EXISTS ipo_master (
    ipo_id SERIAL PRIMARY KEY,
    ipo_name VARCHAR(150) NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    ipo_issue_size NUMERIC(15, 2),
    price_band_min NUMERIC(10, 2) NOT NULL,
    price_band_max NUMERIC(10, 2) NOT NULL,
    issue_price NUMERIC(10, 2),
    listing_price NUMERIC(10, 2),
    lot_size INT DEFAULT 1,
    minimum_qty INT DEFAULT 1,
    subscription_open_date DATE NOT NULL,
    subscription_close_date DATE NOT NULL,
    allotment_date DATE,
    listing_date DATE,
    payment_due_date DATE,
    status VARCHAR(20) CHECK (status IN ('upcoming', 'open', 'closed', 'allotted', 'listed', 'completed')) DEFAULT 'upcoming',
    exchange_listing VARCHAR(50),
    sector VARCHAR(100),
    company_description TEXT,
    prospectus_link VARCHAR(500),
    lead_manager VARCHAR(150),
    nse_symbol VARCHAR(20),
    bse_code VARCHAR(20),
    premium_loss_per_share NUMERIC(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(user_id)
);

-- 6. CUSTOMER IPO APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS customer_ipo_applications (
    application_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    ipo_id INT NOT NULL REFERENCES ipo_master(ipo_id) ON DELETE CASCADE,
    applied_quantity INT NOT NULL,
    application_amount NUMERIC(12, 2) NOT NULL,
    application_date DATE NOT NULL,
    application_status VARCHAR(20) CHECK (application_status IN ('applied', 'cancelled', 'rejected')) DEFAULT 'applied',
    allotted_quantity INT,
    allotment_status VARCHAR(20) CHECK (allotment_status IN ('full', 'partial', 'rejected')),
    allotment_date DATE,
    allotment_price NUMERIC(10, 2),
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'partial', 'completed', 'refunded')) DEFAULT 'pending',
    payment_date DATE,
    payment_amount_paid NUMERIC(12, 2) DEFAULT 0.00,
    profit_status VARCHAR(20) CHECK (profit_status IN ('pending', 'calculated', 'distributed')) DEFAULT 'pending',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (customer_id, ipo_id)
);

-- 7. IPO ALLOTMENTS & PROFIT SPLIT LEDGER TABLE
CREATE TABLE IF NOT EXISTS ipo_allotments (
    allotment_id SERIAL PRIMARY KEY,
    application_id INT NOT NULL REFERENCES customer_ipo_applications(application_id) ON DELETE CASCADE,
    customer_id INT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    ipo_id INT NOT NULL REFERENCES ipo_master(ipo_id) ON DELETE CASCADE,
    applied_qty INT NOT NULL,
    allotted_qty INT NOT NULL,
    allotment_price NUMERIC(10, 2) NOT NULL,
    total_allotment_cost NUMERIC(12, 2) NOT NULL,
    allotment_status VARCHAR(20) NOT NULL,
    listing_price NUMERIC(10, 2),
    current_market_price NUMERIC(10, 2),
    
    -- PROFIT FORMULA (40% Customer / 60% Company / 10% TDS)
    profit_per_share NUMERIC(10, 2),
    total_profit NUMERIC(12, 2),
    customer_profit_share_40pct NUMERIC(12, 2),
    company_profit_share_60pct NUMERIC(12, 2),
    tds_amount NUMERIC(12, 2) DEFAULT 0.00,
    tds_rate NUMERIC(5, 2) DEFAULT 10.00,
    profit_after_tds NUMERIC(12, 2),
    
    profit_calculated_date DATE,
    profit_distributed BOOLEAN DEFAULT FALSE,
    profit_distribution_date DATE,
    beneficiary_account VARCHAR(50),
    beneficiary_name VARCHAR(100),
    payment_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. PAYMENT TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS payment_transactions (
    transaction_id SERIAL PRIMARY KEY,
    application_id INT REFERENCES customer_ipo_applications(application_id) ON DELETE SET NULL,
    allotment_id INT REFERENCES ipo_allotments(allotment_id) ON DELETE SET NULL,
    customer_id INT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    ipo_id INT NOT NULL REFERENCES ipo_master(ipo_id) ON DELETE CASCADE,
    transaction_type VARCHAR(30) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(20) DEFAULT 'bank_transfer',
    reference_number VARCHAR(100),
    bank_reference VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    verification_date DATE,
    verified_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. BULK IMPORT LOGS TABLE
CREATE TABLE IF NOT EXISTS bulk_import_logs (
    import_id SERIAL PRIMARY KEY,
    import_type VARCHAR(30) NOT NULL,
    file_name VARCHAR(255),
    total_rows INT,
    successful_rows INT,
    failed_rows INT,
    error_details JSONB,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    imported_by INT REFERENCES users(user_id)
);
