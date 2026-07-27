import React, { useState } from 'react';
import { Users, FileCheck2, Coins, Percent, TrendingUp, Calculator, History, Download, UploadCloud, PlusCircle } from 'lucide-react';

export default function Dashboard({ onOpenExcelModal }) {
  const [allotPrice, setAllotPrice] = useState(500);
  const [listPrice, setListPrice] = useState(850);
  const [qty, setQty] = useState(100);

  const profitPerShare = listPrice - allotPrice;
  const totalProfit = profitPerShare * qty;
  const custShare = totalProfit * 0.40;
  const compShare = totalProfit * 0.60;
  const tds = custShare * 0.10;
  const netPayout = custShare - tds;

  return (
    <div className="tab-pane active">
      <div className="welcome-header">
        <div>
          <h2>System Control Overview</h2>
          <p>IPO Applications, Profit Distribution Ledger (40-60 Split) & 10% TDS Engine</p>
        </div>
        <div className="quick-actions">
          <button className="btn btn-primary" onClick={onOpenExcelModal}>
            <UploadCloud size={16} /> Bulk Import Excel (17 Cols)
          </button>
          <button className="btn btn-secondary">
            <PlusCircle size={16} /> Add New IPO
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon icon-blue"><Users size={24} /></div>
          <div className="stat-data">
            <span className="stat-label">Total Customers</span>
            <h3 className="stat-value">1,248</h3>
            <span className="stat-sub positive"><TrendingUp size={12} /> +12% this month</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon icon-purple"><FileCheck2 size={24} /></div>
          <div className="stat-data">
            <span className="stat-label">Applied Fund Pool</span>
            <h3 className="stat-value">₹ 24.50 Cr</h3>
            <span className="stat-sub">14 Open IPOs</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon icon-green"><Coins size={24} /></div>
          <div className="stat-data">
            <span className="stat-label">Customer Profit (40%)</span>
            <h3 className="stat-value">₹ 42.84 L</h3>
            <span className="stat-sub positive">Distributed</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon icon-amber"><Percent size={24} /></div>
          <div className="stat-data">
            <span className="stat-label">Total 10% TDS Deducted</span>
            <h3 className="stat-value">₹ 10.71 L</h3>
            <span className="stat-sub">Tax Ready</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card glass-panel grid-span-2">
          <div className="card-header">
            <div>
              <h3><TrendingUp size={18} /> Live IPO Catalog & Allotment Engine</h3>
              <p>Automated Node.js scraper syncing daily</p>
            </div>
            <span className="pill-badge">Live Market</span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>IPO Name</th>
                  <th>Price Band</th>
                  <th>Lot Size</th>
                  <th>Subscription Dates</th>
                  <th>Status</th>
                  <th>Profit Split Preview</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="ipo-cell">
                      <strong>Swiggy Ltd IPO</strong>
                      <span className="cell-sub">NSE: SWIGGY | BSE: 544200</span>
                    </div>
                  </td>
                  <td>₹371 - ₹390</td>
                  <td>38 shares</td>
                  <td>15 Nov - 19 Nov</td>
                  <td><span className="status-badge open">Open Now</span></td>
                  <td><span className="tag-green">+₹180/sh Est.</span></td>
                </tr>
                <tr>
                  <td>
                    <div className="ipo-cell">
                      <strong>Tata Technologies</strong>
                      <span className="cell-sub">NSE: TATATECH</span>
                    </div>
                  </td>
                  <td>₹475 - ₹500</td>
                  <td>30 shares</td>
                  <td>22 Nov - 25 Nov</td>
                  <td><span className="status-badge upcoming">Upcoming</span></td>
                  <td><span className="tag-purple">+₹420/sh Est.</span></td>
                </tr>
                <tr>
                  <td>
                    <div className="ipo-cell">
                      <strong>Bajaj Housing Finance</strong>
                      <span className="cell-sub">NSE: BAJAJHFL</span>
                    </div>
                  </td>
                  <td>₹66 - ₹70</td>
                  <td>214 shares</td>
                  <td>09 Dec - 12 Dec</td>
                  <td><span className="status-badge listed">Listed</span></td>
                  <td><strong className="tag-gold">100% Listed Gain</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card glass-panel">
          <div className="card-header">
            <h3><Calculator size={18} /> Profit & TDS Engine</h3>
          </div>
          <div className="calculator-box">
            <div className="calc-group">
              <label>Allotment Price (₹)</label>
              <input type="number" value={allotPrice} onChange={(e) => setAllotPrice(Number(e.target.value))} />
            </div>
            <div className="calc-group">
              <label>Listing Price (₹)</label>
              <input type="number" value={listPrice} onChange={(e) => setListPrice(Number(e.target.value))} />
            </div>
            <div className="calc-group">
              <label>Allotted Quantity (Shares)</label>
              <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </div>

            <div className="calc-results">
              <div className="calc-row">
                <span>Total Profit:</span>
                <strong>₹ {totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="calc-row highlight">
                <span>Customer Share (40%):</span>
                <strong>₹ {custShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="calc-row">
                <span>Company Share (60%):</span>
                <strong>₹ {compShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="calc-row tax">
                <span>10% TDS Withheld:</span>
                <strong>₹ {tds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="calc-row net">
                <span>Net Payout to Customer:</span>
                <strong>₹ {netPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card glass-panel margin-top">
        <div className="card-header">
          <div>
            <h3><History size={18} /> Recent Application Ledger & Reconciliations</h3>
            <p>Automated customer balance trigger active</p>
          </div>
          <button className="btn-text"><Download size={14} /> Export Excel</button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>PAN Number</th>
                <th>Bank Account</th>
                <th>IPO Applied</th>
                <th>Qty</th>
                <th>Status</th>
                <th>40% Profit</th>
                <th>10% TDS</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Amit Kumar Patel</strong></td>
                <td><code>AAAPA1234X</code></td>
                <td>•••• 5678</td>
                <td>Swiggy Ltd</td>
                <td>38 shares</td>
                <td><span class="status-badge full">Full Allotment</span></td>
                <td>₹ 2,736.00</td>
                <td>₹ 273.60</td>
                <td><button className="btn-xs btn-outline">Details</button></td>
              </tr>
              <tr>
                <td><strong>Rajesh Sharma</strong></td>
                <td><code>BBBPB5678Y</code></td>
                <td>•••• 9012</td>
                <td>Bajaj Housing</td>
                <td>214 shares</td>
                <td><span class="status-badge partial">Partial Allotment</span></td>
                <td>₹ 5,992.00</td>
                <td>₹ 599.20</td>
                <td><button className="btn-xs btn-outline">Details</button></td>
              </tr>
              <tr>
                <td><strong>Priya Verma</strong></td>
                <td><code>CCCPC9012Z</code></td>
                <td>•••• 3456</td>
                <td>Tata Tech</td>
                <td>30 shares</td>
                <td><span class="status-badge rejected">Rejected</span></td>
                <td>₹ 0.00</td>
                <td>₹ 0.00</td>
                <td><button className="btn-xs btn-outline">Refunded</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
