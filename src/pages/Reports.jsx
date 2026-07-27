import React from 'react';
import { FileText, Download, Mail } from 'lucide-react';

export default function Reports() {
  return (
    <div className="tab-pane active">
      <div className="welcome-header">
        <div>
          <h2><FileText size={22} /> 10 Business & Compliance Reports</h2>
          <p>Generate, view, and export PDF, Excel (.XLSX) and CSV financial reports</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="card glass-panel">
          <h3>1. Customer Summary Report</h3>
          <p className="cell-sub">All customers & IPO participation</p>
          <button className="btn btn-secondary btn-block margin-top"><Download size={14} /> Download PDF / Excel</button>
        </div>
        <div className="card glass-panel">
          <h3>2. Application Status Report</h3>
          <p className="cell-sub">Applications per IPO</p>
          <button className="btn btn-secondary btn-block margin-top"><Download size={14} /> Download Excel</button>
        </div>
        <div className="card glass-panel">
          <h3>3. Customer Profit/Loss ⭐</h3>
          <p className="cell-sub">40-60 split & 10% TDS ledger</p>
          <button className="btn btn-primary btn-block margin-top"><Download size={14} /> Download PDF / Excel</button>
        </div>
        <div className="card glass-panel">
          <h3>4. Payment Transactions</h3>
          <p className="cell-sub">All money movements & bank refs</p>
          <button className="btn btn-secondary btn-block margin-top"><Download size={14} /> Download CSV</button>
        </div>
        <div className="card glass-panel">
          <h3>5. TDS Calculation Report</h3>
          <p className="cell-sub">10% Tax deduction summary</p>
          <button className="btn btn-secondary btn-block margin-top"><Download size={14} /> Download PDF</button>
        </div>
        <div className="card glass-panel">
          <h3>6. Compliance & KYC</h3>
          <p className="cell-sub">Documents & verification audit</p>
          <button className="btn btn-secondary btn-block margin-top"><Download size={14} /> Download PDF</button>
        </div>
        <div className="card glass-panel">
          <h3>7. Beneficiary Payouts</h3>
          <p className="cell-sub">Bank accounts & payouts</p>
          <button className="btn btn-secondary btn-block margin-top"><Download size={14} /> Download Excel</button>
        </div>
        <div className="card glass-panel">
          <h3>8. Multi-IPO Profit Analysis</h3>
          <p className="cell-sub">Compare IPO listing gains</p>
          <button className="btn btn-secondary btn-block margin-top"><Download size={14} /> Download PDF</button>
        </div>
        <div className="card glass-panel">
          <h3>9. Daily HTML Summary</h3>
          <p className="cell-sub">Email digest report</p>
          <button className="btn btn-secondary btn-block margin-top"><Mail size={14} /> Send Email</button>
        </div>
        <div className="card glass-panel">
          <h3>10. Monthly Financial</h3>
          <p className="cell-sub">Month-end bank reconciliation</p>
          <button className="btn btn-secondary btn-block margin-top"><Download size={14} /> Download PDF</button>
        </div>
      </div>
    </div>
  );
}
