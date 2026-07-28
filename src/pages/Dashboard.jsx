import React, { useState, useEffect } from 'react';
import { Users, FileCheck2, Coins, Percent, TrendingUp, Calculator, History, Download, PlusCircle, RefreshCw, Database } from 'lucide-react';
import { fetchLiveIpos, fetchApplicationsLedger, fetchDashboardStats, subscribeToRealtimeChanges } from '../services/db.js';

export default function Dashboard({ onOpenExcelModal, onOpenAddIpoModal }) {
  const [allotPrice, setAllotPrice] = useState(500);
  const [listPrice, setListPrice] = useState(850);
  const [qty, setQty] = useState(100);

  const [stats, setStats] = useState({
    totalCustomers: '0',
    appliedFundPool: '0.00',
    customerProfit: '0.00',
    tdsDeducted: '0.00'
  });

  const [liveIpos, setLiveIpos] = useState([]);
  const [applicationsLedger, setApplicationsLedger] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, iposRes, ledgerRes] = await Promise.all([
        fetchDashboardStats(),
        fetchLiveIpos(),
        fetchApplicationsLedger()
      ]);
      setStats(statsRes);
      setLiveIpos(iposRes);
      setApplicationsLedger(ledgerRes);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Dashboard live data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Subscribe to Supabase Realtime changes
    const unsubscribe = subscribeToRealtimeChanges(() => {
      loadAllData();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const profitPerShare = listPrice - allotPrice;
  const totalProfit = profitPerShare * qty;
  const custShare = totalProfit * 0.40;
  const compShare = totalProfit * 0.60;
  const tds = custShare * 0.10;
  const netPayout = custShare - tds;

  const getStatusBadgeClass = (status) => {
    switch (String(status).toLowerCase()) {
      case 'open': return 'status-badge open';
      case 'upcoming': return 'status-badge upcoming';
      case 'listed': return 'status-badge listed';
      case 'full allotment': return 'status-badge full';
      case 'partial allotment': return 'status-badge partial';
      case 'rejected': return 'status-badge rejected';
      default: return 'status-badge open';
    }
  };

  return (
    <div className="tab-pane active">
      <div className="welcome-header">
        <div>
          <h2>System Control Overview</h2>
        </div>
        <div className="quick-actions">
          <button className="btn btn-secondary" onClick={loadAllData} title="Refresh Database Data">
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={onOpenAddIpoModal}>
            <PlusCircle size={16} /> Add New IPO
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon icon-blue"><Users size={24} /></div>
          <div className="stat-data">
            <span className="stat-label">Total Customers</span>
            <h3 className="stat-value">{stats.totalCustomers}</h3>
            <span className="stat-sub positive">Live DB Count</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon icon-purple"><FileCheck2 size={24} /></div>
          <div className="stat-data">
            <span className="stat-label">Applied Fund Pool</span>
            <h3 className="stat-value">₹ {stats.appliedFundPool}</h3>
            <span className="stat-sub">{liveIpos.length} Active IPOs</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon icon-green"><Coins size={24} /></div>
          <div className="stat-data">
            <span className="stat-label">Customer Profit (40%)</span>
            <h3 className="stat-value">₹ {stats.customerProfit}</h3>
            <span className="stat-sub positive">Distributed</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon icon-amber"><Percent size={24} /></div>
          <div className="stat-data">
            <span className="stat-label">Total 10% TDS Deducted</span>
            <h3 className="stat-value">₹ {stats.tdsDeducted}</h3>
            <span className="stat-sub">Tax Ready</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card glass-panel grid-span-2">
          <div className="card-header">
            <div>
              <h3><TrendingUp size={18} /> Live IPO Catalog & Allotment Engine</h3>
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
                {liveIpos.length > 0 ? (
                  liveIpos.map((ipo) => (
                    <tr key={ipo.id}>
                      <td>
                        <div className="ipo-cell">
                          <strong>{ipo.ipo_name}</strong>
                          <span className="cell-sub">{ipo.company_name || ipo.symbol || 'NSE / BSE'}</span>
                        </div>
                      </td>
                      <td>₹{ipo.price_band_min} - ₹{ipo.price_band_max}</td>
                      <td>{ipo.lot_size} shares</td>
                      <td>{ipo.subscription_open_date || ipo.open_date || 'Open'}</td>
                      <td><span className={getStatusBadgeClass(ipo.status)}>{ipo.status}</span></td>
                      <td><span className="tag-green">{ipo.gain_est || '+₹180/sh Est.'}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Database size={32} style={{ opacity: 0.5 }} />
                        <strong>No IPOs found in your Supabase database</strong>
                        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Add a new IPO or import Excel data to populate this table live.</span>
                      </div>
                    </td>
                  </tr>
                )}
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
              {applicationsLedger.length > 0 ? (
                applicationsLedger.map((app) => (
                  <tr key={app.id}>
                    <td><strong>{app.customer_name}</strong></td>
                    <td><code>{app.pan_number}</code></td>
                    <td>{app.bank_account}</td>
                    <td>{app.ipo_applied}</td>
                    <td>{app.qty}</td>
                    <td><span className={getStatusBadgeClass(app.status)}>{app.status}</span></td>
                    <td>{app.profit_40}</td>
                    <td>{app.tds_10}</td>
                    <td><button className="btn-xs btn-outline">{app.action || 'Details'}</button></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Database size={32} style={{ opacity: 0.5 }} />
                      <strong>No application records found in your database</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Use "Bulk Import Excel" to upload customers and applications to your database.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
