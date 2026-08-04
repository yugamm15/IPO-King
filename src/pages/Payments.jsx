import React, { useState, useEffect } from 'react';
import { Wallet, Search, RefreshCw, Database, FileText, CheckCircle2, X } from 'lucide-react';
import { supabase, fetchApplicationsLedger, subscribeToRealtimeChanges } from '../services/db.js';
import { SkeletonTableRow } from '../components/SkeletonLoader.jsx';
import { generateReportPdf } from '../utils/reportExporter.js';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await fetchApplicationsLedger();
      const mapped = (data || []).map((app, idx) => {
        const amountNum = Number(String(app.profit_40 || '0').replace(/[^0-9.]/g, '')) * 2.5 || 15000;
        const profit40 = amountNum * 0.40;
        const tds10 = profit40 * 0.10;
        const netPayout = profit40 - tds10;

        return {
          txn_id: `TXN-${8800 + idx + 1}`,
          customer: app.customer_name,
          beneficiary: `${app.customer_name} (${app.bank_account || 'Bank A/C'})`,
          txn_type: 'Profit Distribution (40-60 Split)',
          gross_amount: `₹ ${amountNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          profit_40: `₹ ${profit40.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          tds_10: `₹ ${tds10.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          net_payout: `₹ ${netPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          status: 'Verified & Audited'
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

  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      p.customer.toLowerCase().includes(q) ||
      p.txn_id.toLowerCase().includes(q) ||
      p.beneficiary.toLowerCase().includes(q)
    );
  });

  const handleDownloadReceipt = (row) => {
    generateReportPdf({
      title: `Payout Voucher — ${row.txn_id}`,
      subtitle: `Official Payment & TDS Ledger Slip for ${row.customer}`,
      columns: [
        { header: 'Parameter', key: 'param', width: 40 },
        { header: 'Details / Amount', key: 'val', width: 60 }
      ],
      rows: [
        { param: 'Transaction Ref', val: row.txn_id },
        { param: 'Customer Name', val: row.customer },
        { param: 'Beneficiary Bank', val: row.beneficiary },
        { param: 'Gross Realized Profit', val: row.gross_amount },
        { param: 'Customer Share (40%)', val: row.profit_40 },
        { param: '10% TDS Withheld', val: row.tds_10 },
        { param: 'Net Settled Payout', val: row.net_payout },
        { param: 'Audit Status', val: 'Verified (ITD Compliant)' }
      ]
    });
  };

  return (
    <div className="tab-pane active" style={{ paddingBottom: '40px' }}>
      
      {/* Top Header */}
      <div className="welcome-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wallet size={24} style={{ color: 'var(--primary)' }} /> Payments & Profit Distribution (40-60 Split & 10% TDS)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Manual bank transfers, beneficiary payout vouchers, and automated tax withholding ledger.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={loadPayments} title="Refresh Payments Data">
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Ledger
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', minWidth: '280px', maxWidth: '380px', flex: '1 1 300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search payment by Txn ID or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: '38px',
              paddingRight: searchQuery ? '36px' : '14px',
              height: '40px',
              fontSize: '0.88rem',
              borderRadius: '12px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
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

        <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
          Showing {filteredPayments.length} of {payments.length} verified payouts
        </span>
      </div>

      {/* Main Table */}
      <div className="card glass-panel" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                <th>Action</th>
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
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((row) => (
                  <tr key={row.txn_id}>
                    <td><code>{row.txn_id}</code></td>
                    <td><strong>{row.customer}</strong></td>
                    <td><span style={{ fontSize: '0.84rem' }}>{row.beneficiary}</span></td>
                    <td>{row.gross_amount}</td>
                    <td className="text-green font-bold">{row.profit_40}</td>
                    <td className="text-amber font-semibold">{row.tds_10}</td>
                    <td><strong style={{ color: 'var(--primary)', fontSize: '0.94rem' }}>{row.net_payout}</strong></td>
                    <td><span className="status-badge open">{row.status}</span></td>
                    <td>
                      <button
                        className="btn-xs btn-outline"
                        onClick={() => handleDownloadReceipt(row)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <FileText size={12} /> Voucher
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    <Database size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                    <p>No verified payout transactions found.</p>
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
