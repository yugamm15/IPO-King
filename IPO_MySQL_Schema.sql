-- ============================================================================
-- IPO MANAGEMENT SYSTEM - MySQL Database Schema
-- For: Secure IPO Application & Profit Tracking Platform
-- Database: MySQL 5.7+
-- ============================================================================

-- Create database
CREATE DATABASE IF NOT EXISTS ipo_management;
USE ipo_management;

-- Set default charset
ALTER DATABASE ipo_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- 1. USERS TABLE (Admin/Staff Login)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'manager', 'agent') NOT NULL DEFAULT 'agent',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. CUSTOMERS TABLE (Main Customer Database - includes all Excel columns)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- From Excel Columns
    customer_no INT UNIQUE,  -- "NO." from Excel
    name VARCHAR(100) NOT NULL,  -- "NAME"
    ca_number VARCHAR(50),  -- "CA"
    pan_number VARCHAR(20) UNIQUE NOT NULL,  -- "PAN"
    dpid VARCHAR(50),  -- "DPID"
    bank_account_no VARCHAR(50) UNIQUE,  -- "Bank A/c No."
    login_id VARCHAR(100),  -- "Login ID"
    password_encrypted VARCHAR(255),  -- "PASS"
    code VARCHAR(50),  -- "CODE"
    mobile_number VARCHAR(20) NOT NULL,  -- "Mobile Number"
    balance DECIMAL(15, 2) DEFAULT 0.00,  -- "BALANCE"
    phone_alternate VARCHAR(20),  -- "Phone Kono chhe"
    email VARCHAR(100),  -- "email"
    phone_other VARCHAR(20),  -- "Phone"
    return_amount DECIMAL(12, 2) DEFAULT 0.00,  -- "RETURN"
    tds_remarks TEXT,  -- "TDS remarks"
    beneficiary_name VARCHAR(100),  -- "Beneficiary"
    
    -- System Fields
    aadhar_number VARCHAR(20),
    bank_name VARCHAR(100),
    ifsc_code VARCHAR(20),
    demat_account_no VARCHAR(50),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(10),
    
    -- Status Fields
    kyc_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    documents_uploaded BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    CONSTRAINT fk_customers_user FOREIGN KEY (created_by) REFERENCES users(user_id),
    
    INDEX idx_pan (pan_number),
    INDEX idx_mobile (mobile_number),
    INDEX idx_email (email),
    INDEX idx_code (code),
    INDEX idx_customer_no (customer_no),
    INDEX idx_kyc_status (kyc_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. CUSTOMER BENEFICIARIES TABLE (Multiple Beneficiaries per Customer)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_beneficiaries (
    beneficiary_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    beneficiary_name VARCHAR(100) NOT NULL,
    beneficiary_bank_account VARCHAR(50),
    beneficiary_ifsc VARCHAR(20),
    beneficiary_relationship VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_beneficiary_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    
    INDEX idx_customer (customer_id),
    INDEX idx_primary (is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. CUSTOMER DOCUMENTS TABLE (Document Storage with File Paths)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    document_type ENUM('PAN', 'AADHAR', 'BANK_PROOF', 'DEMAT_STATEMENT', 'OTHER') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(50),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INT,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_notes TEXT,
    
    CONSTRAINT fk_document_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    CONSTRAINT fk_document_user FOREIGN KEY (uploaded_by) REFERENCES users(user_id),
    
    INDEX idx_customer (customer_id),
    INDEX idx_type (document_type),
    INDEX idx_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. IPO MASTER TABLE (IPO Details & Configuration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ipo_master (
    ipo_id INT AUTO_INCREMENT PRIMARY KEY,
    ipo_name VARCHAR(150) NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    ipo_issue_size DECIMAL(15, 2),
    price_band_min DECIMAL(10, 2) NOT NULL,
    price_band_max DECIMAL(10, 2) NOT NULL,
    issue_price DECIMAL(10, 2),
    listing_price DECIMAL(10, 2),
    lot_size INT DEFAULT 1,
    minimum_qty INT DEFAULT 1,
    subscription_open_date DATE NOT NULL,
    subscription_close_date DATE NOT NULL,
    allotment_date DATE,
    listing_date DATE,
    payment_due_date DATE,
    
    -- Status
    status ENUM('upcoming', 'open', 'closed', 'allotted', 'listed', 'completed') DEFAULT 'upcoming',
    
    -- Additional Info
    exchange_listing VARCHAR(50),
    sector VARCHAR(100),
    company_description TEXT,
    prospectus_link VARCHAR(500),
    lead_manager VARCHAR(150),
    nse_symbol VARCHAR(20),
    bse_code VARCHAR(20),
    premium_loss_per_share DECIMAL(10, 2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    CONSTRAINT fk_ipo_user FOREIGN KEY (created_by) REFERENCES users(user_id),
    
    INDEX idx_status (status),
    INDEX idx_listing_date (listing_date),
    INDEX idx_subscription_open (subscription_open_date),
    INDEX idx_ipo_name (ipo_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. CUSTOMER IPO APPLICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_ipo_applications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    ipo_id INT NOT NULL,
    
    -- Application Details
    applied_quantity INT NOT NULL,
    application_amount DECIMAL(12, 2) NOT NULL,
    application_date DATE NOT NULL,
    application_status ENUM('applied', 'cancelled', 'rejected') DEFAULT 'applied',
    
    -- Allotment Details
    allotted_quantity INT,
    allotment_status ENUM('full', 'partial', 'rejected'),
    allotment_date DATE,
    
    -- Pricing
    allotment_price DECIMAL(10, 2),
    
    -- Payment Status
    payment_status ENUM('pending', 'partial', 'completed', 'refunded') DEFAULT 'pending',
    payment_date DATE,
    payment_amount_paid DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Profit Calculation
    profit_status ENUM('pending', 'calculated', 'distributed') DEFAULT 'pending',
    
    -- Notes
    remarks TEXT,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_app_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    CONSTRAINT fk_app_ipo FOREIGN KEY (ipo_id) REFERENCES ipo_master(ipo_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_customer_ipo (customer_id, ipo_id),
    
    INDEX idx_customer (customer_id),
    INDEX idx_ipo (ipo_id),
    INDEX idx_status (application_status),
    INDEX idx_allotment_status (allotment_status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_application_date (application_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. IPO ALLOTMENTS TABLE (Detailed Allotment Tracking & Profit Calculation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ipo_allotments (
    allotment_id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    customer_id INT NOT NULL,
    ipo_id INT NOT NULL,
    
    -- Allotment Details
    applied_qty INT NOT NULL,
    allotted_qty INT NOT NULL,
    allotment_price DECIMAL(10, 2) NOT NULL,
    total_allotment_cost DECIMAL(12, 2) NOT NULL,
    allotment_status VARCHAR(20) NOT NULL,
    
    -- Listing Details (auto-filled after listing)
    listing_price DECIMAL(10, 2),
    current_market_price DECIMAL(10, 2),
    
    -- Profit Calculation (40% to customer, 60% to company)
    profit_per_share DECIMAL(10, 2),
    total_profit DECIMAL(12, 2),
    customer_profit_share_40pct DECIMAL(12, 2),
    company_profit_share_60pct DECIMAL(12, 2),
    
    -- TDS (10% standard rate)
    tds_amount DECIMAL(12, 2) DEFAULT 0.00,
    tds_rate DECIMAL(5, 2) DEFAULT 10.00,
    profit_after_tds DECIMAL(12, 2),
    
    -- Status
    profit_calculated_date DATE,
    profit_distributed BOOLEAN DEFAULT FALSE,
    profit_distribution_date DATE,
    
    -- Beneficiary Payment
    beneficiary_account VARCHAR(50),
    beneficiary_name VARCHAR(100),
    payment_reference VARCHAR(100),
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_allot_app FOREIGN KEY (application_id) REFERENCES customer_ipo_applications(application_id) ON DELETE CASCADE,
    CONSTRAINT fk_allot_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    CONSTRAINT fk_allot_ipo FOREIGN KEY (ipo_id) REFERENCES ipo_master(ipo_id) ON DELETE CASCADE,
    
    INDEX idx_customer (customer_id),
    INDEX idx_ipo (ipo_id),
    INDEX idx_application (application_id),
    INDEX idx_profit_distributed (profit_distributed),
    INDEX idx_profit_calculated_date (profit_calculated_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. PAYMENT TRANSACTIONS TABLE (Track All Money Movements)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT,
    allotment_id INT,
    customer_id INT NOT NULL,
    ipo_id INT NOT NULL,
    
    -- Transaction Details
    transaction_type ENUM(
        'application_payment',
        'refund_unallotted',
        'refund_partial',
        'profit_distribution',
        'commission_deduction',
        'tds_deduction',
        'other'
    ) NOT NULL,
    
    amount DECIMAL(12, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Payment Method
    payment_method ENUM('bank_transfer', 'cash', 'cheque', 'online', 'wallet', 'neft', 'rtgs', 'imps') NOT NULL DEFAULT 'bank_transfer',
    reference_number VARCHAR(100),
    bank_reference VARCHAR(100),
    
    -- Status
    status ENUM('pending', 'completed', 'failed', 'cancelled', 'under_review') DEFAULT 'pending',
    verification_date DATE,
    verified_by INT,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_trans_app FOREIGN KEY (application_id) REFERENCES customer_ipo_applications(application_id) ON DELETE SET NULL,
    CONSTRAINT fk_trans_allot FOREIGN KEY (allotment_id) REFERENCES ipo_allotments(allotment_id) ON DELETE SET NULL,
    CONSTRAINT fk_trans_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    CONSTRAINT fk_trans_ipo FOREIGN KEY (ipo_id) REFERENCES ipo_master(ipo_id) ON DELETE CASCADE,
    CONSTRAINT fk_trans_user FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL,
    
    INDEX idx_customer (customer_id),
    INDEX idx_ipo (ipo_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_status (status),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_reference (reference_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. BULK IMPORT LOG TABLE (Track Excel imports)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bulk_import_logs (
    import_id INT AUTO_INCREMENT PRIMARY KEY,
    import_type ENUM('customers', 'applications', 'allotments', 'payments') NOT NULL,
    file_name VARCHAR(255),
    total_rows INT,
    successful_rows INT,
    failed_rows INT,
    error_details JSON,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    imported_by INT,
    
    CONSTRAINT fk_import_user FOREIGN KEY (imported_by) REFERENCES users(user_id),
    
    INDEX idx_import_type (import_type),
    INDEX idx_import_date (import_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VIEWS FOR EASY REPORTING
-- ============================================================================

-- View 1: Customer Dashboard Summary
CREATE OR REPLACE VIEW customer_summary AS
SELECT 
    c.customer_id,
    c.customer_no,
    c.name,
    c.pan_number,
    c.mobile_number,
    c.email,
    c.balance,
    COUNT(DISTINCT cia.ipo_id) as total_ipo_applied,
    SUM(CASE WHEN cia.allotment_status = 'full' THEN 1 ELSE 0 END) as full_allotted,
    SUM(CASE WHEN cia.allotment_status = 'partial' THEN 1 ELSE 0 END) as partial_allotted,
    SUM(CASE WHEN cia.allotment_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
    COALESCE(SUM(CASE WHEN pt.status = 'completed' THEN pt.amount ELSE 0 END), 0) as total_paid,
    c.kyc_status,
    c.documents_uploaded,
    c.created_at
FROM customers c
LEFT JOIN customer_ipo_applications cia ON c.customer_id = cia.customer_id
LEFT JOIN payment_transactions pt ON c.customer_id = pt.customer_id
GROUP BY c.customer_id, c.customer_no, c.name, c.pan_number, c.mobile_number, c.email, c.balance, c.kyc_status, c.documents_uploaded, c.created_at;

-- View 2: IPO Application Status by IPO
CREATE OR REPLACE VIEW ipo_application_status AS
SELECT 
    i.ipo_id,
    i.ipo_name,
    i.company_name,
    i.status,
    i.subscription_open_date,
    i.subscription_close_date,
    i.listing_date,
    i.listing_price,
    COUNT(DISTINCT cia.customer_id) as total_applicants,
    SUM(CASE WHEN cia.allotment_status = 'full' THEN 1 ELSE 0 END) as fully_allotted,
    SUM(CASE WHEN cia.allotment_status = 'partial' THEN 1 ELSE 0 END) as partially_allotted,
    SUM(CASE WHEN cia.allotment_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
    COALESCE(SUM(cia.applied_quantity), 0) as total_qty_applied,
    COALESCE(SUM(cia.allotted_quantity), 0) as total_qty_allotted
FROM ipo_master i
LEFT JOIN customer_ipo_applications cia ON i.ipo_id = cia.ipo_id
GROUP BY i.ipo_id, i.ipo_name, i.company_name, i.status, i.subscription_open_date, i.subscription_close_date, i.listing_date, i.listing_price;

-- View 3: Profit Summary for Each Customer
CREATE OR REPLACE VIEW customer_profit_summary AS
SELECT 
    ia.customer_id,
    c.name,
    im.ipo_name,
    ia.allotted_qty,
    ia.allotment_price,
    im.listing_price,
    (im.listing_price - ia.allotment_price) * ia.allotted_qty as total_profit,
    ((im.listing_price - ia.allotment_price) * ia.allotted_qty) * 0.40 as customer_profit_40pct,
    ((im.listing_price - ia.allotment_price) * ia.allotted_qty) * 0.60 as company_profit_60pct,
    ia.tds_amount,
    ia.profit_after_tds,
    ia.profit_distributed,
    ia.profit_distribution_date
FROM ipo_allotments ia
JOIN customers c ON ia.customer_id = c.customer_id
JOIN ipo_master im ON ia.ipo_id = im.ipo_id
WHERE im.listing_price IS NOT NULL;

-- View 4: Payment Summary
CREATE OR REPLACE VIEW payment_summary AS
SELECT 
    pt.customer_id,
    c.name,
    c.pan_number,
    im.ipo_name,
    SUM(CASE WHEN pt.transaction_type = 'application_payment' AND pt.status = 'completed' THEN pt.amount ELSE 0 END) as application_amount_paid,
    SUM(CASE WHEN pt.transaction_type = 'refund_unallotted' AND pt.status = 'completed' THEN pt.amount ELSE 0 END) as refund_unallotted,
    SUM(CASE WHEN pt.transaction_type = 'refund_partial' AND pt.status = 'completed' THEN pt.amount ELSE 0 END) as refund_partial,
    SUM(CASE WHEN pt.transaction_type = 'profit_distribution' AND pt.status = 'completed' THEN pt.amount ELSE 0 END) as profit_received,
    SUM(CASE WHEN pt.transaction_type = 'tds_deduction' AND pt.status = 'completed' THEN pt.amount ELSE 0 END) as tds_paid,
    COUNT(pt.transaction_id) as total_transactions,
    pt.payment_method
FROM payment_transactions pt
JOIN customers c ON pt.customer_id = c.customer_id
JOIN ipo_master im ON pt.ipo_id = im.ipo_id
WHERE pt.status IN ('completed', 'pending')
GROUP BY pt.customer_id, c.name, c.pan_number, im.ipo_name, pt.payment_method;

-- View 5: Daily Transaction Report
CREATE OR REPLACE VIEW daily_transaction_report AS
SELECT 
    DATE(pt.transaction_date) as transaction_date,
    pt.transaction_type,
    pt.payment_method,
    COUNT(*) as transaction_count,
    SUM(pt.amount) as total_amount,
    SUM(CASE WHEN pt.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
    SUM(CASE WHEN pt.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
    SUM(CASE WHEN pt.status = 'failed' THEN 1 ELSE 0 END) as failed_count
FROM payment_transactions pt
GROUP BY DATE(pt.transaction_date), pt.transaction_type, pt.payment_method;

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATES
-- ============================================================================

-- Trigger to update customer balance on payment
DELIMITER //

CREATE TRIGGER update_customer_balance_on_payment
AFTER UPDATE ON payment_transactions
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        IF NEW.transaction_type = 'profit_distribution' OR NEW.transaction_type = 'refund_unallotted' OR NEW.transaction_type = 'refund_partial' THEN
            UPDATE customers SET balance = balance + NEW.amount WHERE customer_id = NEW.customer_id;
        ELSEIF NEW.transaction_type = 'application_payment' THEN
            UPDATE customers SET balance = balance - NEW.amount WHERE customer_id = NEW.customer_id;
        END IF;
    END IF;
END//

DELIMITER ;

-- ============================================================================
-- KEY NOTES:
-- ============================================================================
/*

1. SECURITY:
   - Password encryption: Use bcrypt (NOT stored as plain text)
   - PAN/Aadhar: Use application-level encryption
   - Bank details: Mask in UI (show last 4 digits only)
   - Always use parameterized queries (prevent SQL injection)

2. PROFIT CALCULATION FLOW (with 10% TDS):
   - After IPO listing: system compares listing_price vs allotment_price
   - Calculates: (listing_price - allotment_price) × allotted_qty = total_profit
   - Apply 10% TDS: tds_amount = total_profit × 0.10
   - Splits: 40% to customer → customer_profit_share_40pct
   - Splits: 60% to company → company_profit_share_60pct
   - Profit after TDS: profit_after_tds = customer_profit_share_40pct - (tds_amount × 0.40)

3. PAYMENT TRACKING FULL LIFECYCLE:
   - Application Phase: 'application_payment' (customer applies)
   - Allotment Phase: 'refund_unallotted' or 'refund_partial' (if applicable)
   - Listing Phase: 'tds_deduction' (if profit > threshold)
   - Distribution Phase: 'profit_distribution' (customer gets 40%)

4. EXCEL IMPORT MAPPING:
   Column in Excel       → Database Field
   NO.                  → customer_no
   NAME                 → name
   CA                   → ca_number
   PAN                  → pan_number
   DPID                 → dpid
   Bank A/c No.         → bank_account_no
   Login ID             → login_id
   PASS                 → password_encrypted (MUST BE HASHED)
   CODE                 → code
   Mobile Number        → mobile_number
   BALANCE              → balance
   Phone Kono chhe      → phone_alternate
   email                → email
   Phone                → phone_other
   RETURN               → return_amount
   TDS remarks          → tds_remarks
   Beneficiary          → beneficiary_name

5. NSE/BSE API INTEGRATION:
   - Use NSE website scraping or official APIs
   - Update IPO master table daily
   - Fields: ipo_name, company_name, price_band, dates, subscription info

6. ALL REPORTS AVAILABLE:
   - Customer Summary Report
   - IPO Application Status Report
   - Profit/Loss Statement (per customer, per IPO)
   - Payment Transactions Report
   - TDS Calculation Report
   - Compliance Report (KYC, documents, TAX)
   - Daily Transaction Report
   - Beneficiary Payment Report

7. DOCUMENT STORAGE:
   - Store in filesystem: /uploads/customers/{customer_id}/
   - Database stores: file_path, file_name, mime_type
   - Files NOT in database (binary data)

8. CHARACTER SET:
   - UTF8MB4 for full Unicode support (Gujarati text support)
   - Supports Gujarati characters in names, remarks, etc.

*/
