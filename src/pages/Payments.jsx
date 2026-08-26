import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, Search, RefreshCw, Database, FileText, X } from 'lucide-react';
import { fetchApplicationsLedger, subscribeToRealtimeChanges } from '../services/db.js';
import { SkeletonTableRow } from '../components/SkeletonLoader.jsx';
import { downloadPayoutVoucherPdf } from '../utils/pdfGenerator.js';
import Pagination from '../components/Pagination.jsx';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination-2 State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await fetchApplicationsLedger();
      const mapped = (data || []).map((app, idx) => {
        const gross = Number(app.profit_amount) || 0;
        const clientProfit = Number(app.client_share_60) || 0;
        const tds10 = Number(app.tds_10) || 0;
        const netPayout = Number(app.net_payout) || (clientProfit > 0 ? (clientProfit - tds10) : 0);

        let exitLabel = '40-60 Split';
        if (app.exit_mode === 'KOSTAK') exitLabel = `Kostak Exit @ ₹${app.kostak_rate || app.exit_price}`;
        else if (app.exit_mode === 'SAUDA') exitLabel = `Subject to Sauda @ ₹${app.sauda_rate || app.exit_price}`;
        else if (app.exit_mode === 'PRE_LISTING') exitLabel = `Off-Market Sale @ ₹${app.exit_price}`;
        else if (app.allotted_quantity) exitLabel = `${app.allotted_quantity} sh Allocated`;

        return {
          txn_id: app.application_number || `TXN-${8800 + idx + 1}`,
          customer: app.customer_name || 'Customer',
          beneficiary: `${app.customer_name || 'Customer'} (${app.bank_account || 'Bank A/C'})`,
          txn_type: `Profit Distribution (${exitLabel})`,
          gross_amount: `₹ ${gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          profit_40: `₹ ${clientProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          tds_10: `₹ ${tds10.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          net_payout: `₹ ${netPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          status: app.allotment_status || 'Verified & Audited'
        };
      });
      setPayments(mapped);
    } catch (err) {
      console.error('Error fetching payments ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();

    const unsubscribe = subscribeToRealtimeChanges(() => {
      loadPayments();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const filteredPayments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return payments.filter((p) => {
      return (
        !q ||
        p.customer.toLowerCase().includes(q) ||
        p.txn_id.toLowerCase().includes(q) ||
        p.beneficiary.toLowerCase().includes(q)
      );
    });
  }, [payments, searchQuery]);

  // Paginated Payments
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  const handleDownloadReceipt = (row) => {
    downloadPayoutVoucherPdf(row);
  };

  return (
    <div className="page-content" style={{ padding: '0' }}>

      {/* Top Header (Hero-11) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.03em' }}>
              Payments & Profit Distribution
            </h1>
            <span className="badge badge-teal">
              40-60 Split & 10% TDS
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--text-muted)' }}>
            Bank transfer coordinates, beneficiary payout vouchers, and automated tax withholding ledger.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadPayments}
            title="Refresh Payments Data"
            style={{ padding: '9px 14px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Ledger
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        borderRadius: '16px',
        padding: '14px 18px',
        marginBottom: '18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', minWidth: '280px', maxWidth: '380px', flex: '1 1 300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search payment by Txn ID or name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              paddingLeft: '38px',
              paddingRight: searchQuery ? '36px' : '14px',
              height: '38px',
              fontSize: '13.5px',
              borderRadius: '12px'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px'
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
          Showing {filteredPayments.length} of {payments.length} verified payouts
        </span>
      </div>

      {/* Main Table Card (Hero-11 Fintech Table) */}
      <div className="table-container">
        <table className="fintech-table">
          <thead>
            <tr>
              <th>Txn ID</th>
              <th>Customer</th>
              <th>Beneficiary Account</th>
              <th>Gross Gain</th>
              <th>40% Profit Share</th>
              <th>10% TDS</th>
              <th>Payout Net</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <SkeletonTableRow columns={9} />
                <SkeletonTableRow columns={9} />
                <SkeletonTableRow columns={9} />
                <SkeletonTableRow columns={9} />
              </>
            ) : paginatedPayments.length > 0 ? (
              paginatedPayments.map((row) => (
                <tr key={row.txn_id}>
                  <td><code style={{ background: 'rgba(4, 47, 46, 0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--primary)' }}>{row.txn_id}</code></td>
                  <td><strong style={{ color: 'var(--text-main)' }}>{row.customer}</strong></td>
                  <td><span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{row.beneficiary}</span></td>
                  <td>{row.gross_amount}</td>
                  <td><strong style={{ color: 'var(--success-text)' }}>{row.profit_40}</strong></td>
                  <td><span style={{ color: 'var(--warning)', fontWeight: 600 }}>{row.tds_10}</span></td>
                  <td><strong style={{ color: 'var(--primary)', fontSize: '14px' }}>{row.net_payout}</strong></td>
                  <td>
                    <span className="badge badge-teal">
                      {row.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleDownloadReceipt(row)}
                      style={{ padding: '6px 12px', fontSize: '12px', gap: '5px' }}
                    >
                      <FileText size={13} /> Voucher PDF
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                  <Database size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No verified payout transactions found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Watermelon Pagination-2 Component */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredPayments.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

    </div>
  );
}
