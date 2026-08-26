import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  FileCheck2,
  Coins,
  Percent,
  TrendingUp,
  Calculator,
  History,
  Download,
  RefreshCw,
  Database,
  ArrowRight
} from 'lucide-react';
import { fetchLiveIpos, fetchApplicationsLedger, fetchDashboardStats, subscribeToRealtimeChanges } from '../services/db.js';
import { SkeletonStatCard, SkeletonTableRow } from '../components/SkeletonLoader.jsx';
import Pagination from '../components/Pagination.jsx';

export default function Dashboard({ onOpenExcelModal, onOpenAddIpoModal }) {
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

  // Pagination for Dashboard Recent Applications
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

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

  const paginatedLedger = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return applicationsLedger.slice(start, start + pageSize);
  }, [applicationsLedger, currentPage, pageSize]);

  return (
    <div className="page-content" style={{ padding: '0' }}>

      {/* Hero-11 Welcome Section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.04em' }}>
            Institutional Desk Overview
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
            Real-time portfolio management, multi-account bidding stream, and tax-ready audit distributions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadAllData(true)}
            style={{ padding: '9px 14px' }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> Refresh Ledger
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenExcelModal}
            style={{ padding: '9px 18px' }}
          >
            <Download size={15} /> Bulk Customer Excel
          </button>
        </div>
      </div>

      {/* KPI Stats Grid (Hero-11 Stat Cards) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '18px',
        marginBottom: '28px'
      }}>
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
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Total Customers</span>
              <h3 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', margin: '8px 0 4px 0' }}>{stats.totalCustomers || 0}</h3>
              <span style={{ fontSize: '12px', color: 'var(--brand-accent)', fontWeight: 600 }}>Active Portfolios</span>
            </div>

            <div className="stat-card">
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Applied Fund Pool</span>
              <h3 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', margin: '8px 0 4px 0' }}>
                ₹ {typeof stats.totalVolume === 'number' ? stats.totalVolume.toLocaleString('en-IN') : (stats.appliedFundPool || '0')}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{liveIpos.length} Tracked Offerings</span>
            </div>

            <div className="stat-card">
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Customer Profit (40%)</span>
              <h3 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--success-text)', margin: '8px 0 4px 0' }}>
                ₹ {typeof stats.clientEarnings === 'number' ? stats.clientEarnings.toLocaleString('en-IN') : (stats.customerProfit || '0')}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--success-text)', fontWeight: 600 }}>Distributed Client Share</span>
            </div>

            <div className="stat-card">
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Total 10% TDS Deducted</span>
              <h3 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--warning)', margin: '8px 0 4px 0' }}>
                ₹ {typeof stats.totalProfit === 'number' ? Math.round(stats.totalProfit * 0.10).toLocaleString('en-IN') : (stats.tdsDeducted || '0')}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tax Ready Ledger</span>
            </div>
          </>
        )}
      </div>

      {/* Main 2-Column Section: Live IPO Catalog & Profit Engine */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '24px',
        marginBottom: '28px'
      }}>
        {/* Live IPO Catalog Card */}
        <div className="fintech-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: 'var(--brand-accent)' }} /> Active IPO Catalog
            </h3>
            <span className="badge badge-teal">
              ● Live Market
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="fintech-table">
              <thead>
                <tr>
                  <th>IPO Name</th>
                  <th>Price Band</th>
                  <th>Lot</th>
                  <th>Status</th>
                  <th>Est. Gain</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <>
                    <SkeletonTableRow columns={5} />
                    <SkeletonTableRow columns={5} />
                  </>
                ) : liveIpos.length > 0 ? (
                  liveIpos.slice(0, 5).map((ipo) => (
                    <tr key={ipo.id || ipo.ipo_name}>
                      <td>
                        <strong style={{ fontSize: '13.5px', color: 'var(--text-main)' }}>{ipo.ipo_name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ipo.company_name || ipo.symbol || 'NSE / BSE'}</div>
                      </td>
                      <td><strong>₹{ipo.price_band_min || 0} - ₹{ipo.price_band_max || 0}</strong></td>
                      <td>{ipo.lot_size || 1} sh</td>
                      <td>
                        <span className={`badge ${String(ipo.status).toLowerCase() === 'listed' ? 'badge-success' : 'badge-teal'}`}>
                          {String(ipo.status).toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-success">
                          {ipo.gain_est || '+₹150/sh Est.'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                      <Database size={28} style={{ opacity: 0.4, marginBottom: '6px' }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>No live IPOs in database catalog.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Profit & TDS Simulator Engine (Hero-11 Style) */}
        <div className="fintech-card" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={18} style={{ color: 'var(--brand-accent)' }} /> Profit &amp; 10% TDS Split Engine
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Simulate 40% Customer / 60% Company profit allocations.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px' }}>
            <div>
              <label className="input-label">Allotment Price (₹)</label>
              <input
                type="number"
                className="input-field"
                value={allotPrice}
                onChange={(e) => setAllotPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                style={{ fontWeight: 700 }}
              />
            </div>
            <div>
              <label className="input-label">Listing Price (₹)</label>
              <input
                type="number"
                className="input-field"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                style={{ fontWeight: 700 }}
              />
            </div>
            <div>
              <label className="input-label">Shares (Qty)</label>
              <input
                type="number"
                className="input-field"
                value={qty}
                onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                style={{ fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Results Box */}
          <div style={{
            background: 'rgba(4, 47, 46, 0.03)',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid var(--panel-border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'var(--text-muted)' }}>
              <span>Gross Profit Gain:</span>
              <strong style={{ color: 'var(--text-main)' }}>₹ {totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'var(--success-text)', fontWeight: 600 }}>
              <span>Customer Gross (40%):</span>
              <strong>₹ {custShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'var(--text-muted)' }}>
              <span>Company Share (60%):</span>
              <strong style={{ color: 'var(--text-main)' }}>₹ {compShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px', color: 'var(--warning)', fontWeight: 600 }}>
              <span>10% TDS Withholding:</span>
              <strong>₹ {tds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '15px',
              fontWeight: 800,
              color: 'var(--primary)',
              paddingTop: '10px',
              borderTop: '1px solid var(--panel-border)'
            }}>
              <span>Net Customer Payout:</span>
              <span>₹ {netPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Applications Ledger Stream Card (Hero-11 with Watermelon Pagination-2) */}
      <div className="table-container">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
              Recent Applications Ledger
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Live customer bid records and allocation payouts.
            </p>
          </div>
          <span className="badge badge-teal">
            {applicationsLedger.length} Total Bids
          </span>
        </div>

        <table className="fintech-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>PAN Number</th>
              <th>Bank A/C</th>
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
            ) : paginatedLedger.length > 0 ? (
              paginatedLedger.map((row) => (
                <tr key={row.id}>
                  <td><strong style={{ color: 'var(--text-main)' }}>{row.customer_name}</strong></td>
                  <td><code style={{ background: 'rgba(4, 47, 46, 0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--primary)' }}>{row.pan}</code></td>
                  <td><span style={{ fontSize: '12.5px' }}>{row.bank_account || '—'}</span></td>
                  <td><strong style={{ color: 'var(--primary)' }}>{row.ipo_name}</strong></td>
                  <td>{row.lots_applied} Lots</td>
                  <td>
                    <span className="badge badge-teal">
                      {row.allotment_status || 'Pending'}
                    </span>
                  </td>
                  <td><strong style={{ color: 'var(--success-text)' }}>₹{Number(row.client_share_60 || 0).toLocaleString()}</strong></td>
                  <td><span style={{ color: 'var(--warning)', fontWeight: 600 }}>₹{Number(row.tds_10 || 0).toLocaleString()}</span></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                  <Database size={28} style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No customer application bids logged yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Watermelon Pagination-2 Component */}
        <Pagination
          currentPage={currentPage}
          totalItems={applicationsLedger.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 25, 50]}
        />
      </div>

    </div>
  );
}
