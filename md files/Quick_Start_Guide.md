# IPO Management System - QUICK START GUIDE

## 🎯 PROJECT OVERVIEW

**Project Name:** IPO Management System (Admin Dashboard)  
**Database:** MySQL 8.0+  
**Language:** Node.js/Python/PHP (Your choice)  
**Framework:** Express.js / Flask / Laravel  
**Frontend:** React / Vue  
**Authentication:** JWT (JSON Web Tokens)  
**API Style:** RESTful  
**Hosting:** Self-hosted / AWS EC2 / DigitalOcean  

---

## 📋 COMPLETE DOCUMENTATION PROVIDED

| Document | Purpose | For |
|----------|---------|-----|
| **IPO_MySQL_Schema.sql** | Complete database design with 9 tables | Developers |
| **Excel_Import_Guide.md** | Map all 17 Excel columns to database fields | Developers & Admin |
| **Reports_Specification.md** | 10 complete reports with samples | Business Users |
| **NSE_BSE_API_Integration.md** | Free IPO data integration (Python code included) | Developers |
| **API_Endpoints_Specification.md** | 50+ REST API endpoints with request/response | Developers |
| **This Document** | Quick start & implementation roadmap | Project Manager |

---

## 🚀 PHASE 1: DATABASE SETUP (Week 1)

### Step 1.1: Install MySQL
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install mysql-server mysql-client

# Verify
mysql --version

# Start service
sudo systemctl start mysql
sudo systemctl enable mysql
```

### Step 1.2: Create Database
```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE ipo_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user
CREATE USER 'ipo_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON ipo_management.* TO 'ipo_user'@'localhost';
FLUSH PRIVILEGES;

# Test connection
mysql -u ipo_user -p ipo_management
```

### Step 1.3: Execute Schema
```bash
# Copy schema file
scp IPO_MySQL_Schema.sql your_server:/tmp/

# Run schema
mysql -u ipo_user -p ipo_management < /tmp/IPO_MySQL_Schema.sql

# Verify (should see 9 tables)
mysql -u ipo_user -p ipo_management -e "SHOW TABLES;"
```

### Step 1.4: Database Backup Setup
```bash
# Create backup script
nano /opt/ipo_backup.sh

#!/bin/bash
BACKUP_DIR="/backups/ipo_database"
mkdir -p $BACKUP_DIR
mysqldump -u ipo_user -p'password' ipo_management > $BACKUP_DIR/ipo_backup_$(date +%Y%m%d_%H%M%S).sql
# Upload to cloud storage (AWS S3, Google Drive)

# Make executable
chmod +x /opt/ipo_backup.sh

# Schedule daily at 2 AM
echo "0 2 * * * /opt/ipo_backup.sh" | crontab -
```

---

## 🔧 PHASE 2: BACKEND API SETUP (Week 2-4)

### Step 2.1: Choose Framework
```
✅ Recommended: Node.js + Express.js
- Fast development
- Large community
- Easy deployment

Alternative: Python + Flask
- Good for data processing
- Easier to integrate with NSE scraper
```

### Step 2.2: Project Structure (Node.js Example)
```
ipo-management-system/
├── config/
│   ├── database.js          # MySQL connection
│   ├── auth.js              # JWT configuration
│   └── settings.js          # App settings (TDS rate, etc.)
├── controllers/
│   ├── authController.js
│   ├── customerController.js
│   ├── ipoController.js
│   ├── applicationController.js
│   ├── paymentController.js
│   ├── reportController.js
│   └── ...
├── models/
│   ├── Customer.js
│   ├── IPO.js
│   ├── Application.js
│   ├── Allotment.js
│   ├── Payment.js
│   └── ...
├── routes/
│   ├── auth.js
│   ├── customers.js
│   ├── ipos.js
│   ├── applications.js
│   ├── payments.js
│   ├── reports.js
│   └── admin.js
├── middleware/
│   ├── auth.js              # JWT verification
│   ├── roleCheck.js         # Role-based access control
│   ├── validation.js        # Input validation
│   └── errorHandler.js
├── services/
│   ├── nseService.js        # NSE data fetching
│   ├── profitService.js     # Profit calculation
│   ├── paymentService.js    # Payment tracking
│   ├── reportService.js     # Report generation
│   └── emailService.js      # Email notifications
├── utils/
│   ├── validators.js        # PAN, email, phone validation
│   ├── formatters.js        # Data formatting
│   ├── encryption.js        # Encrypt sensitive data
│   └── logger.js            # Logging
├── uploads/
│   └── customers/           # Document storage
├── logs/
│   └── app.log              # Application logs
├── .env                     # Environment variables
├── .env.example             # Template
├── package.json             # Dependencies
├── server.js                # Entry point
└── README.md
```

### Step 2.3: Install Dependencies (Node.js)
```bash
# Initialize project
npm init -y

# Core dependencies
npm install express cors dotenv mysql2 bcryptjs jsonwebtoken

# Data validation
npm install joi

# Excel/CSV processing
npm install xlsx papaparse

# PDF generation
npm install pdfkit

# Email
npm install nodemailer

# Task scheduling
npm install node-schedule

# Database ORM (optional but recommended)
npm install sequelize

# Development
npm install --save-dev nodemon

# Update package.json scripts
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  }
}
```

### Step 2.4: Environment Configuration
```bash
# Create .env file
nano .env

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=ipo_user
DB_PASSWORD=strong_password
DB_NAME=ipo_management

# JWT
JWT_SECRET=your_super_secret_key_min_32_chars_long
JWT_EXPIRE=24h
REFRESH_TOKEN_EXPIRE=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# IPO Settings
TDS_RATE=10
COMPANY_PROFIT_SHARE=60
CUSTOMER_PROFIT_SHARE=40

# NSE Sync
NSE_SYNC_ENABLED=true
NSE_SYNC_TIME=16:00

# File Upload
UPLOAD_DIR=/uploads
MAX_FILE_SIZE=5242880  # 5 MB in bytes

# API
API_PORT=3000
API_ENV=development
LOG_LEVEL=info
```

### Step 2.5: Database Connection
```javascript
// config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

module.exports = pool;
```

### Step 2.6: Authentication Middleware
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ status: 'error', message: 'Invalid token' });
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
```

### Step 2.7: Implement All API Endpoints
**Reference:** API_Endpoints_Specification.md (50+ endpoints listed)

Priority Order:
1. **Authentication** (Login, Logout, Refresh)
2. **Customers** (CRUD, Bulk Import)
3. **IPOs** (Create, List, Update)
4. **Applications** (Create, List, Update Status)
5. **Payments** (Record, Verify, Distribute Profit)
6. **Reports** (Export PDF/Excel)
7. **Admin** (Dashboard, Settings)

### Step 2.8: Testing
```bash
# Unit tests (Jest)
npm install --save-dev jest

# API testing (Postman or curl)
# Import API_Endpoints_Specification.md endpoints

# Load testing
npm install --save-dev artillery
artillery load test-plan.yml
```

---

## 🎨 PHASE 3: FRONTEND SETUP (Week 4-6)

### Step 3.1: Project Structure (React)
```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.jsx
│   │   │   └── ForgotPassword.jsx
│   │   ├── Dashboard/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── StatCards.jsx
│   │   │   └── Charts.jsx
│   │   ├── Customers/
│   │   │   ├── CustomerList.jsx
│   │   │   ├── CustomerDetail.jsx
│   │   │   ├── CreateCustomer.jsx
│   │   │   └── BulkImport.jsx
│   │   ├── IPOs/
│   │   │   ├── IPOList.jsx
│   │   │   ├── IPODetail.jsx
│   │   │   ├── CreateIPO.jsx
│   │   │   └── MarkListed.jsx
│   │   ├── Applications/
│   │   │   ├── ApplicationList.jsx
│   │   │   └── AllotmentForm.jsx
│   │   ├── Payments/
│   │   │   ├── PaymentList.jsx
│   │   │   ├── RecordPayment.jsx
│   │   │   └── VerifyPayment.jsx
│   │   ├── Reports/
│   │   │   ├── CustomerSummary.jsx
│   │   │   ├── ProfitStatement.jsx
│   │   │   ├── PaymentReport.jsx
│   │   │   └── TDSReport.jsx
│   │   └── Common/
│   │       ├── Navbar.jsx
│   │       ├── Sidebar.jsx
│   │       ├── Table.jsx
│   │       └── Modal.jsx
│   ├── services/
│   │   ├── api.js           # Axios instance
│   │   ├── auth.js          # Auth service
│   │   ├── customers.js
│   │   ├── ipos.js
│   │   ├── reports.js
│   │   └── ...
│   ├── context/
│   │   └── AuthContext.jsx  # Global auth state
│   ├── hooks/
│   │   └── useAuth.js       # Custom hooks
│   ├── utils/
│   │   ├── formatters.js    # Format data for display
│   │   └── validators.js    # Client-side validation
│   ├── App.jsx
│   ├── App.css
│   └── index.js
├── package.json
└── .env
```

### Step 3.2: Key Pages to Build

**Admin Dashboard**
- Summary cards (customers, applications, profit)
- Charts (applications per IPO, profit distribution)
- Quick actions (create customer, create IPO)
- Recent transactions table

**Customer Management**
- Table with search/filter/sort
- Create customer form
- Customer detail view (with documents, applications, payments)
- Bulk import Excel

**IPO Management**
- List all IPOs with status badges
- Create IPO form
- Edit IPO (update listing price, mark as listed)
- IPO detail view with analytics

**Application Tracking**
- List applications (filterable by IPO, customer, status)
- Mark allotment status (full/partial/rejected)
- Auto-calculate refunds
- Payment status tracking

**Payment Management**
- Record payment (application, refund, profit)
- List all payments (with status)
- Verify payment (admin action)
- Export payment report

**Reports**
- Generate & export reports (PDF, Excel)
- Customer summary
- Profit/loss statement
- TDS calculation
- Compliance report

---

## 📊 PHASE 4: INTEGRATIONS (Week 7)

### Step 4.1: NSE Data Integration
**Reference:** NSE_BSE_API_Integration.md (Python code included)

```bash
# Install Python dependencies
pip install requests beautifulsoup4 mysql-connector-python

# Create NSE sync script
cp nse_scraper.py /opt/ipo_system/

# Setup cron job (daily 4:00 PM)
0 16 * * * /usr/bin/python3 /opt/ipo_system/nse_scraper.py
```

### Step 4.2: Email Notifications
```javascript
// services/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Send welcome email
async function sendWelcomeEmail(customer) {
  await transporter.sendMail({
    from: 'ipo@company.com',
    to: customer.email,
    subject: 'Welcome to IPO Management System',
    html: `
      <h1>Welcome ${customer.name}</h1>
      <p>Your account has been created successfully.</p>
      <p><strong>Login ID:</strong> ${customer.login_id}</p>
    `
  });
}

module.exports = { sendWelcomeEmail };
```

### Step 4.3: PDF Report Generation
```javascript
// services/reportService.js
const PDFDocument = require('pdfkit');

async function generateProfitReport(ipo_id) {
  const doc = new PDFDocument();
  
  // Fetch data from database
  const allotments = await getAllotments(ipo_id);
  
  // Add content
  doc.fontSize(16).text('PROFIT/LOSS STATEMENT', 100, 100);
  doc.fontSize(10);
  
  allotments.forEach(row => {
    doc.text(`${row.customer_name}: ₹${row.customer_profit_40pct}`);
  });
  
  // Save
  return doc.pipe(fs.createWriteStream('report.pdf'));
}
```

---

## ✅ PHASE 5: TESTING & QA (Week 8)

### Test Cases Required
- User authentication (login, logout, token refresh)
- Customer creation with all 17 Excel columns
- Bulk import 100 customers from Excel
- Create IPO, add applications, mark allotments
- Calculate profit correctly (40-60 split with 10% TDS)
- Generate all 10 reports
- Verify payment workflow
- Test NSE data sync

### Load Testing
```bash
# Simulate 100 concurrent users
artillery quick --count 100 --num 1000 https://api.yourdomain.com/customers
```

---

## 🚀 PHASE 6: DEPLOYMENT (Week 9)

### Step 6.1: Server Setup
```bash
# Rent server (AWS EC2 t3.medium recommended)
# 2 vCPU, 4 GB RAM, 50 GB SSD

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Setup production environment
pm2 start server.js --name "ipo-api" --instances max
pm2 startup
pm2 save
```

### Step 6.2: Database Migration
```bash
# Backup existing data (if any)
mysqldump -u ipo_user -p ipo_management > backup_before_deploy.sql

# Run schema
mysql -u ipo_user -p ipo_management < IPO_MySQL_Schema.sql

# Verify
mysql -u ipo_user -p ipo_management -e "SELECT COUNT(*) FROM customers;"
```

### Step 6.3: SSL Certificate
```bash
# Free SSL with Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --standalone -d api.yourdomain.com
```

### Step 6.4: Nginx Reverse Proxy
```nginx
# /etc/nginx/sites-available/ipo-api
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

---

## 📈 PHASE 7: MONITORING & MAINTENANCE

### Real-Time Monitoring
```bash
# PM2 monitoring
pm2 monit

# Application logs
tail -f /var/log/ipo_api.log

# System resources
htop
```

### Daily Tasks
- [ ] Monitor NSE sync (4:00 PM)
- [ ] Check error logs
- [ ] Verify database backups

### Weekly Tasks
- [ ] Review payment reconciliation
- [ ] Check document verification queue
- [ ] Generate compliance reports

### Monthly Tasks
- [ ] Database optimization
- [ ] Security audit
- [ ] Performance review
- [ ] Customer feedback review

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues

**Issue:** "PAN already exists"
- **Solution:** Check if customer already registered, use different PAN

**Issue:** NSE sync fails
- **Solution:** Check NSE website manually, verify internet connection, review logs

**Issue:** Profit calculation incorrect
- **Solution:** Verify formula: (listing - allotment) × qty × 0.40, check TDS rate

**Issue:** Payment not showing
- **Solution:** Check transaction_status = 'completed', verify date filter

---

## 🎓 HANDOVER CHECKLIST

- [ ] Database setup complete
- [ ] All tables verified
- [ ] Backup automated
- [ ] API all 50+ endpoints built
- [ ] Authentication working (JWT)
- [ ] All 10 reports implemented
- [ ] Excel import bulk feature working
- [ ] NSE sync automated
- [ ] Frontend dashboard complete
- [ ] All forms validated
- [ ] Security review completed
- [ ] Load testing passed
- [ ] Documentation complete
- [ ] Deployment to production
- [ ] Monitoring setup
- [ ] Team trained
- [ ] Go-live successful

---

## 📚 DOCUMENTATION REFERENCE

| Need | Document |
|------|----------|
| Database fields | Excel_Import_Guide.md |
| API endpoints | API_Endpoints_Specification.md |
| Reports needed | Reports_Specification.md |
| IPO data source | NSE_BSE_API_Integration.md |
| Schema & tables | IPO_MySQL_Schema.sql |

---

## ⏱️ TIMELINE ESTIMATE

| Phase | Duration | Deliverable |
|-------|----------|------------|
| Database Setup | 3-4 days | Schema created, tested |
| Backend API | 10-14 days | All 50+ endpoints |
| Frontend | 10-14 days | Admin dashboard |
| Integration | 3-5 days | NSE sync, email, reports |
| Testing & QA | 5-7 days | All test cases pass |
| Deployment | 2-3 days | Live on production |
| **TOTAL** | **35-48 days** | **~8 weeks (2 months)** |

---

## 🎯 SUCCESS CRITERIA

✅ System is live and accessible  
✅ All 10 reports generate correctly  
✅ Profit calculated accurately (40-60 split with 10% TDS)  
✅ Excel bulk import works (all 17 columns)  
✅ Payments tracked completely  
✅ NSE data auto-syncs daily  
✅ 99% uptime achieved  
✅ Zero data loss (backups working)  
✅ Users can generate their own reports  
✅ Compliance reports for tax/audit ready  

---

**Good luck with the project! 🚀**

For questions:
- Database: Refer to IPO_MySQL_Schema.sql
- APIs: Refer to API_Endpoints_Specification.md
- Reports: Refer to Reports_Specification.md
- Data: Refer to Excel_Import_Guide.md
- IPO Data: Refer to NSE_BSE_API_Integration.md

---

**Document Version:** 1.0  
**Created:** January 2026  
**Status:** Ready for development  
**Estimated Completion:** 8 weeks
