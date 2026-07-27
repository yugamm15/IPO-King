# IPO Management System - Excel Import Guide

## Complete Column Mapping: Excel → Database

### How to Use This Guide
1. Developers use this to build the Excel import feature
2. Admin users use this to prepare their Excel files
3. All validation rules are MANDATORY before importing

---

## DETAILED COLUMN MAPPING (17 Columns)

### 1. **NO.** → `customer_no`
```
Excel Column:  A - NO.
Database Field: customers.customer_no
Data Type:     INT (auto-increment)
Required:      YES (unique per customer)
Validation:    
  - Must be positive integer
  - Must be unique (no duplicates)
  - Cannot be NULL
Example Input: 1, 2, 3, 4...
Example Output: Stored as INT(11)
Error Message: "Customer number must be unique and positive"
```

### 2. **NAME** → `name`
```
Excel Column:  B - NAME
Database Field: customers.name
Data Type:     VARCHAR(100)
Required:      YES
Validation:    
  - Minimum 3 characters
  - Maximum 100 characters
  - Cannot be empty/NULL
  - Can contain: letters, spaces, hyphens, dots
  - Cannot contain: special characters except hyphen/dot
Example Input: "Amit Kumar Patel", "Rajesh Singh", "Priya Sharma"
Example Output: Stored as-is
Error Message: "Name must be 3-100 characters, no special chars"
Encoding: UTF8MB4 (supports Gujarati names: "અમિત", "રાજેશ")
```

### 3. **CA** → `ca_number`
```
Excel Column:  C - CA
Database Field: customers.ca_number
Data Type:     VARCHAR(50)
Required:      NO (optional - for CA professionals only)
Validation:    
  - If provided: format AC123456 (2 letters + numbers)
  - Maximum 50 characters
  - Can be NULL
Example Input: "AC123456", "CA098765", or leave BLANK
Example Output: Stored as-is (or NULL if blank)
Error Message: "CA number format invalid (e.g., AC123456)"
Note: Only required for Chartered Accountants
```

### 4. **PAN** → `pan_number` ⭐ CRITICAL
```
Excel Column:  D - PAN
Database Field: customers.pan_number
Data Type:     VARCHAR(20)
Required:      YES (MANDATORY, UNIQUE)
Validation:    
  - EXACT format: 5 LETTERS + 4 NUMBERS + 1 LETTER
  - Format Regex: ^[A-Z]{5}[0-9]{4}[A-Z]$
  - Example: AAAPA1234X, BBBPB5678Y, CCCPC9012Z
  - Maximum 20 characters
  - MUST BE UNIQUE (no two customers with same PAN)
  - Cannot be NULL
Example Input: "AAAPA1234X"
Example Output: Stored as "AAAPA1234X"
Error Message: "PAN must be 10 characters, format: AAAPA1234X"
Database Constraint: UNIQUE KEY on pan_number
Encryption: Yes (encrypted at rest)
Importance: This is the PRIMARY IDENTIFIER for customer
```

### 5. **DPID** → `dpid`
```
Excel Column:  E - DPID
Database Field: customers.dpid
Data Type:     VARCHAR(50)
Required:      NO (optional - for demat account holders)
Validation:    
  - Format: Usually 10 digits (can vary by broker)
  - Examples: 0012345678, 0098765432
  - Maximum 50 characters
  - Can be NULL
Example Input: "0012345678", "0087654321", or leave BLANK
Example Output: Stored as-is (or NULL)
Error Message: "DPID format invalid (e.g., 0012345678)"
Note: Only if customer has demat account (BSE/NSE)
```

### 6. **Bank A/c No.** → `bank_account_no` ⭐ CRITICAL
```
Excel Column:  F - Bank A/c No.
Database Field: customers.bank_account_no
Data Type:     VARCHAR(50)
Required:      YES (MANDATORY, UNIQUE)
Validation:    
  - Length: 9-18 digits (varies by Indian bank)
  - Numeric only (no spaces, hyphens, letters)
  - MUST BE UNIQUE (no two customers with same account)
  - Cannot be NULL
  - Valid for target bank (IFSC code validation recommended)
Example Input: "1234567890123456", "9876543210123"
Example Output: Stored as-is
Error Message: "Bank account must be 9-18 digits, unique"
Database Constraint: UNIQUE KEY on bank_account_no
Security: Masked in UI (show only last 4 digits)
Encryption: Yes (encrypted at rest)
Critical For: Payment transfers, profit distribution
```

### 7. **Login ID** → `login_id`
```
Excel Column:  G - Login ID
Database Field: customers.login_id
Data Type:     VARCHAR(100)
Required:      NO (optional - if providing customer portal access)
Validation:    
  - Alphanumeric only (letters, numbers, underscore, hyphen)
  - Minimum 5 characters
  - Maximum 100 characters
  - Recommended format: firstname_lastname_number
  - Can be NULL (will be auto-generated if needed)
Example Input: "amit_patel_2024", "rajesh_kumar", "customer_001"
Example Output: Stored as-is (or auto-generated)
Error Message: "Login ID must be alphanumeric, 5-100 chars"
Note: If blank, system can auto-generate as: first5chars_of_name_randomnumber
```

### 8. **PASS** → `password_encrypted` ⚠️ SECURITY CRITICAL
```
Excel Column:  H - PASS
Database Field: customers.password_encrypted
Data Type:     VARCHAR(255) (HASHED)
Required:      NO (auto-generate if blank)
Validation:    
  - NEVER STORE AS PLAIN TEXT
  - Must be hashed using bcrypt (salt rounds >= 10)
  - If provided: min 8 chars, 1 uppercase, 1 number, 1 special char
  - If blank: system generates random secure password
Example Input: "MyPassword123!", "Secure@Pass2024", or leave BLANK
Example Output: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWFm (bcrypt hash)
Error Message: "Password must be 8+ chars with uppercase, number, special char"
Encryption: YES - MANDATORY (bcrypt with salt)
IMPORTANT: 
  - Never display/log actual passwords
  - Always hash before storing
  - Recommend auto-generate if not provided
  - User should change on first login
```

### 9. **CODE** → `code`
```
Excel Column:  I - CODE
Database Field: customers.code
Data Type:     VARCHAR(50)
Required:      NO (optional - internal reference code)
Validation:    
  - Alphanumeric + hyphen only
  - Maximum 50 characters
  - Can be NULL
  - Format examples: IPO-001, CLIENT-2024-001, REF-ABC-123
Example Input: "IPO-001", "CLIENT-2024-001", or leave BLANK
Example Output: Stored as-is
Error Message: "Code format invalid (alphanumeric + hyphen)"
Note: Internal identifier, can be auto-generated if blank
```

### 10. **Mobile Number** → `mobile_number` ⭐ CRITICAL
```
Excel Column:  J - Mobile Number
Database Field: customers.mobile_number
Data Type:     VARCHAR(20)
Required:      YES (MANDATORY)
Validation:    
  - For India: Exactly 10 digits, starting with 6-9
  - Format: XXXXXXXXXX (without country code)
  - International: Can include +91 or 0 prefix (will be stripped)
  - Cannot be NULL
  - Used for: SMS notifications, verification
Example Input: "9876543210", "+919876543210", "09876543210"
Example Output: Stored as "9876543210" (normalized)
Error Message: "Mobile number must be 10 digits (6-9xxxxxxxx)"
Normalization: Auto-strip +91 and 0 prefix, store last 10 digits
Encryption: No (used for communication)
Critical For: OTP verification, notifications, customer contact
```

### 11. **BALANCE** → `balance`
```
Excel Column:  K - BALANCE
Database Field: customers.balance
Data Type:     DECIMAL(15, 2) - Stores up to 9,999,999,999.99
Required:      NO (defaults to 0.00)
Validation:    
  - Must be numeric (can be positive or zero)
  - Maximum 2 decimal places
  - Cannot be NULL (defaults to 0)
  - Recommended: positive values only
Example Input: 50000, 50000.00, 0, 100000.50
Example Output: Stored as 50000.00
Error Message: "Balance must be numeric with max 2 decimals"
Calculation: Auto-updated on payments
Initial Value: If blank = 0.00
Note: This is starting balance, not auto-calculated
```

### 12. **Phone Kono chhe** → `phone_alternate`
```
Excel Column:  L - Phone Kono chhe
Database Field: customers.phone_alternate
Data Type:     VARCHAR(20)
Required:      NO (optional - alternate phone)
Validation:    
  - Same as mobile_number (10 digits)
  - Can be NULL
  - Can be landline or mobile
Example Input: "9876543211", "9123456789", or leave BLANK
Example Output: Stored as-is (or NULL)
Error Message: "Phone must be 10 digits"
Note: For backup contact, emergency contact, or landline
Gujarati: "Phone Kono chhe" = "Whose phone" (asking to identify phone)
```

### 13. **email** → `email`
```
Excel Column:  M - email
Database Field: customers.email
Data Type:     VARCHAR(100)
Required:      NO (optional but recommended)
Validation:    
  - Valid email format (RFC 5322)
  - Maximum 100 characters
  - Can be NULL
  - Used for: Email notifications, password recovery
Example Input: "amit@email.com", "rajesh.kumar@company.co.in", or leave BLANK
Example Output: Stored as-is (or NULL)
Error Message: "Email format invalid (e.g., user@domain.com)"
Validation: Must contain @ and . (domain)
Encryption: No (used for communication)
Used For: Profit notification, document upload alerts
```

### 14. **Phone** → `phone_other`
```
Excel Column:  N - Phone
Database Field: customers.phone_other
Data Type:     VARCHAR(20)
Required:      NO (optional - third phone number)
Validation:    
  - Same as mobile_number (10 digits)
  - Can be NULL
Example Input: "9876543212", "9098765432", or leave BLANK
Example Output: Stored as-is (or NULL)
Error Message: "Phone must be 10 digits"
Note: For any additional phone (office, family, etc.)
```

### 15. **RETURN** → `return_amount`
```
Excel Column:  O - RETURN
Database Field: customers.return_amount
Data Type:     DECIMAL(12, 2)
Required:      NO (defaults to 0.00)
Validation:    
  - Must be numeric
  - Maximum 2 decimal places
  - Should be zero or positive
  - Auto-calculated by system (not manual entry recommended)
Example Input: 10800.00, 5400.00, 0, or leave BLANK
Example Output: Stored as 10800.00
Error Message: "Return amount must be numeric with 2 decimals"
Note: This is auto-calculated when refunding unallotted shares
Auto-Calculation: 
  - If allotted < applied: return_amount = (applied - allotted) × issue_price
  - If allotted = applied: return_amount = 0
```

### 16. **TDS remarks** → `tds_remarks`
```
Excel Column:  P - TDS remarks
Database Field: customers.tds_remarks
Data Type:     TEXT (max 65,535 characters)
Required:      NO (optional - admin notes)
Validation:    
  - Any text (no length limit, but practical: 500 chars)
  - Can be NULL
  - Used for: Notes about TDS status, exemptions, certificates
Example Input: 
  "10% TDS applied on profit"
  "TDS exemption under section 194LA"
  "TDS certificate issued for FY 2024-25"
  "PAN not linked with Aadhar, TDS at higher rate"
Example Output: Stored as-is
Encoding: UTF8MB4 (supports Gujarati: "ટીડીએસ માટે તકેદારી")
Note: For audit trail and compliance documentation
Auto-Updated: When profit distributed with TDS deduction
```

### 17. **Beneficiary** → `beneficiary_name` & `customer_beneficiaries` table
```
Excel Column:  Q - Beneficiary
Database Field: customers.beneficiary_name (primary field)
                customer_beneficiaries.beneficiary_name (detailed)
Data Type:     VARCHAR(100)
Required:      NO (if blank, customer is own beneficiary)
Validation:    
  - Minimum 3 characters
  - Maximum 100 characters
  - Same rules as customer name
  - Can be NULL (defaults to customer name)
  - Can contain: letters, spaces, hyphens, dots
Example Input: "Priya Patel", "Rajesh Kumar", "John Doe", or leave BLANK
Example Output: Stored as-is (or NULL)
Error Message: "Beneficiary name must be 3-100 characters"
Encoding: UTF8MB4 (Gujarati support: "પ્રિયા પટેલ")

If provided, creates entry in:
  - customers.beneficiary_name (primary - for quick access)
  - customer_beneficiaries table (detailed - can have multiple)

Multiple Beneficiaries:
  - Primary beneficiary in beneficiary_name field
  - Other beneficiaries can be added later in customer_beneficiaries table
  - mark is_primary = true for primary beneficiary

Default: If blank, beneficiary_name = customer.name
```

---

## EXCEL IMPORT PROCESS FLOW

### Step 1: File Preparation
```
✓ Format: .XLSX (Excel 2007+)
✓ Encoding: UTF-8 (supports Gujarati)
✓ Sheet Name: "Sheet1" (first sheet only)
✓ Headers: Row 1 MUST contain column names (as listed above)
✓ Data: Starting from Row 2
✓ Max Rows: 10,000 per import (to prevent server timeout)
```

### Step 2: Validation (BEFORE Database Insert)
```
For each row:
  1. Check ALL required fields are present (PAN, Mobile, Bank Account, Name)
  2. Validate data types (phone = digits, email format, etc.)
  3. Check for duplicates (PAN, Bank Account, Mobile)
  4. Hash password before storing
  5. Normalize phone numbers
  6. Validate email format
  7. Generate missing optional fields (login_id, code, password)
  8. Check referential integrity (no orphaned records)

If ERROR found:
  - Flag row as FAILED
  - Log error message
  - Skip this row, continue with next
  - Display summary: X passed, Y failed
```

### Step 3: Database Transaction
```
BEGIN TRANSACTION
  - Insert all PASSED rows into customers table
  - Create entries in customer_beneficiaries table
  - Create entries in bulk_import_logs table (tracking)
COMMIT

If any error:
  ROLLBACK all changes
  Display error details
```

### Step 4: Post-Import Actions
```
For each imported customer:
  1. Send welcome email (if email provided)
  2. Send login credentials (if generated)
  3. Set kyc_status = 'pending' (requires verification)
  4. Mark documents_uploaded = false (unless docs provided later)
  5. Log import in bulk_import_logs table
```

---

## SAMPLE EXCEL FILE STRUCTURE

```
| NO. | NAME           | CA       | PAN          | DPID       | Bank A/c No.   | Login ID      | PASS          | CODE      | Mobile    | BALANCE  | Phone    | email              | Phone     | RETURN   | TDS remarks      | Beneficiary    |
|-----|----------------|----------|--------------|------------|----------------|---------------|---------------|-----------|-----------|----------|----------|-------------------|-----------|----------|------------------|----------------|
| 1   | Amit Patel     | AC123456 | AAAPA1234X   | 0012345678 | 1234567890123  | amit_ipo_24   | Secure@2024   | IPO-001   | 9876543210| 50000.00 | 9876543211 | amit@email.com   | 9876543212| 10800.00 | 10% TDS applied  | Priya Patel    |
| 2   | Rajesh Kumar   |          | BBBPB5678Y   | 0087654321 | 9876543210123  | rajesh_ipo_24 | MyPass123!    | IPO-002   | 9123456789| 100000.50| 9123456780 | rajesh@email.com | 9123456781| 5400.00  | TDS exemption    | Self           |
| 3   | Priya Sharma   | AC987654 | CCCPC9012Z   |            | 5555555555555  |               |               | IPO-003   | 8765432109| 0         |            | priya@email.com   |           | 0        | No TDS yet       |                |
```

---

## VALIDATION ERROR MESSAGES & FIXES

### Common Errors & How to Fix Them

| Error | Cause | Fix |
|-------|-------|-----|
| "PAN already exists" | Duplicate PAN in database | Check if customer exists, use different PAN, or update existing |
| "Bank account already exists" | Duplicate account number | Verify account number, use different account |
| "Mobile number invalid" | Not 10 digits or invalid format | Format: 10 digits starting with 6-9 (e.g., 9876543210) |
| "Email format invalid" | Missing @ or domain | Format: user@domain.com |
| "Name too short" | Less than 3 characters | Use full name (min 3 chars) |
| "Password too weak" | Missing uppercase, number, special char | Use: Abc@1234 (8+ chars, uppercase, number, special) |
| "DPID format invalid" | Not standard format | Use 10-digit format (e.g., 0012345678) |
| "Phone numbers same as mobile" | Phone alternate = mobile | Use different phone number |

---

## BULK IMPORT API ENDPOINT

### Request
```http
POST /api/bulk-import/customers
Content-Type: multipart/form-data

Body:
  - file: [XLSX file]
  - imported_by: [user_id]
```

### Response (Success)
```json
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

### Response (Failure)
```json
{
  "status": "error",
  "message": "File format not supported. Please use .XLSX",
  "total_rows": 0,
  "successful_rows": 0,
  "failed_rows": 0
}
```

---

## TEMPLATE EXCEL FILE

A blank Excel template should be provided to users with:
- ✓ Correct headers in Row 1
- ✓ Data validation (dropdowns for enums)
- ✓ Sample row with valid data
- ✓ Comments explaining each field
- ✓ Formatting (borders, colors for required fields)

**Download:** `/templates/IPO_Customer_Import_Template.xlsx`

---

## SECURITY & COMPLIANCE

### Before Import:
- [ ] File scanned for viruses (ClamAV)
- [ ] File size < 5 MB
- [ ] File format = .XLSX only

### During Import:
- [ ] All inputs validated and sanitized
- [ ] No SQL injection possible (parameterized queries)
- [ ] Passwords hashed immediately (bcrypt)
- [ ] Transaction rolled back on any error

### After Import:
- [ ] Audit log created (who, when, how many)
- [ ] Email sent to imported customers
- [ ] Backup created before mass import
- [ ] Report generated (success/failure counts)

---

## TROUBLESHOOTING

### Issue: "Encoding error - special characters showing as ???"
**Solution:** 
- Ensure Excel file is saved as UTF-8
- Save As → .XLSX → Options → Web Options → Encoding: UTF-8

### Issue: "Import stuck/timeout after 5 minutes"
**Solution:**
- File has too many rows (max 10,000 per import)
- Split large file into multiple smaller imports
- Contact admin for larger bulk import support

### Issue: "Some rows succeeded, some failed"
**Solution:**
- Review failed_records in import response
- Fix errors in Excel file for failed rows
- Re-import only failed rows or entire file again

### Issue: "Duplicate error even though no duplicate exists"
**Solution:**
- Check if previous import had errors and created partial data
- Check database directly for existing records
- Contact admin to review/cleanup duplicate data

---

**Document Version:** 1.0
**Last Updated:** January 2026
**For Developers:** Implement all validations listed above
**For Admin Users:** Follow column mapping and prepare Excel accordingly
