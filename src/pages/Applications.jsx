import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Plus, Search, RefreshCw, Layers, Database, Filter, X } from 'lucide-react';
import { supabase, fetchApplicationsLedger, subscribeToRealtimeChanges } from '../services/db.js';
import { SkeletonTableRow } from '../components/SkeletonLoader.jsx';

export default function Applications({ onOpenExcelModal }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const loadApplications = async () => {
    setLoading(true);
    try {
      const data = await fetchApplicationsLedger();
      setApplications(data || []);
    } catch (err) {
      console.error('Error fetching Applications ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();

    const unsubscribe = subscribeToRealtimeChanges(() => {
      loadApplications();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const getStatusBadgeClass = (status) => {
    switch (String(status).toLowerCase()) {
      case 'full allotment': return 'status-badge full';
      case 'partial allotment':
      case 'partial': return 'status-badge partial';
      case 'rejected': return 'status-badge rejected';
      case 'pending': return 'status-badge upcoming';
      default: return 'status-badge open';
    }
  };

  const filteredApps = applications.filter((app) => {
    const statusMatch = statusFilter === 'All' || String(app.status).toLowerCase().includes(statusFilter.toLowerCase());
    const query = searchQuery.toLowerCase().trim();
    const queryMatch =
      !query ||
      String(app.customer_name || '').toLowerCase().includes(query) ||
      String(app.pan_number || '').toLowerCase().includes(query) ||
      String(app.ipo_applied || '').toLowerCase().includes(query);

    return statusMatch && queryMatch;
  });

  return (
    <div className="tab-pane active" style={{ paddingBottom: '40px' }}>
      
      {/* Top Welcome Header */}
      <div className="welcome-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={24} style={{ color: 'var(--primary)' }} /> Customer IPO Applications Ledger
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Track live customer bids, lot allocations, 40-60 profit split ledger & 10% TDS deductions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={loadApplications} title="Refresh Applications Data">
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={onOpenExcelModal}>
            <Plus size={16} /> Upload / Import Bids
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {['All', 'Full Allotment', 'Partial', 'Pending', 'Rejected'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: statusFilter === st ? 'var(--primary)' : 'var(--panel-border)',
                  background: statusFilter === st ? 'var(--primary)' : 'transparent',
                  color: statusFilter === st ? '#FFFFFF' : 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {st}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: '280px', maxWidth: '380px', flex: '1 1 300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search by customer, PAN or IPO..."
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

        </div>
      </div>

      {/* Main Applications Data Table */}
      <div className="card glass-panel" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>PAN Number</th>
                <th>Bank A/C Ref</th>
                <th>IPO Applied</th>
                <th>Quantity</th>
                <th>Allotment Status</th>
                <th>40% Cust Profit</th>
                <th>10% TDS Deducted</th>
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
              ) : filteredApps.length > 0 ? (
                filteredApps.map((row) => (
                  <tr key={row.id || row.customer_name}>
                    <td><strong>{row.customer_name}</strong></td>
                    <td><code>{row.pan_number}</code></td>
                    <td>{row.bank_account}</td>
                    <td><strong style={{ color: 'var(--primary)' }}>{row.ipo_applied}</strong></td>
                    <td>{row.qty}</td>
                    <td><span className={getStatusBadgeClass(row.status)}>{row.status}</span></td>
                    <td className="text-green font-bold">{row.profit_40}</td>
                    <td className="text-amber font-semibold">{row.tds_10}</td>
                    <td><button className="btn-xs btn-outline">{row.action}</button></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    <Database size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                    <p>No matching applications found in Supabase database.</p>
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
