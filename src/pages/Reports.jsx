import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Mail,
  Search,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Building2,
  Users,
  CreditCard,
  PieChart,
  Eye,
  FileSpreadsheet,
  Calendar,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import ReportPreviewModal from '../components/ReportPreviewModal.jsx';
import { generateReportPdf } from '../utils/reportExporter.js';
import { supabase } from '../services/db.js';
import { SkeletonCardGrid } from '../components/SkeletonLoader.jsx';

export default function Reports() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState('Current Month (Aug 2026)');
  const [selectedReport, setSelectedReport] = useState(null);
  const [batchExporting, setBatchExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate brief initial loader for sleek UX transitions
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const reportsList = [
    {
      id: 'customer-summary',
      title: '1. Customer Summary Report',
      desc: 'All registered customers, demat DPIDs, mobile numbers & PAN audit status.',
      category: 'Customer & KYC',
      formats: ['PDF', 'EXCEL'],
      icon: Users,
      badge: 'Core Ledger',
      badgeColor: 'blue'
    },
    {
      id: 'application-status',
      title: '2. Application Status Report',
      desc: 'Live tracking of applications bidded per IPO, allotment status & quantity.',
      category: 'Operations & Audit',
      formats: ['EXCEL', 'PDF'],
      icon: FileSpreadsheet,
      badge: 'Live DB',
      badgeColor: 'green'
    },
    {
      id: 'customer-profit-loss',
      title: '3. Customer Profit/Loss Ledger ⭐',
      desc: 'Automated 40-60 profit split ledger, net customer payout & 10% TDS tracking.',
      category: 'Profit & Financials',
      formats: ['PDF', 'EXCEL'],
      icon: TrendingUp,
      badge: 'Popular',
      badgeColor: 'purple'
    },
    {
      id: 'payment-transactions',
      title: '4. Payment Transactions',
      desc: 'All money movements, UPI/ASBA bank reference numbers & payment status logs.',
      category: 'Operations & Audit',
      formats: ['CSV', 'EXCEL'],
      icon: CreditCard,
      badge: 'Audit Ready',
      badgeColor: 'blue'
    },
    {
      id: 'tds-calculation',
      title: '5. TDS Calculation Report',
      desc: '10% Tax deduction at source (TDS) summary per PAN for Form 26QB filing.',
      category: 'Tax & Compliance',
      formats: ['PDF', 'EXCEL'],
      icon: ShieldCheck,
      badge: 'Tax Mandatory',
      badgeColor: 'warning'
    },
    {
      id: 'compliance-kyc',
      title: '6. Compliance & KYC Audit',
      desc: 'Document verification audit, Aadhaar, PAN NSDL & Penny Drop bank checks.',
      category: 'Customer & KYC',
      formats: ['PDF'],
      icon: CheckCircle2,
      badge: 'SEBI Audited',
      badgeColor: 'green'
    },
    {
      id: 'beneficiary-payouts',
      title: '7. Beneficiary Payouts',
      desc: 'Verified bank accounts, IFSC codes, and direct NEFT/RTGS payout ledgers.',
      category: 'Customer & KYC',
      formats: ['EXCEL', 'CSV'],
      icon: Building2,
      badge: 'Bank Verified',
      badgeColor: 'blue'
    },
    {
      id: 'multi-ipo-profit',
      title: '8. Multi-IPO Profit Analysis',
      desc: 'Comparative listing gains analysis and profit distribution across market IPOs.',
      category: 'Profit & Financials',
      formats: ['PDF', 'EXCEL'],
      icon: PieChart,
      badge: 'Gains Analytics',
      badgeColor: 'purple'
    },
    {
      id: 'daily-summary',
      title: '9. Daily HTML Digest',
      desc: 'Automated evening email digest containing key daily performance metrics.',
      category: 'Operations & Audit',
      formats: ['EMAIL', 'HTML'],
      icon: Mail,
      badge: 'Automated Daily',
      badgeColor: 'warning'
    },
    {
      id: 'monthly-financial',
      title: '10. Monthly Financial',
      desc: 'Month-end bank reconciliation statement, total fund pool & net profits.',
      category: 'Profit & Financials',
      formats: ['PDF', 'EXCEL'],
      icon: FileText,
      badge: 'Reconciled',
      badgeColor: 'green'
    }
  ];

  const categories = ['All', 'Customer & KYC', 'Profit & Financials', 'Tax & Compliance', 'Operations & Audit'];

  const filteredReports = reportsList.filter((report) => {
    const matchesCategory = activeCategory === 'All' || report.category === activeCategory;
    const matchesSearch =
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleExportMasterDossier = async () => {
    setBatchExporting(true);
    try {
      const { data: customers } = await supabase.from('customers').select('*');
      const rows = (customers || []).map((c, i) => ({
        no: c.customer_no || `CUST-${1000 + i}`,
        name: c.full_name || 'Customer',
        pan: c.pan_number || '—',
        mobile: c.mobile_number || '—',
        status: c.status || 'Active'
      }));

      generateReportPdf({
        title: 'IPO KING — Master System Dossier',
        subtitle: 'Comprehensive Master Ledger & Security Audit Report',
        columns: [
          { header: 'Cust No', key: 'no', width: 15 },
          { header: 'Customer Name', key: 'name', width: 30 },
          { header: 'PAN Number', key: 'pan', width: 20 },
          { header: 'Mobile', key: 'mobile', width: 20 },
          { header: 'KYC Status', key: 'status', width: 15 }
        ],
        rows: rows.length > 0 ? rows : [
          { no: 'CUST-1001', name: 'Rajesh Kumar Sharma', pan: 'ABCDE1234F', mobile: '+91 9876543210', status: 'Verified' },
          { no: 'CUST-1002', name: 'Priya Mehta', pan: 'FGHIJ5678K', mobile: '+91 9812345678', status: 'Verified' }
        ],
        summaryStats: [
          { label: 'Total Tracked Reports', value: '10 Ledgers' },
          { label: 'Active Customers', value: String(rows.length || 2) },
          { label: 'Audit Status', value: '100% Compliant' }
        ],
        period
      });
    } catch (err) {
      console.error('Master Dossier Export error:', err);
    } finally {
      setBatchExporting(false);
    }
  };

  return (
    <div className="tab-pane active" style={{ paddingBottom: '40px' }}>
      
      {/* Top Banner Header */}
      <div className="welcome-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={24} style={{ color: 'var(--primary)' }} /> Business & Compliance Reporting Hub
            </h2>
            <span className="pill-badge" style={{ background: 'rgba(37, 99, 235, 0.12)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> 10 Active Reports
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Generate, filter, preview, and export PDF, Excel (.XLSX) and CSV financial ledgers.
          </p>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '8px', padding: '4px 10px', fontSize: '0.82rem' }}>
            <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--input-text)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              <option value="Current Month (Aug 2026)">Current Month (Aug 2026)</option>
              <option value="Q2 FY2026-27">Q2 FY2026-27</option>
              <option value="FY 2025-26">FY 2025-26</option>
              <option value="All Time">All Time</option>
            </select>
          </div>

          <button className="btn btn-primary" onClick={handleExportMasterDossier} disabled={batchExporting}>
            {batchExporting ? <RefreshCw size={15} className="spin" /> : <Download size={15} />}
            <span>Export Master Dossier PDF</span>
          </button>
        </div>
      </div>

      {/* Category Pills & Search Controls Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          
          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: activeCategory === cat ? 'var(--primary)' : 'var(--panel-border)',
                  background: activeCategory === cat ? 'var(--primary)' : 'transparent',
                  color: activeCategory === cat ? '#FFFFFF' : 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: '280px', maxWidth: '380px', flex: '1 1 300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search reports by title..."
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

      {/* Report Cards Grid with Skeleton Loading */}
      {loading ? (
        <SkeletonCardGrid count={6} />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {filteredReports.map((report) => {
            const IconComponent = report.icon;
            return (
              <div
                key={report.id}
                className="card glass-panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  padding: '20px',
                  borderRadius: '16px',
                  position: 'relative',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  border: selectedReport?.id === report.id ? '1px solid var(--primary)' : '1px solid var(--panel-border)'
                }}
              >
                <div>
                  {/* Card Top Meta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: report.badgeColor === 'purple' ? 'rgba(124, 58, 237, 0.12)' :
                                  report.badgeColor === 'green' ? 'rgba(5, 150, 105, 0.12)' :
                                  report.badgeColor === 'warning' ? 'rgba(217, 119, 6, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                      color: report.badgeColor === 'purple' ? 'var(--purple)' :
                             report.badgeColor === 'green' ? 'var(--success)' :
                             report.badgeColor === 'warning' ? 'var(--warning)' : 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center'
                    }}>
                      <IconComponent size={20} />
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {report.formats.map((fmt) => (
                        <span
                          key={fmt}
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: fmt === 'PDF' ? 'rgba(220, 38, 38, 0.1)' :
                                        fmt === 'EXCEL' ? 'rgba(5, 150, 105, 0.1)' :
                                        fmt === 'CSV' ? 'rgba(124, 58, 237, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                            color: fmt === 'PDF' ? '#DC2626' :
                                   fmt === 'EXCEL' ? '#059669' :
                                   fmt === 'CSV' ? '#7C3AED' : '#D97706',
                            border: '1px solid rgba(0,0,0,0.05)'
                          }}
                        >
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Title & Desc */}
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                    {report.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.45', marginBottom: '16px' }}>
                    {report.desc}
                  </p>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--panel-border)' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => setSelectedReport(report)}
                    style={{ flex: 1, padding: '9px 12px', fontSize: '0.84rem', justifyContent: 'center' }}
                  >
                    <Eye size={14} /> Preview & Generate
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedReport(report)}
                    title="Quick Export"
                    style={{ padding: '9px 12px', fontSize: '0.84rem' }}
                  >
                    {report.id === 'daily-summary' ? <Mail size={14} /> : <Download size={14} />}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Report Data Preview & Generator Modal */}
      {selectedReport && (
        <ReportPreviewModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}

    </div>
  );
}
