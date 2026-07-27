# IPO Management System - Complete API Endpoints Specification

## Base URL
```
Production: https://api.ipocompany.com/api
Development: http://localhost:3000/api
Version: v1
```

## Authentication
```
All endpoints require Authorization header:
Header: Authorization: Bearer {JWT_TOKEN}
Token expiry: 24 hours
Refresh token: Valid for 7 days
```

---

## 1. AUTHENTICATION ENDPOINTS

### 1.1 Login
```
POST /auth/login
Content-Type: application/json

Request Body:
{
  "username": "admin_username",
  "password": "password123"
}

Response (200 OK):
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": 1,
    "username": "admin_username",
    "full_name": "Admin Name",
    "role": "admin",
    "email": "admin@company.com"
  },
  "token_expires_in": 86400
}

Error Response (401):
{
  "status": "error",
  "message": "Invalid credentials"
}
```

### 1.2 Logout
```
POST /auth/logout
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "message": "Logged out successfully"
}
```

### 1.3 Refresh Token
```
POST /auth/refresh
Content-Type: application/json

Request Body:
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}

Response (200):
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "token_expires_in": 86400
}
```

---

## 2. CUSTOMER ENDPOINTS

### 2.1 Create Customer (Manual Entry)
```
POST /customers
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "customer_no": 1,
  "name": "Amit Patel",
  "pan_number": "AAAPA1234X",
  "aadhar_number": "123456789012",
  "dpid": "0012345678",
  "bank_account_no": "1234567890123",
  "bank_name": "HDFC Bank",
  "ifsc_code": "HDFC0001234",
  "demat_account_no": "1234567890123456",
  "login_id": "amit_ipo_24",
  "password": "Secure@2024",  (will be hashed)
  "code": "IPO-001",
  "mobile_number": "9876543210",
  "email": "amit@email.com",
  "phone_alternate": "9876543211",
  "phone_other": "9876543212",
  "balance": 50000.00,
  "tds_remarks": "10% TDS applied",
  "beneficiary_name": "Priya Patel",
  "address": "123 Street Name",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001"
}

Response (201 Created):
{
  "status": "success",
  "customer_id": 1,
  "message": "Customer created successfully",
  "customer": {
    "customer_id": 1,
    "name": "Amit Patel",
    "pan_number": "AAAPA1234X",
    "mobile_number": "9876543210",
    "kyc_status": "pending",
    "created_at": "2026-01-15T10:30:00Z"
  }
}

Error Response (400):
{
  "status": "error",
  "message": "PAN already exists or invalid format",
  "errors": {
    "pan_number": "PAN format invalid (AAAPA1234X)"
  }
}
```

### 2.2 Get All Customers (List)
```
GET /customers?page=1&limit=25&search=amit&kyc_status=verified&city=Mumbai
Authorization: Bearer {token}

Query Parameters:
  - page: (default: 1)
  - limit: (default: 25, max: 100)
  - search: (search by name, PAN, mobile)
  - kyc_status: (pending, verified, rejected)
  - city: (filter by city)
  - sort_by: (name, created_at, balance)
  - sort_order: (asc, desc)

Response (200):
{
  "status": "success",
  "total": 250,
  "page": 1,
  "limit": 25,
  "total_pages": 10,
  "customers": [
    {
      "customer_id": 1,
      "customer_no": 1,
      "name": "Amit Patel",
      "pan_number": "AAAPA1234X",
      "mobile_number": "9876543210",
      "email": "amit@email.com",
      "balance": 50000.00,
      "kyc_status": "verified",
      "documents_uploaded": true,
      "total_ipo_applied": 2,
      "created_at": "2026-01-10T09:15:30Z"
    }
    // ... more customers
  ]
}
```

### 2.3 Get Customer Details
```
GET /customers/{customer_id}
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "customer": {
    "customer_id": 1,
    "customer_no": 1,
    "name": "Amit Patel",
    "pan_number": "AAAPA1234X",
    "aadhar_number": "XXXX-XXXX-9012",  (masked)
    "dpid": "0012345678",
    "bank_account_no": "XXXX-XXXX-7890",  (masked)
    "bank_name": "HDFC Bank",
    "ifsc_code": "HDFC0001234",
    "mobile_number": "9876543210",
    "email": "amit@email.com",
    "balance": 50000.00,
    "kyc_status": "verified",
    "documents_uploaded": true,
    "beneficiary_name": "Priya Patel",
    "tds_remarks": "10% TDS applied",
    "created_at": "2026-01-10T09:15:30Z",
    "updated_at": "2026-01-15T14:00:00Z",
    
    // Related data
    "applications": [
      {
        "application_id": 5,
        "ipo_name": "Paytm IPO",
        "applied_qty": 2,
        "allotted_qty": 1,
        "allotment_status": "partial",
        "application_status": "applied",
        "payment_status": "completed"
      }
    ],
    "documents": [
      {
        "document_id": 1,
        "document_type": "PAN",
        "file_name": "amit_pan.jpg",
        "is_verified": true
      }
    ],
    "beneficiaries": [
      {
        "beneficiary_id": 1,
        "beneficiary_name": "Priya Patel",
        "beneficiary_relationship": "Spouse",
        "is_primary": true
      }
    ]
  }
}
```

### 2.4 Update Customer
```
PUT /customers/{customer_id}
Authorization: Bearer {token}
Content-Type: application/json

Request Body: (any fields to update)
{
  "mobile_number": "9876543215",
  "email": "newemail@email.com",
  "balance": 75000.00,
  "tds_remarks": "TDS exemption applied"
}

Response (200):
{
  "status": "success",
  "message": "Customer updated successfully",
  "customer": { ... }
}
```

### 2.5 Delete Customer
```
DELETE /customers/{customer_id}
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "message": "Customer deleted successfully"
}

Note: Soft delete (is_active = false, data retained for audit)
```

### 2.6 Bulk Import Customers (Excel)
```
POST /customers/bulk-import
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
  - file: [XLSX file]
  - sheets: "Sheet1"  (optional)

Response (200):
{
  "status": "success",
  "import_id": 5,
  "total_rows": 100,
  "successful_rows": 98,
  "failed_rows": 2,
  "message": "98 customers imported successfully",
  "failed_records": [
    {
      "row": 15,
      "name": "Invalid Customer",
      "error": "PAN format invalid"
    },
    {
      "row": 45,
      "name": "Duplicate User",
      "error": "Mobile number already exists"
    }
  ]
}
```

---

## 3. IPO MASTER ENDPOINTS

### 3.1 Create IPO
```
POST /ipos
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "ipo_name": "Paytm IPO",
  "company_name": "One97 Communications Pvt Ltd",
  "ipo_issue_size": 183000000000,  (in rupees)
  "price_band_min": 1050.00,
  "price_band_max": 1100.00,
  "issue_price": 1080.00,
  "listing_price": 1890.00,  (set after listing)
  "lot_size": 14,
  "subscription_open_date": "2026-01-15",
  "subscription_close_date": "2026-01-20",
  "allotment_date": "2026-01-25",
  "listing_date": "2026-02-01",
  "payment_due_date": "2026-01-28",
  "exchange_listing": "NSE",
  "sector": "Finance",
  "nse_symbol": "PAYTM",
  "prospectus_link": "https://...",
  "lead_manager": "Goldman Sachs",
  "company_description": "Leading fintech company..."
}

Response (201):
{
  "status": "success",
  "ipo_id": 1,
  "message": "IPO created successfully",
  "ipo": { ... }
}
```

### 3.2 Get All IPOs
```
GET /ipos?status=open&page=1&limit=10
Authorization: Bearer {token}

Query Parameters:
  - status: (upcoming, open, closed, allotted, listed, completed)
  - page: (default: 1)
  - limit: (default: 10)
  - sort_by: (listing_date, subscription_open_date)

Response (200):
{
  "status": "success",
  "total": 12,
  "ipos": [
    {
      "ipo_id": 1,
      "ipo_name": "Paytm IPO",
      "company_name": "One97 Communications Pvt Ltd",
      "status": "listed",
      "subscription_open_date": "2026-01-15",
      "subscription_close_date": "2026-01-20",
      "listing_date": "2026-02-01",
      "price_band_min": 1050.00,
      "price_band_max": 1100.00,
      "issue_price": 1080.00,
      "listing_price": 1890.00,
      "premium_loss_per_share": 810.00,
      "total_applicants": 250,
      "total_allotted": 230,
      "total_qty_applied": 3500,
      "total_qty_allotted": 2100
    }
    // ... more IPOs
  ]
}
```

### 3.3 Get IPO Details
```
GET /ipos/{ipo_id}
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "ipo": {
    "ipo_id": 1,
    "ipo_name": "Paytm IPO",
    "company_name": "One97 Communications Pvt Ltd",
    "status": "listed",
    // ... all IPO details
    
    // Related data
    "applications_summary": {
      "total_applicants": 250,
      "total_qty_applied": 3500,
      "total_qty_allotted": 2100,
      "fully_allotted": 180,
      "partially_allotted": 50,
      "rejected": 20,
      "subscription_ratio": 1.67
    },
    
    "financial_summary": {
      "total_profit": 56700000,
      "company_share_60pct": 34020000,
      "customer_share_40pct": 22680000,
      "total_tds_deducted": 2268000,
      "total_refunded": 10260000
    }
  }
}
```

### 3.4 Update IPO (Listing Price, Status)
```
PUT /ipos/{ipo_id}
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "listing_price": 1890.00,
  "current_market_price": 1850.00,
  "status": "listed"
}

Response (200):
{
  "status": "success",
  "message": "IPO updated. Profit calculation triggered for all applications.",
  "ipo": { ... }
}

// Auto-triggers:
// - Updates premium_loss_per_share
// - Calculates profit for all applications
// - Creates ipo_allotments records
// - Sends notifications to customers
```

### 3.5 Mark IPO as Listed (Triggers Profit Calculation)
```
POST /ipos/{ipo_id}/mark-listed
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "listing_price": 1890.00,
  "listing_date": "2026-02-01"
}

Response (200):
{
  "status": "success",
  "message": "IPO marked as listed. Profit calculated for 230 applications.",
  "summary": {
    "total_profit": 56700000,
    "customer_share": 22680000,
    "company_share": 34020000,
    "tds_deducted": 2268000,
    "customers_notified": 230
  }
}
```

---

## 4. APPLICATION ENDPOINTS

### 4.1 Create Application (Customer Applies to IPO)
```
POST /applications
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "customer_id": 1,
  "ipo_id": 1,
  "applied_quantity": 2,  (in lots)
  "application_date": "2026-01-18"
}

Response (201):
{
  "status": "success",
  "application_id": 5,
  "message": "Application submitted successfully",
  "application": {
    "application_id": 5,
    "customer_id": 1,
    "ipo_id": 1,
    "applied_quantity": 2,
    "application_amount": 21600.00,  (auto-calculated)
    "application_status": "applied",
    "payment_status": "pending",
    "allotment_status": null,
    "created_at": "2026-01-18T14:20:00Z"
  },
  
  "next_action": "Customer must pay application_amount by payment_due_date"
}

Error (400):
{
  "status": "error",
  "message": "Cannot apply - IPO not open for applications",
  // or
  "message": "Customer cannot apply twice to same IPO"
}
```

### 4.2 Get All Applications
```
GET /applications?ipo_id=1&customer_id=5&status=applied&page=1
Authorization: Bearer {token}

Query Parameters:
  - ipo_id: (filter by IPO)
  - customer_id: (filter by customer)
  - status: (applied, cancelled, rejected)
  - allotment_status: (full, partial, rejected)
  - payment_status: (pending, partial, completed, refunded)

Response (200):
{
  "status": "success",
  "total": 250,
  "applications": [
    {
      "application_id": 5,
      "customer_name": "Amit Patel",
      "ipo_name": "Paytm IPO",
      "applied_quantity": 2,
      "application_amount": 21600.00,
      "allotted_quantity": 1,
      "allotment_status": "partial",
      "application_status": "applied",
      "payment_status": "completed",
      "application_date": "2026-01-18"
    }
    // ... more applications
  ]
}
```

### 4.3 Update Application Status (Full/Partial/Reject)
```
PUT /applications/{application_id}/allotment
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "allotted_quantity": 1,
  "allotment_status": "partial",
  "allotment_date": "2026-01-25",
  "allotment_price": 1080.00
}

Response (200):
{
  "status": "success",
  "message": "Allotment recorded. Refund (if applicable) queued.",
  "application": { ... },
  
  "refund_info": {
    "refund_required": true,
    "refund_amount": 10800.00,  (for unallotted shares)
    "refund_transaction_id": 15
  }
}
```

### 4.4 Cancel Application
```
PUT /applications/{application_id}/cancel
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "reason": "Customer requested cancellation"
}

Response (200):
{
  "status": "success",
  "message": "Application cancelled. Full refund initiated.",
  "application": {
    "application_status": "cancelled",
    "payment_status": "refunded"
  },
  "refund_transaction_id": 20
}
```

---

## 5. ALLOTMENT ENDPOINTS

### 5.1 Get Allotment Results
```
GET /allotments?ipo_id=1
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "total": 230,
  "allotments": [
    {
      "allotment_id": 10,
      "customer_name": "Amit Patel",
      "applied_qty": 2,
      "allotted_qty": 1,
      "allotment_status": "partial",
      "allotment_price": 1080.00,
      "total_profit": 11340.00,
      "customer_share_40pct": 4536.00,
      "company_share_60pct": 6804.00,
      "tds_amount": 453.60,
      "profit_after_tds": 4082.40,
      "profit_distributed": false
    }
    // ... more allotments
  ]
}
```

### 5.2 Calculate Profit (After IPO Listing)
```
POST /allotments/{allotment_id}/calculate-profit
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "listing_price": 1890.00,
  "tds_rate": 10.00
}

Response (200):
{
  "status": "success",
  "message": "Profit calculated successfully",
  "allotment": {
    "allotment_id": 10,
    "profit_per_share": 810.00,
    "total_profit": 11340.00,
    "customer_profit_40pct": 4536.00,
    "company_profit_60pct": 6804.00,
    "tds_amount": 453.60,
    "profit_after_tds": 4082.40,
    "profit_calculated_date": "2026-02-01",
    "profit_status": "calculated"
  }
}
```

---

## 6. PAYMENT ENDPOINTS

### 6.1 Record Payment
```
POST /payments
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "customer_id": 1,
  "ipo_id": 1,
  "application_id": 5,  (optional)
  "allotment_id": 10,   (optional)
  "transaction_type": "application_payment",  // or "profit_distribution", "refund_partial", etc.
  "amount": 21600.00,
  "payment_method": "bank_transfer",
  "reference_number": "NEFT-2026010515001",
  "bank_reference": "UTR-0105001",
  "transaction_date": "2026-01-15",
  "notes": "Payment received from customer"
}

Response (201):
{
  "status": "success",
  "transaction_id": 50,
  "message": "Payment recorded. Awaiting verification.",
  "payment": {
    "transaction_id": 50,
    "customer_name": "Amit Patel",
    "amount": 21600.00,
    "transaction_type": "application_payment",
    "status": "pending",  (until admin verifies)
    "created_at": "2026-01-15T10:30:00Z"
  }
}
```

### 6.2 Get All Payments
```
GET /payments?customer_id=1&ipo_id=1&status=completed&page=1
Authorization: Bearer {token}

Query Parameters:
  - customer_id: (filter by customer)
  - ipo_id: (filter by IPO)
  - transaction_type: (application_payment, profit_distribution, etc.)
  - status: (pending, completed, failed, under_review)
  - date_from: (YYYY-MM-DD)
  - date_to: (YYYY-MM-DD)

Response (200):
{
  "status": "success",
  "total": 598,
  "payments": [
    {
      "transaction_id": 50,
      "customer_name": "Amit Patel",
      "ipo_name": "Paytm IPO",
      "transaction_type": "application_payment",
      "amount": 21600.00,
      "payment_method": "bank_transfer",
      "reference_number": "NEFT-2026010515001",
      "status": "completed",
      "verified_by": "Admin Name",
      "verification_date": "2026-01-15",
      "transaction_date": "2026-01-15"
    }
    // ... more payments
  ]
}
```

### 6.3 Verify Payment (Admin)
```
PUT /payments/{transaction_id}/verify
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "status": "completed",  // or "failed", "cancelled"
  "verification_notes": "Bank confirmation received"
}

Response (200):
{
  "status": "success",
  "message": "Payment verified. Customer balance updated.",
  "payment": {
    "transaction_id": 50,
    "status": "completed",
    "verified_by": "Admin Name",
    "verification_date": "2026-01-15T14:30:00Z"
  }
}
```

### 6.4 Distribute Profit (Send to Beneficiary)
```
POST /payments/distribute-profit
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "allotment_id": 10,
  "payment_method": "bank_transfer",
  "beneficiary_bank_account": "1234567890",
  "beneficiary_ifsc": "HDFC0001234"
}

Response (201):
{
  "status": "success",
  "message": "Profit distribution initiated",
  "payment": {
    "transaction_id": 100,
    "customer_name": "Amit Patel",
    "amount": 4082.40,  (after TDS)
    "transaction_type": "profit_distribution",
    "status": "pending",
    "payment_reference": "UTR-0205001",
    "payment_date": "2026-02-05"
  },
  
  "next_action": "Admin verifies NEFT confirmation and marks as completed"
}
```

---

## 7. DOCUMENT ENDPOINTS

### 7.1 Upload Document
```
POST /documents
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
  - customer_id: 1
  - document_type: "PAN"  (PAN, AADHAR, BANK_PROOF, DEMAT_STATEMENT, OTHER)
  - file: [binary file]

File Validation:
  - Max size: 5 MB
  - Allowed types: .jpg, .png, .pdf
  - Virus scan: Yes

Response (201):
{
  "status": "success",
  "document_id": 1,
  "message": "Document uploaded successfully",
  "document": {
    "document_id": 1,
    "customer_id": 1,
    "document_type": "PAN",
    "file_name": "amit_patel_pan_20260115.jpg",
    "file_size": 245632,
    "is_verified": false,
    "upload_date": "2026-01-15T10:30:00Z"
  }
}
```

### 7.2 Get Customer Documents
```
GET /documents?customer_id=1
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "documents": [
    {
      "document_id": 1,
      "document_type": "PAN",
      "file_name": "amit_patel_pan.jpg",
      "is_verified": true,
      "upload_date": "2026-01-15",
      "download_url": "/documents/1/download"
    },
    {
      "document_id": 2,
      "document_type": "AADHAR",
      "file_name": "amit_patel_aadhar.pdf",
      "is_verified": false,
      "verification_notes": "Document not clear, please resubmit",
      "upload_date": "2026-01-16"
    }
  ]
}
```

### 7.3 Download Document
```
GET /documents/{document_id}/download
Authorization: Bearer {token}

Response (200):
- Returns binary file
- Sets Content-Disposition: attachment
- Content-Type: image/jpeg or application/pdf
```

### 7.4 Verify Document (Admin)
```
PUT /documents/{document_id}/verify
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "is_verified": true,  // or false
  "verification_notes": "PAN verified successfully against GST database"
}

Response (200):
{
  "status": "success",
  "document": {
    "document_id": 1,
    "is_verified": true,
    "verification_notes": "PAN verified successfully",
    "verification_date": "2026-01-15T14:00:00Z"
  }
}
```

---

## 8. BENEFICIARY ENDPOINTS

### 8.1 Add Beneficiary
```
POST /beneficiaries
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "customer_id": 1,
  "beneficiary_name": "Priya Patel",
  "beneficiary_bank_account": "9876543210123456",
  "beneficiary_ifsc": "HDFC0000123",
  "beneficiary_relationship": "Spouse",
  "is_primary": true
}

Response (201):
{
  "status": "success",
  "beneficiary_id": 1,
  "message": "Beneficiary added successfully",
  "beneficiary": { ... }
}
```

### 8.2 Get Beneficiaries
```
GET /beneficiaries?customer_id=1
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "beneficiaries": [
    {
      "beneficiary_id": 1,
      "beneficiary_name": "Priya Patel",
      "beneficiary_relationship": "Spouse",
      "is_primary": true,
      "beneficiary_bank_account": "XXXX-XXXX-3456"  (masked)
    }
  ]
}
```

### 8.3 Update Beneficiary
```
PUT /beneficiaries/{beneficiary_id}
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "beneficiary_name": "Priya Patel",
  "is_primary": true
}

Response (200):
{
  "status": "success",
  "beneficiary": { ... }
}
```

---

## 9. REPORT ENDPOINTS

### 9.1 Customer Summary Report
```
GET /reports/customer-summary?date_from=2026-01-01&date_to=2026-02-28&format=pdf
Authorization: Bearer {token}

Query Parameters:
  - date_from: (YYYY-MM-DD)
  - date_to: (YYYY-MM-DD)
  - kyc_status: (pending, verified, rejected)
  - format: (pdf, excel, csv)

Response:
- PDF: Returns PDF file (document/pdf)
- Excel: Returns Excel file (application/vnd.ms-excel)
- CSV: Returns CSV file (text/csv)
```

### 9.2 IPO Application Status Report
```
GET /reports/ipo-applications?ipo_id=1&format=excel
Authorization: Bearer {token}

Query Parameters:
  - ipo_id: (required)
  - format: (pdf, excel, csv)

Response:
- Returns report in requested format with detailed allotment analysis
```

### 9.3 Profit/Loss Statement
```
GET /reports/profit-loss?ipo_id=1&format=pdf
Authorization: Bearer {token}

Query Parameters:
  - ipo_id: (filter by specific IPO or all)
  - date_from: (listing date range)
  - format: (pdf, excel, csv)

Response:
- Returns detailed profit calculation for all customers
- Shows 40% customer share, 60% company share
- Includes TDS deductions
```

### 9.4 Payment Transactions Report
```
GET /reports/payment-transactions?date_from=2026-01-01&date_to=2026-02-28&format=excel
Authorization: Bearer {token}

Query Parameters:
  - date_from: (YYYY-MM-DD)
  - date_to: (YYYY-MM-DD)
  - transaction_type: (application_payment, profit_distribution, etc.)
  - status: (pending, completed, failed)
  - format: (pdf, excel, csv)

Response:
- Returns all transaction details with summary
```

### 9.5 TDS Calculation Report
```
GET /reports/tds-calculation?financial_year=2025-26&format=pdf
Authorization: Bearer {token}

Query Parameters:
  - financial_year: (2025-26, 2024-25, etc.)
  - format: (pdf, excel, csv)

Response:
- Returns TDS certificate format
- Customer-wise TDS details
- Ready for ITR filing
```

### 9.6 Compliance Report
```
GET /reports/compliance?date_from=2026-01-01&format=pdf
Authorization: Bearer {token}

Query Parameters:
  - date_from: (YYYY-MM-DD)
  - kyc_status: (all, pending, verified, rejected)
  - format: (pdf, excel, csv)

Response:
- KYC verification status
- Document verification status
- Beneficiary details
- Risk assessment
```

### 9.7 Beneficiary Payment Report
```
GET /reports/beneficiary-payments?ipo_id=1&format=excel
Authorization: Bearer {token}

Query Parameters:
  - ipo_id: (required)
  - format: (pdf, excel, csv)

Response:
- Profit paid to beneficiaries
- Bank transfer details
- Payment status tracking
```

### 9.8 IPO Profit Analysis Report
```
GET /reports/ipo-analysis?date_from=2026-01-01&date_to=2026-02-28&format=pdf
Authorization: Bearer {token}

Query Parameters:
  - date_from: (YYYY-MM-DD)
  - date_to: (YYYY-MM-DD)
  - format: (pdf, excel, csv)

Response:
- Compare multiple IPOs
- Profit comparison
- Premium/loss analysis
- Company revenue summary
```

### 9.9 Daily Summary Report (Email)
```
GET /reports/daily-summary
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "date": "2026-02-15",
  "summary": {
    "new_registrations": 5,
    "new_applications": 12,
    "pending_kyc": 3,
    "pending_payments": 8,
    "active_ipos": 2,
    "listed_ipos": 1,
    "total_customers": 250,
    "total_profit_generated": 56700000
  }
}

Note: Can be scheduled to email HTML version daily
```

---

## 10. ADMIN ENDPOINTS

### 10.1 Dashboard Summary
```
GET /admin/dashboard
Authorization: Bearer {token}

Response (200):
{
  "status": "success",
  "summary": {
    "total_customers": 250,
    "kyc_verified": 230,
    "kyc_pending": 15,
    "kyc_rejected": 5,
    "total_ipos": 12,
    "ipos_open": 2,
    "ipos_listed": 3,
    "total_applications": 280,
    "total_allotted": 230,
    "total_rejected": 30,
    "total_profit_generated": 56700000,
    "company_revenue": 34020000,
    "total_payments_collected": 270000000,
    "total_refunds_issued": 10260000
  },
  "charts": {
    "applications_by_ipo": [ ... ],
    "profit_distribution": { ... },
    "payment_status": { ... }
  }
}
```

### 10.2 System Settings
```
GET /admin/settings
Authorization: Bearer {token} (admin only)

PUT /admin/settings
Authorization: Bearer {token} (admin only)
Content-Type: application/json

Request Body:
{
  "tds_rate": 10.00,
  "company_profit_share": 60,  // % of profit
  "min_kyc_documents": ["PAN", "AADHAR", "BANK_PROOF"],
  "max_import_rows": 10000,
  "nse_sync_time": "16:00",
  "nse_sync_enabled": true
}

Response (200):
{
  "status": "success",
  "settings": { ... }
}
```

---

## ERROR HANDLING

All errors follow this format:

```json
{
  "status": "error",
  "code": "RESOURCE_NOT_FOUND",
  "message": "Customer with ID 999 not found",
  "timestamp": "2026-02-15T14:30:00Z",
  "errors": {
    "customer_id": "Must be a positive integer"
  }
}
```

### Common Status Codes
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate PAN, etc.)
- `422` - Unprocessable Entity (validation error)
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## RATE LIMITING

All API endpoints rate-limited:
- **Login:** 5 attempts per 15 minutes
- **General:** 100 requests per minute per user
- **Bulk Import:** 1 request per 5 minutes
- **Report Export:** 10 requests per hour

Response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1645097400
```

---

**Document Version:** 1.0
**Total Endpoints:** 50+
**Status:** Ready for development
**Framework:** Node.js/Express or Python/Flask recommended
