import React, { useState, useEffect } from 'react';
import { Users, FileCheck2, Coins, Percent, TrendingUp, Calculator, History, Download, RefreshCw, Database } from 'lucide-react';
import { fetchLiveIpos, fetchApplicationsLedger, fetchDashboardStats, subscribeToRealtimeChanges } from '../services/db.js';
import { SkeletonStatCard, SkeletonTableRow } from '../components/SkeletonLoader.jsx';

export default function Dashboard({ onOpenExcelModal }) {
  const [allotPrice, setAllotPrice] = useState(0);
  const [listPrice, setListPrice] = useState(0);
  const [qty, setQty] = useState(0);

  const [stats, setStats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ipoking_cache_stats')) || { totalCustomers: 0, appliedFundPool: '0.00', customerProfit: '0.00', tdsDeducted: '0.00' }; } catch(e) { return { totalCustomers: 0, appliedFundPool: '0.00', customerProfit: '0.00', tdsDeducted: '0.00' }; }
  });

  const [liveIpos, setLiveIpos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ipoking_cache_ipos')) || []; } catch(e) { return []; }
  });

  const [applicationsLedger, setApplicationsLedger] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ipoking_cache_applications')) || []; } catch(e) { return []; }
  });

  const [isLoading, setIsLoading] = useState(() => !liveIpos || liveIpos.length === 0);

  const loadAllData = async (force = false) => {
    if (!liveIpos || liveIpos.length === 0) {
      setIsLoading(true);
    }
    try {
      const [statsRes, iposRes, ledgerRes] = await Promise.all([
        fetchDashboardStats(force),
        fetchLiveIpos(force),
        fetchApplicationsLedger(force)
      ]);
      setStats(statsRes || {});
      setLiveIpos(iposRes || []);
      setApplicationsLedger(ledgerRes || []);
    } catch (err) {
      console.error('Dashboard live data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    const unsubscribe = subscribeToRealtimeChanges(() => {
      loadAllData();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const numAllot = Number(allotPrice) || 0;
  const numList = Number(listPrice) || 0;
  const numQty = Number(qty) || 0;

  const profitPerShare = numList - numAllot;
  const totalProfit = profitPerShare * numQty;
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
      {/* KPI Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '28px' }}>
        {isLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-icon icon-blue"><Users size={24} /></div>
              <div className="stat-data">
                <span className="stat-label">Total Customers</span>
                <h3 className="stat-value">{stats.totalCustomers || 0}</h3>
                <span className="stat-sub positive">Live Supabase Database</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon icon-purple"><FileCheck2 size={24} /></div>
              <div className="stat-data">
                <span className="stat-label">Applied Fund Pool</span>
                <h3 className="stat-value">₹ {typeof stats.totalVolume === 'number' ? stats.totalVolume.toLocaleString('en-IN') : (stats.appliedFundPool || '0')}</h3>
                <span className="stat-sub">{liveIpos.length} Active IPO Catalog</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon icon-green"><Coins size={24} /></div>
              <div className="stat-data">
                <span className="stat-label">Customer Profit (40%)</span>
                <h3 className="stat-value">₹ {typeof stats.clientEarnings === 'number' ? stats.clientEarnings.toLocaleString('en-IN') : (stats.customerProfit || '0')}</h3>
                <span className="stat-sub positive">Distributed Earnings</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon icon-amber"><Percent size={24} /></div>
              <div className="stat-data">
                <span className="stat-label">Total 10% TDS Deducted</span>
                <h3 className="stat-value">₹ {typeof stats.totalProfit === 'number' ? Math.round(stats.totalProfit * 0.10).toLocaleString('en-IN') : (stats.tdsDeducted || '0')}</h3>
                <span className="stat-sub">Tax Ready Audit</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Grid: Live IPO Catalog & Profit Engine */}
      <div className="dashboard-grid" style={{ marginBottom: '28px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, fontFamily: 'Manrope', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: 'var(--primary)' }} /> Live IPO Catalog &amp; Allotment Engine
            </h3>
            <span className="status-badge open">● LIVE MARKET</span>
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
                {isLoading ? (
                  <>
                    <SkeletonTableRow columns={6} />
                    <SkeletonTableRow columns={6} />
                    <SkeletonTableRow columns={6} />
                  </>
                ) : liveIpos.length > 0 ? (
                  liveIpos.map((ipo) => (
                    <tr key={ipo.id || ipo.ipo_name}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ fontFamily: 'Manrope', fontSize: '0.94rem', color: 'var(--text-main)' }}>{ipo.ipo_name}</strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{ipo.company_name || ipo.symbol || 'NSE / BSE'}</span>
                        </div>
                      </td>
                      <td><strong>₹{ipo.price_band_min || 0} - ₹{ipo.price_band_max || 0}</strong></td>
                      <td>{ipo.lot_size || 1} shares</td>
                      <td><span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>{ipo.subscription_open_date || ipo.open_date || 'Open Now'}</span></td>
                      <td><span className={getStatusBadgeClass(ipo.status)}>{String(ipo.status).toUpperCase()}</span></td>
                      <td><span className="status-badge open" style={{ background: '#E8F7F1', color: '#087A55', fontWeight: 700 }}>{ipo.gain_est || '+₹150/sh Est.'}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Database size={32} style={{ opacity: 0.5 }} />
                        <strong>No IPOs found in your Supabase database</strong>
                        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Add a new IPO from the IPO Master tab.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Profit & TDS Calculator */}
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, fontFamily: 'Manrope', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={18} style={{ color: 'var(--primary)' }} /> Profit &amp; TDS Engine
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Allotment Price (₹)</label>
              <input
                type="number"
                className="input-field"
                value={allotPrice}
                onChange={(e) => setAllotPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                style={{ height: '42px', fontWeight: 700, fontSize: '0.95rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Listing Price (₹)</label>
              <input
                type="number"
                className="input-field"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                style={{ height: '42px', fontWeight: 700, fontSize: '0.95rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Allotted Quantity (Shares)</label>
              <input
                type="number"
                className="input-field"
                value={qty}
                onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                style={{ height: '42px', fontWeight: 700, fontSize: '0.95rem' }}
              />
            </div>

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed var(--panel-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '8px', color: 'var(--text-muted)' }}>
                <span>Total Profit:</span>
                <strong style={{ fontFamily: 'Manrope', color: 'var(--text-main)' }}>₹ {totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '8px', color: '#087A55', fontWeight: 700 }}>
                <span>Customer Share (40%):</span>
                <strong style={{ fontFamily: 'Manrope' }}>₹ {custShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '8px', color: 'var(--text-muted)' }}>
                <span>Company Share (60%):</span>
                <strong style={{ fontFamily: 'Manrope' }}>₹ {compShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '12px', color: '#D99000', fontWeight: 600 }}>
                <span>10% TDS Withheld:</span>
                <strong style={{ fontFamily: 'Manrope' }}>₹ {tds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, color: 'var(--brand-deep)', paddingTop: '12px', borderTop: '1px solid var(--panel-border)' }}>
                <span>Net Customer Payout:</span>
                <strong style={{ fontFamily: 'Manrope', color: 'var(--primary)' }}>₹ {netPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Applications Ledger & Profit Split Stream */}
      <div className="card" style={{ padding: '24px' }}>
        <div className="card-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, fontFamily: 'Manrope', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} style={{ color: 'var(--primary)' }} /> Applications Ledger &amp; Profit Split Stream
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={onOpenExcelModal}>
              <Download size={14} /> Bulk Excel Import / Export
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>PAN Number</th>
                <th>Bank Acc</th>
                <th>IPO Applied</th>
                <th>Qty</th>
                <th>Status</th>
                <th>40% Cust Profit</th>
                <th>10% TDS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  <SkeletonTableRow columns={8} />
                  <SkeletonTableRow columns={8} />
                  <SkeletonTableRow columns={8} />
                </>
              ) : applicationsLedger.length > 0 ? (
                applicationsLedger.map((row) => (
                  <tr key={row.id}>
                    <td><strong style={{ fontFamily: 'Manrope' }}>{row.customer_name}</strong></td>
                    <td><code>{row.pan}</code></td>
                    <td>{row.bank_account || '—'}</td>
                    <td><strong style={{ color: 'var(--primary)' }}>{row.ipo_name}</strong></td>
                    <td>{row.lots_applied} Lots</td>
                    <td><span className={getStatusBadgeClass(row.allotment_status)}>{row.allotment_status}</span></td>
                    <td className="text-green font-bold">₹{Number(row.client_share_60 || 0).toLocaleString()}</td>
                    <td className="text-amber font-semibold">₹{Number(row.tds_10 || 0).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Database size={32} style={{ opacity: 0.5 }} />
                      <strong>No customer applications ledger entries found</strong>
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
