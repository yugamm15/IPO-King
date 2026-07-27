# NSE/BSE API Integration Guide - Free IPO Data

## Overview
Integrate free IPO data from NSE/BSE to auto-populate upcoming IPOs in the system

---

## OPTION 1: NSE WEBSITE SCRAPING (Most Reliable)

### NSE IPO Data Page
- **URL:** https://www.nseindia.com/content/ipomanagement/ipolist.htm
- **Format:** HTML table (no official API, but scrapeable)
- **Update Frequency:** Daily (typically 3-4 PM IST)
- **Data Available:**
  - Company Name
  - Issue Size
  - Price Band
  - Subscription Open/Close Dates
  - Allotment Date
  - Listing Date

### Setup Requirement
```bash
# Install required Python libraries
pip install requests beautifulsoup4 selenium

# OR for Node.js
npm install axios cheerio puppeteer
```

### Python Implementation (Recommended)

```python
#!/usr/bin/env python3
"""
NSE IPO Data Scraper
Fetches IPO data from NSE website and updates database
Run daily (cron job at 4:00 PM IST)
"""

import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import mysql.connector

# Database connection
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="ipo_user",
        password="your_password",
        database="ipo_management"
    )

def fetch_nse_ipo_data():
    """
    Fetch IPO data from NSE website
    Returns: List of IPO dictionaries
    """
    
    url = "https://www.nseindia.com/content/ipomanagement/ipolist.htm"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find IPO table
        table = soup.find('table', {'class': 'data'})
        if not table:
            print("ERROR: IPO table not found")
            return []
        
        ipos = []
        rows = table.find_all('tr')[1:]  # Skip header
        
        for row in rows:
            cols = row.find_all('td')
            if len(cols) < 8:
                continue
            
            ipo_data = {
                'company_name': cols[0].text.strip(),
                'ipo_name': cols[1].text.strip(),
                'issue_size': cols[2].text.strip(),  # "₹X Crore"
                'price_band_min': float(cols[3].text.strip()),
                'price_band_max': float(cols[4].text.strip()),
                'subscription_open_date': parse_date(cols[5].text.strip()),
                'subscription_close_date': parse_date(cols[6].text.strip()),
                'allotment_date': parse_date(cols[7].text.strip()),
                'listing_date': parse_date(cols[8].text.strip() if len(cols) > 8 else None),
                'status': determine_status(cols[5].text.strip())  # upcoming, open, closed, etc.
            }
            
            ipos.append(ipo_data)
        
        return ipos
    
    except requests.RequestException as e:
        print(f"ERROR fetching NSE data: {e}")
        return []

def parse_date(date_str):
    """Convert various date formats to YYYY-MM-DD"""
    if not date_str or date_str.upper() == 'TBA':
        return None
    
    try:
        # Try DD-MMM-YYYY format (typical: 15-Jan-2026)
        return datetime.strptime(date_str, '%d-%b-%Y').strftime('%Y-%m-%d')
    except:
        try:
            # Try DD/MM/YYYY
            return datetime.strptime(date_str, '%d/%m/%Y').strftime('%Y-%m-%d')
        except:
            return None

def determine_status(open_date_str):
    """Determine IPO status based on open date"""
    open_date = parse_date(open_date_str)
    if not open_date:
        return 'upcoming'
    
    today = datetime.now().strftime('%Y-%m-%d')
    if open_date > today:
        return 'upcoming'
    else:
        return 'open'

def extract_issue_size(issue_str):
    """Extract numeric value from issue size string"""
    # Example: "₹1,830 Crore" -> 1830
    import re
    match = re.search(r'([\d,]+)', issue_str)
    if match:
        return float(match.group(1).replace(',', ''))
    return None

def upsert_ipo_data(ipos, user_id=1):
    """
    Insert or update IPO data in database
    """
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    updated = 0
    inserted = 0
    
    for ipo in ipos:
        # Check if IPO already exists
        query_check = """
            SELECT ipo_id FROM ipo_master 
            WHERE company_name = %s AND subscription_open_date = %s
        """
        
        cursor.execute(query_check, (ipo['company_name'], ipo['subscription_open_date']))
        existing = cursor.fetchone()
        
        if existing:
            # UPDATE
            query_update = """
                UPDATE ipo_master SET
                    ipo_name = %s,
                    price_band_min = %s,
                    price_band_max = %s,
                    subscription_close_date = %s,
                    allotment_date = %s,
                    listing_date = %s,
                    status = %s,
                    updated_at = NOW()
                WHERE ipo_id = %s
            """
            
            cursor.execute(query_update, (
                ipo['ipo_name'],
                ipo['price_band_min'],
                ipo['price_band_max'],
                ipo['subscription_close_date'],
                ipo['allotment_date'],
                ipo['listing_date'],
                ipo['status'],
                existing[0]
            ))
            updated += 1
        else:
            # INSERT
            query_insert = """
                INSERT INTO ipo_master (
                    company_name, ipo_name,
                    price_band_min, price_band_max,
                    subscription_open_date, subscription_close_date,
                    allotment_date, listing_date,
                    status, is_active, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            cursor.execute(query_insert, (
                ipo['company_name'],
                ipo['ipo_name'],
                ipo['price_band_min'],
                ipo['price_band_max'],
                ipo['subscription_open_date'],
                ipo['subscription_close_date'],
                ipo['allotment_date'],
                ipo['listing_date'],
                ipo['status'],
                True,
                user_id
            ))
            inserted += 1
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"Sync Complete: {inserted} inserted, {updated} updated")
    return {'inserted': inserted, 'updated': updated}

def main():
    """Main execution"""
    print(f"Starting NSE IPO Data Sync - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Fetch data from NSE
    ipos = fetch_nse_ipo_data()
    
    if not ipos:
        print("No IPO data fetched, check NSE website")
        return
    
    print(f"Fetched {len(ipos)} IPOs from NSE")
    
    # Update database
    result = upsert_ipo_data(ipos)
    
    print(f"Sync completed successfully")
    print(f"Inserted: {result['inserted']}, Updated: {result['updated']}")

if __name__ == "__main__":
    main()
```

### Setup Cron Job (Daily Auto-Update)

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 4:00 PM)
0 16 * * * /usr/bin/python3 /path/to/nse_scraper.py >> /var/log/ipo_sync.log 2>&1

# Verify
crontab -l
```

---

## OPTION 2: BSE IPO DATA

### BSE IPO Page
- **URL:** https://www.bseindia.com/issuers/newissuers.aspx
- **Format:** HTML table
- **Data:** Similar to NSE (Company, Price Band, Dates)

### Note
- BSE has same companies as NSE (they list on both)
- NSE is primary, BSE is backup
- Use NSE as primary source

---

## OPTION 3: MONEY CONTROL SCRAPING (Fallback)

### Money Control URL
- **URL:** https://www.moneycontrol.com/ipo/
- **Format:** Dynamic JavaScript (requires Selenium)
- **Advantage:** Clean structured data
- **Disadvantage:** Slower due to JavaScript rendering

### Selenium Implementation (Python)

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def fetch_moneycontrol_ipo():
    """Fetch IPO data from Money Control using Selenium"""
    
    # Setup headless browser
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    driver = webdriver.Chrome(options=options)
    
    try:
        driver.get("https://www.moneycontrol.com/ipo/")
        
        # Wait for table to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.CLASS_NAME, "tbl_row"))
        )
        
        ipos = []
        rows = driver.find_elements(By.CLASS_NAME, "tbl_row")
        
        for row in rows:
            cols = row.find_elements(By.TAG_NAME, "td")
            if len(cols) < 5:
                continue
            
            ipo_data = {
                'company_name': cols[0].text.strip(),
                'price_band': cols[1].text.strip(),
                'open_date': cols[2].text.strip(),
                'close_date': cols[3].text.strip(),
                'status': cols[4].text.strip()
            }
            
            ipos.append(ipo_data)
        
        return ipos
    
    finally:
        driver.quit()
```

---

## OPTION 4: OFFICIAL NSE API (If Available)

### NSE API Endpoints
```
Note: NSE doesn't officially publish IPO API
But there are third-party APIs that wrap NSE data

Option A: Use data.gov.in portal (Indian government)
Option B: Use financial data APIs (Polygon.io, Alpha Vantage)
Option C: Continue with web scraping (most reliable for IPO)
```

---

## DATABASE MAPPING: API → Database

```sql
-- API Response Example
{
  "company_name": "One97 Communications Pvt Ltd",
  "ipo_name": "Paytm IPO",
  "issue_size": "₹1,830 Crore",
  "price_band_min": 1050.00,
  "price_band_max": 1100.00,
  "subscription_open_date": "2026-01-15",
  "subscription_close_date": "2026-01-20",
  "allotment_date": "2026-01-25",
  "listing_date": "2026-02-01"
}

-- Maps to MySQL Table
INSERT INTO ipo_master (
  company_name,           -- "One97 Communications Pvt Ltd"
  ipo_name,              -- "Paytm IPO"
  ipo_issue_size,        -- 1830 (numeric)
  price_band_min,        -- 1050.00
  price_band_max,        -- 1100.00
  subscription_open_date,-- 2026-01-15
  subscription_close_date,-- 2026-01-20
  allotment_date,        -- 2026-01-25
  listing_date,          -- 2026-02-01
  status,                -- 'upcoming' or 'open'
  is_active,             -- TRUE
  created_by             -- 1 (system user)
) VALUES (...)
```

---

## SETTING UP AUTO-SYNC

### Method 1: Cron Job (Recommended)

```bash
# Create script file
sudo nano /opt/ipo_system/sync_nse_data.sh

# Add content
#!/bin/bash
cd /opt/ipo_system
/usr/bin/python3 scripts/nse_scraper.py
date >> /var/log/ipo_sync.log
echo "NSE sync completed" >> /var/log/ipo_sync.log

# Make executable
chmod +x /opt/ipo_system/sync_nse_data.sh

# Add to crontab
0 16 * * * /opt/ipo_system/sync_nse_data.sh
```

### Method 2: Background Worker (Node.js)

```javascript
// node_modules schedule package
const schedule = require('node-schedule');

// Run every day at 4:00 PM IST
const job = schedule.scheduleJob('0 16 * * *', async () => {
    console.log('Starting NSE sync...');
    await syncNSEIPOData();
    console.log('NSE sync completed');
});
```

### Method 3: SystemD Timer (Linux)

```ini
# /etc/systemd/system/ipo-sync.service
[Unit]
Description=IPO NSE Data Sync Service
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 /opt/ipo_system/nse_scraper.py
User=ipo_user

# /etc/systemd/system/ipo-sync.timer
[Unit]
Description=IPO NSE Data Sync Timer
Requires=ipo-sync.service

[Timer]
OnCalendar=*-*-* 16:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

---

## API ERROR HANDLING

### Common Errors & Solutions

```python
def fetch_with_retry(max_retries=3):
    """Fetch with retry logic"""
    
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return response
        
        except requests.Timeout:
            print(f"Timeout, attempt {attempt + 1}/{max_retries}")
            if attempt == max_retries - 1:
                raise
            time.sleep(5)  # Wait 5 seconds before retry
        
        except requests.ConnectionError:
            print(f"Connection error, attempt {attempt + 1}/{max_retries}")
            if attempt == max_retries - 1:
                raise
            time.sleep(10)  # Wait 10 seconds before retry
        
        except Exception as e:
            print(f"Unexpected error: {e}")
            raise

# Usage
try:
    data = fetch_with_retry()
except Exception as e:
    send_alert_email(f"NSE sync failed: {e}")
    log_error(e)
```

---

## MONITORING & LOGGING

### Log File Setup

```bash
# Create log file
touch /var/log/ipo_sync.log
chmod 666 /var/log/ipo_sync.log

# Add to Python script
import logging

logging.basicConfig(
    filename='/var/log/ipo_sync.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logging.info('NSE sync started')
logging.error('Failed to fetch data: ...')
```

### Email Alert on Failure

```python
import smtplib
from email.mime.text import MIMEText

def send_alert_email(error_message):
    """Send alert email if sync fails"""
    
    sender = "ipo@company.com"
    recipient = "admin@company.com"
    
    msg = MIMEText(f"NSE IPO sync failed:\n\n{error_message}")
    msg['Subject'] = "⚠️ IPO System Alert: Data Sync Failed"
    msg['From'] = sender
    msg['To'] = recipient
    
    with smtplib.SMTP('smtp.gmail.com', 587) as server:
        server.starttls()
        server.login(sender, "app_password")
        server.send_message(msg)
```

---

## TESTING THE INTEGRATION

### Manual Test
```bash
# Test script
python3 nse_scraper.py

# Expected output
Starting NSE IPO Data Sync - 2026-02-15 16:00:00
Fetched 12 IPOs from NSE
Sync Complete: 3 inserted, 9 updated
Sync completed successfully
```

### Database Verification
```sql
-- Check if data was imported
SELECT ipo_id, ipo_name, status, subscription_open_date 
FROM ipo_master 
ORDER BY created_at DESC 
LIMIT 10;

-- Should show recent IPOs
```

---

## SAMPLE SYNCED DATA (Example)

```sql
-- After successful NSE sync, database looks like:

ipo_id | ipo_name         | company_name                    | status    | price_band_min | listing_price
-------|------------------|--------------------------------|-----------|----------------|---------------
1      | Paytm IPO        | One97 Communications Pvt Ltd   | listed    | 1050.00        | 1890.00
2      | Jio IPO          | Reliance Industries Limited    | upcoming  | 1500.00        | NULL
3      | Zomato IPO       | Zomato Limited                 | listed    | 80.00          | 76.00
4      | Flipkart IPO     | Flipkart Internet Pvt Ltd      | upcoming  | 1200.00        | NULL
```

---

## RECOMMENDED WORKFLOW

1. **Daily Sync (4:00 PM IST)**
   - Fetch from NSE
   - Update prices, dates, status
   - Log changes

2. **Weekly Review (Every Monday)**
   - Check for failed syncs
   - Verify data accuracy
   - Update manual entries (if needed)

3. **Manual Entry (As Needed)**
   - For unlisted IPOs
   - For corrections
   - For additional information

4. **Post-Listing Update**
   - Admin manually enters listing price
   - Triggers profit calculation
   - Sends notifications to customers

---

## PRODUCTION CHECKLIST

- [ ] NSE scraper script tested and working
- [ ] Cron job configured for daily sync (4 PM)
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Email alerts set up
- [ ] Database backup before first sync
- [ ] Manual testing completed
- [ ] Monitoring dashboard created
- [ ] Fallback plan (Money Control scraper ready)

---

**Document Version:** 1.0
**Created:** January 2026
**NSE Data Source:** Verified & reliable
**Update Frequency:** Daily (automated)
