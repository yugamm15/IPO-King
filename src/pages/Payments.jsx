import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Search,
  RefreshCw,
  Database,
  FileText,
  X,
  FileSpreadsheet,
  FileDown,
  TrendingUp,
  ShieldCheck,
  Building2,
  DollarSign,
  Tag,
  Handshake,
  Zap
} from 'lucide-react';
import { fetchApplicationsLedger, subscribeToRealtimeChanges } from '../services/db.js';
import { SkeletonTableRow } from '../components/SkeletonLoader.jsx';
import { downloadPayoutVoucherPdf, downloadJainamStcgPdf } from '../utils/pdfGenerator.js';
import Pagination from '../components/Pagination.jsx';

export default function Payments() {
  const [activeTab, setActiveTab] = useState('vouchers'); // 'vouchers' | 'jainam_stcg'
  const [rawApps, setRawApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination-2 State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await fetchApplicationsLedger();
      setRawApps(data || []);
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

  // Standard Payout Vouchers List
  const payments = useMemo(() => {
    return rawApps.map((app, idx) => {
      const gross = Number(app.profit_amount) || 0;
      const clientProfit = Number(app.client_share_60) || 0;
      const tds10 = Number(app.tds_10) || 0;
      const netPayout = Number(app.net_payout) || (clientProfit > 0 ? (clientProfit - tds10) : clientProfit);

      let exitLabel = '40-60 Split';
      if (app.exit_mode === 'KOSTAK') exitLabel = `Kostak Exit @ ₹${app.kostak_rate || app.exit_price}`;
      else if (app.exit_mode === 'SAUDA') exitLabel = `Subject to Sauda @ ₹${app.sauda_rate || app.exit_price}`;
      else if (app.exit_mode === 'PRE_LISTING') exitLabel = `Off-Market Sale @ ₹${app.exit_price}`;
      else if (app.allotted_quantity) exitLabel = `${app.allotted_quantity} sh Allocated`;

      return {
        txn_id: app.application_number || `TXN-${8800 + idx + 1}`,
        customer: app.customer_name || 'Customer',
        pan: app.pan || '—',
        bank_name: app.bank_name || '—',
        beneficiary: `${app.customer_name || 'Customer'} (${app.bank_account || 'Bank A/C'})`,
        txn_type: `Profit Distribution (${exitLabel})`,
        gross_amount: `${gross < 0 ? '-₹ ' + Math.abs(gross).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '₹ ' + gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        profit_40: `${clientProfit < 0 ? '-₹ ' + Math.abs(clientProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '₹ ' + clientProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        tds_10: `₹ ${tds10.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        net_payout: `${netPayout < 0 ? '-₹ ' + Math.abs(netPayout).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '₹ ' + netPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        status: app.allotment_status || 'Verified & Audited'
      };
    });
  }, [rawApps]);

  // Jainam-Style Short-Term Capital Gains (STCG) P&L Rows
  const stcgRows = useMemo(() => {
    return rawApps.map((app, idx) => {
      const rawLots = Number(app.lots_applied) || 1;
      const lotSize = app.quantity && app.lots_applied ? Math.floor(app.quantity / app.lots_applied) : 50;
      const qty = Number(app.allotted_quantity) || Number(app.quantity) || (rawLots * lotSize);
      const buyPrice = Number(app.price_band_max) || Number(app.issue_price) || 100;
      const buyValue = buyPrice * qty;

      let sellPrice = Number(app.exit_price) || Number(app.listing_price) || buyPrice;
      if (app.exit_mode === 'KOSTAK' && app.kostak_rate) {
        sellPrice = buyPrice + (Number(app.kostak_rate) / lotSize);
      } else if (app.exit_mode === 'SAUDA' && app.sauda_rate) {
        sellPrice = buyPrice + (Number(app.sauda_rate) / lotSize);
      }

      const grossStcg = Number(app.profit_amount) || 0;
      const sellTurnover = buyValue + grossStcg;
      const client40 = Number(app.client_share_60) || Math.round(grossStcg * 0.40);
      const tds10 = Number(app.tds_10) || (client40 > 0 ? Math.round(client40 * 0.10) : 0);
      const netPayout = Number(app.net_payout) || (client40 > 0 ? (client40 - tds10) : client40);

      return {
        id: app.id || idx,
        client_name: app.customer_name || 'Customer',
        pan: app.pan || '—',
        bank_name: app.bank_name || '—',
        scrip: app.ipo_name || 'IPO Offering',
        lots: rawLots,
        qty: qty,
        buy_price: buyPrice,
        buy_value: buyValue,
        sell_price: Math.round(sellPrice),
        sell_turnover: sellTurnover,
        gross_stcg: grossStcg,
        client_40: client40,
        tds_10: tds10,
        net_payout: netPayout,
        exit_mode: app.exit_mode || 'MARKET',
        status: app.allotment_status || 'Full Allotment'
      };
    });
  }, [rawApps]);

  // STCG Summary Metrics
  const stcgSummary = useMemo(() => {
    return {
      totalBuyValue: stcgRows.reduce((sum, r) => sum + r.buy_value, 0),
      totalSellTurnover: stcgRows.reduce((sum, r) => sum + r.sell_turnover, 0),
      totalGrossStcg: stcgRows.reduce((sum, r) => sum + r.gross_stcg, 0),
      totalClientProfit: stcgRows.reduce((sum, r) => sum + r.client_40, 0),
      totalTds: stcgRows.reduce((sum, r) => sum + r.tds_10, 0),
      totalNetPayout: stcgRows.reduce((sum, r) => sum + r.net_payout, 0),
    };
  }, [stcgRows]);

  // Filtered List
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (activeTab === 'vouchers') {
      return payments.filter((p) => {
        return (
          !q ||
          p.customer.toLowerCase().includes(q) ||
          p.txn_id.toLowerCase().includes(q) ||
          p.beneficiary.toLowerCase().includes(q) ||
          p.pan.toLowerCase().includes(q)
        );
      });
    } else {
      return stcgRows.filter((r) => {
        return (
          !q ||
          r.client_name.toLowerCase().includes(q) ||
          r.pan.toLowerCase().includes(q) ||
          r.scrip.toLowerCase().includes(q) ||
          r.bank_name.toLowerCase().includes(q)
        );
      });
    }
  }, [activeTab, payments, stcgRows, searchQuery]);

  // Paginated List
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Export Jainam STCG to Excel / CSV
  const handleExportCsv = () => {
    const headers = [
      'Client Name',
      'PAN Number',
      'Bank Name',
      'IPO Scrip',
      'Lots',
      'Quantity (Shares)',
      'Buy Price (Rs)',
      'Buy Value (Rs)',
      'Sell Price (Rs)',
      'Sell Turnover (Rs)',
      'Gross STCG Profit (Rs)',
      'Customer 40% Share (Rs)',
      '10% TDS Deducted (Rs)',
      'Net Payable (Rs)',
      'Exit Mode',
      'Allotment Status'
    ];

    const rows = stcgRows.map((r) => [
      `"${r.client_name}"`,
      `"${r.pan}"`,
      `"${r.bank_name}"`,
      `"${r.scrip}"`,
      r.lots,
      r.qty,
      r.buy_price,
      r.buy_value,
      r.sell_price,
      r.sell_turnover,
      r.gross_stcg,
      r.client_40,
      r.tds_10,
      r.net_payout,
      `"${r.exit_mode}"`,
      `"${r.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jainam_stcg_pnl_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-content">

      {/* Top Header (Hero-11) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.03em' }}>
              Payments &amp; Profit Distribution
            </h1>
            <span className="badge badge-teal">
              40-60 Split &amp; 10% TDS
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--text-muted)' }}>
            Bank transfer coordinates, beneficiary payout vouchers, and Jainam-style Short-Term Capital Gains (STCG) ledger.
          </p>
        </div>

        {/* Action Buttons */}
        {activeTab === 'jainam_stcg' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCsv}
              style={{ padding: '8px 14px', fontSize: '13px', gap: '6px' }}
            >
              <FileSpreadsheet size={15} /> Export CSV (Excel)
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => downloadJainamStcgPdf(stcgRows, stcgSummary)}
              style={{ padding: '8px 16px', fontSize: '13px', gap: '6px' }}
            >
              <FileDown size={15} /> Export Jainam PDF Report
            </button>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs Bar (Hero-11) */}
      <div style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        borderRadius: '16px',
        padding: '6px 10px',
        marginBottom: '18px',
        display: 'flex',
        gap: '8px',
        width: 'fit-content'
      }}>
        <button
          type="button"
          onClick={() => { setActiveTab('vouchers'); setCurrentPage(1); }}
          className={`btn ${activeTab === 'vouchers' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '13px', gap: '6px' }}
        >
          <Wallet size={15} /> Beneficiary Payout Vouchers
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('jainam_stcg'); setCurrentPage(1); }}
          className={`btn ${activeTab === 'jainam_stcg' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '13px', gap: '6px' }}
        >
          <TrendingUp size={15} /> Jainam Tax P&amp;L Statement (STCG)
        </button>
      </div>

      {/* Jainam Summary Cards (When Jainam STCG tab is active) */}
      {activeTab === 'jainam_stcg' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '18px'
        }}>
          <div className="stat-card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Total Buy Value (Invested)</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', margin: '6px 0 0' }}>
              ₹ {stcgSummary.totalBuyValue.toLocaleString('en-IN')}
            </h3>
          </div>

          <div className="stat-card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Total Sell Turnover</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--brand-accent)', margin: '6px 0 0' }}>
              ₹ {stcgSummary.totalSellTurnover.toLocaleString('en-IN')}
            </h3>
          </div>

          <div className="stat-card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Gross Realized STCG</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--success-text)', margin: '6px 0 0' }}>
              ₹ {stcgSummary.totalGrossStcg.toLocaleString('en-IN')}
            </h3>
          </div>

          <div className="stat-card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Customer 40% Share</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--warning)', margin: '6px 0 0' }}>
              ₹ {stcgSummary.totalClientProfit.toLocaleString('en-IN')}
            </h3>
          </div>

          <div className="stat-card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>10% TDS Withheld</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--danger-text)', margin: '6px 0 0' }}>
              ₹ {stcgSummary.totalTds.toLocaleString('en-IN')}
            </h3>
          </div>
        </div>
      )}

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
            placeholder={activeTab === 'vouchers' ? "Search payment by Txn ID or name..." : "Search by customer, PAN, IPO scrip..."}
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
          Showing {filteredList.length} records
        </span>
      </div>

      {/* VIEW 1: Vouchers Table */}
      {activeTab === 'vouchers' && (
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
              ) : paginatedList.length > 0 ? (
                paginatedList.map((row) => (
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
                        onClick={() => downloadPayoutVoucherPdf(row)}
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

          <Pagination
            currentPage={currentPage}
            totalItems={filteredList.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* VIEW 2: Jainam STCG P&L Table */}
      {activeTab === 'jainam_stcg' && (
        <div className="table-container">
          <table className="fintech-table">
            <thead>
              <tr>
                <th>Customer / PAN</th>
                <th>IPO Scrip</th>
                <th>Shares</th>
                <th>Buy Price &amp; Value</th>
                <th>Sell Price &amp; Turnover</th>
                <th>Gross STCG Gain</th>
                <th>40% Client Share</th>
                <th>10% TDS</th>
                <th>Net Payable</th>
                <th>Strategy</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonTableRow columns={10} />
                  <SkeletonTableRow columns={10} />
                  <SkeletonTableRow columns={10} />
                  <SkeletonTableRow columns={10} />
                </>
              ) : paginatedList.length > 0 ? (
                paginatedList.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div>
                        <strong style={{ color: 'var(--text-main)', fontSize: '13.5px' }}>{row.client_name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PAN: <code style={{ color: 'var(--primary)' }}>{row.pan}</code></div>
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--brand-accent)' }}>{row.scrip}</strong>
                    </td>
                    <td>
                      <strong>{row.qty} sh</strong> <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>({row.lots}L)</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '12.5px' }}>
                        <div>₹{row.buy_price}/sh</div>
                        <strong style={{ color: 'var(--text-muted)', fontSize: '12px' }}>₹{row.buy_value.toLocaleString('en-IN')}</strong>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12.5px' }}>
                        <div>₹{row.sell_price}/sh</div>
                        <strong style={{ color: 'var(--text-main)', fontSize: '12px' }}>₹{row.sell_turnover.toLocaleString('en-IN')}</strong>
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: row.gross_stcg > 0 ? 'var(--success-text)' : 'var(--text-muted)', fontSize: '13.5px' }}>
                        {row.gross_stcg > 0 ? `+₹${row.gross_stcg.toLocaleString('en-IN')}` : '₹0'}
                      </strong>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--warning)', fontSize: '13.5px' }}>
                        ₹{row.client_40.toLocaleString('en-IN')}
                      </strong>
                    </td>
                    <td>
                      <span style={{ color: 'var(--danger-text)', fontWeight: 600 }}>
                        ₹{row.tds_10.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--primary)', fontSize: '14px' }}>
                        ₹{row.net_payout.toLocaleString('en-IN')}
                      </strong>
                    </td>
                    <td>
                      <span className={`badge ${row.exit_mode === 'KOSTAK' ? 'badge-purple' : row.exit_mode === 'SAUDA' ? 'badge-warning' : 'badge-teal'}`}>
                        {row.exit_mode}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    <Database size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No Capital Gains P&L records found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredList.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

    </div>
  );
}
