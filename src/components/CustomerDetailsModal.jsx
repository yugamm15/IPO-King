import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  Image as ImageIcon,
  Eye,
  EyeOff,
  X,
  Edit,
  FileDown,
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Building2,
  Calendar,
  Layers
} from 'lucide-react';
import { downloadCustomerPdf, downloadCustomerPassbookPdf } from '../utils/pdfGenerator';
import { fetchCustomerPassbookLedger } from '../services/db';

export default function CustomerDetailsModal({ customer, onClose, onEdit }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'passbook'
  const [showPassword, setShowPassword] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  useEffect(() => {
    if (customer?.id && activeTab === 'passbook') {
      setLoadingLedger(true);
      fetchCustomerPassbookLedger(customer.id)
        .then((res) => setLedgerEntries(res || []))
        .catch((err) => console.error('Error fetching passbook:', err))
        .finally(() => setLoadingLedger(false));
    }
  }, [customer?.id, activeTab]);

  if (!customer) return null;

  let docs = customer.documents;
  if (!docs && customer.address && typeof customer.address === 'string' && customer.address.startsWith('{')) {
    try {
      docs = JSON.parse(customer.address);
    } catch (_) {
      docs = {};
    }
  }
  docs = docs || {};
  const beneficiaries = customer.beneficiary_name
    ? String(customer.beneficiary_name).split(',').map((b) => b.trim()).filter(Boolean)
    : [];

  const docTypes = [
    { key: 'pan_card', label: 'PAN Card Photo' },
    { key: 'aadhaar_card', label: 'Aadhaar Card Photo' },
    { key: 'cheque_proof', label: 'Cancelled Cheque' },
    { key: 'demat_proof', label: 'Demat A/c Proof' }
  ];

  // Ledger summary metrics
  const totalCredits = ledgerEntries.reduce((sum, e) => sum + (Number(e.credit) || 0), 0);
  const totalDebits = ledgerEntries.reduce((sum, e) => sum + (Number(e.debit) || 0), 0);
  const netEarnings = totalCredits - totalDebits;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-content"
        style={{
          maxWidth: '920px',
          width: '94vw',
          maxHeight: '90vh',
          borderRadius: '28px',
          padding: '0',
          overflow: 'hidden',
          background: 'var(--panel-bg)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header (Hero-11) */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid var(--panel-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--panel-bg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'rgba(4, 47, 46, 0.08)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px'
            }}>
              {(customer.full_name || customer.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  {customer.full_name || customer.name}
                </h3>
                <span className="badge badge-success">
                  {customer.kyc_status || 'Verified KYC'}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                Customer No: <strong style={{ color: 'var(--text-main)' }}>#{customer.customer_no || 'N/A'}</strong> &bull; Code: <strong style={{ color: 'var(--brand-accent)' }}>{customer.code || 'N/A'}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeTab === 'passbook' ? (
              <button
                type="button"
                onClick={() => downloadCustomerPassbookPdf(customer, ledgerEntries)}
                className="btn btn-secondary"
                style={{ padding: '7px 14px', fontSize: '12.5px', gap: '6px' }}
              >
                <FileDown size={14} /> Export Passbook PDF
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await downloadCustomerPdf(customer);
                  } catch (err) {
                    console.error('PDF error:', err);
                  }
                }}
                className="btn btn-secondary"
                style={{ padding: '7px 14px', fontSize: '12.5px', gap: '6px' }}
              >
                <FileDown size={14} /> Download KYC Dossier
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => { onClose(); onEdit(customer); }}
                className="btn btn-primary"
                style={{ padding: '7px 16px', fontSize: '12.5px', gap: '6px' }}
              >
                <Edit size={14} /> Edit Customer
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(4, 47, 46, 0.05)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar (Hero-11) */}
        <div style={{
          padding: '0 28px',
          background: 'var(--panel-bg)',
          borderBottom: '1px solid var(--panel-border)',
          display: 'flex',
          gap: '8px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '12px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'profile' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'profile' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Users size={16} /> Profile &amp; KYC Record
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('passbook')}
            style={{
              padding: '12px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'passbook' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'passbook' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <BookOpen size={16} /> Transaction Passbook &amp; Ledger
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>

          {/* TAB 1: PROFILE & KYC */}
          {activeTab === 'profile' && (
            <>
              {/* Quick Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div className="stat-card" style={{ padding: '16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Available Balance</span>
                  <strong style={{ fontSize: '20px', color: 'var(--success-text)', fontWeight: 800 }}>
                    ₹ {Number(customer.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <div className="stat-card" style={{ padding: '16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>PAN Number</span>
                  <code style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>{customer.pan_number || 'N/A'}</code>
                </div>
                <div className="stat-card" style={{ padding: '16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Mobile Number</span>
                  <strong style={{ fontSize: '16px', color: 'var(--text-main)', fontWeight: 700 }}>{customer.mobile_number || 'N/A'}</strong>
                </div>
              </div>

              {/* Section 1: All Details */}
              <div style={{
                background: 'rgba(4, 47, 46, 0.02)',
                border: '1px solid var(--panel-border)',
                borderRadius: '20px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <h4 style={{ fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--brand-accent)', fontWeight: 800, margin: '0 0 14px 0' }}>
                  Full Customer Profile Record
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '13px' }}>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>1. Customer No</span>
                    <strong style={{ color: 'var(--text-main)' }}>{customer.customer_no || '—'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>2. Full Name</span>
                    <strong style={{ color: 'var(--text-main)' }}>{customer.full_name || customer.name || '—'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>3. CA Number</span>
                    <strong style={{ color: 'var(--text-main)' }}>{customer.ca_number || '—'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>4. PAN Number</span>
                    <code style={{ color: 'var(--primary)', fontWeight: 700 }}>{customer.pan_number || '—'}</code>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>5. Aadhaar Number</span>
                    <code style={{ color: 'var(--brand-accent)', fontWeight: 700, letterSpacing: '0.04em' }}>
                      {customer.aadhaar_number ? customer.aadhaar_number.replace(/(\d{4})(?=\d)/g, '$1 ') : (customer.aadhar_number ? String(customer.aadhar_number).replace(/(\d{4})(?=\d)/g, '$1 ') : '—')}
                    </code>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>6. Birthdate (DOB)</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {customer.birthdate ? new Date(customer.birthdate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (customer.dob || '—')}
                    </strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>7. DPID (Demat)</span>
                    <strong style={{ color: 'var(--text-main)' }}>{customer.dpid || '—'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>8. Bank Name</span>
                    <strong style={{ color: 'var(--primary)' }}>{customer.bank_name || '—'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>9. Bank Account No</span>
                    <strong style={{ color: 'var(--text-main)' }}>{customer.bank_account_no || '—'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>10. Login ID</span>
                    <strong style={{ color: 'var(--text-main)' }}>{customer.login_id || '—'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>11. Arham (Password)</span>
                    <strong style={{ color: 'var(--text-main)' }}>{customer.password_encrypted || 'Arham'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>12. Customer Code</span>
                    <strong style={{ color: 'var(--brand-accent)' }}>{customer.code || '—'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>13. Mobile Number</span>
                    <strong style={{ color: 'var(--text-main)' }}>{customer.mobile_number || '—'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>14. Balance</span>
                    <strong style={{ color: 'var(--success-text)' }}>₹ {Number(customer.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>15. Alt Phone</span>
                    <strong style={{ color: 'var(--text-main)' }}>{customer.phone_alternate || '—'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>16. Email Address</span>
                    <strong style={{ color: 'var(--text-main)' }}>{customer.email || '—'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>17. Other Phone</span>
                    <strong style={{ color: 'var(--text-main)' }}>{customer.phone_other || '—'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>18. Return Amount</span>
                    <strong style={{ color: 'var(--warning)' }}>₹ {Number(customer.return_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>19. TDS Remarks</span>
                    <strong style={{ color: 'var(--text-main)' }}>{customer.tds_remarks || '—'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>20. Customer Profit Share</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span className="badge badge-teal" style={{ fontWeight: 800 }}>
                        {customer.profit_share_percentage !== undefined && customer.profit_share_percentage !== null ? `${customer.profit_share_percentage}%` : '40%'} Client
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        ({Math.max(0, 100 - (Number(customer.profit_share_percentage) || 40))}% Treasury)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Beneficiary Names */}
              {beneficiaries.length > 0 && (
                <div style={{
                  background: 'rgba(4, 47, 46, 0.02)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '20px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--brand-accent)', fontWeight: 800, margin: '0 0 14px 0' }}>
                    Linked Beneficiaries ({beneficiaries.length})
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {beneficiaries.map((b, i) => (
                      <span key={i} className="badge badge-teal" style={{ fontSize: '12.5px', padding: '6px 12px' }}>
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: KYC Documents */}
              <div style={{
                background: 'rgba(4, 47, 46, 0.02)',
                border: '1px solid var(--panel-border)',
                borderRadius: '20px',
                padding: '20px'
              }}>
                <h4 style={{ fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--brand-accent)', fontWeight: 800, margin: '0 0 14px 0' }}>
                  KYC Verified Documents &amp; Proofs
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  {docTypes.map((dt) => {
                    const docUrl = docs[dt.key];
                    return (
                      <div
                        key={dt.key}
                        style={{
                          background: 'var(--panel-bg)',
                          border: '1px solid var(--panel-border)',
                          borderRadius: '14px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          gap: '10px'
                        }}
                      >
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: docUrl ? 'rgba(16, 185, 129, 0.1)' : 'rgba(4, 47, 46, 0.05)',
                          color: docUrl ? 'var(--success)' : 'var(--text-dim)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {docUrl ? <ImageIcon size={20} /> : <FileText size={20} />}
                        </div>

                        <div>
                          <strong style={{ fontSize: '12.5px', color: 'var(--text-main)', display: 'block' }}>{dt.label}</strong>
                          <span style={{ fontSize: '11px', color: docUrl ? 'var(--success-text)' : 'var(--text-dim)' }}>
                            {docUrl ? 'Document Attached' : 'Not Uploaded'}
                          </span>
                        </div>

                        {docUrl && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setActivePhoto({ label: dt.label, url: docUrl })}
                            style={{ padding: '4px 10px', fontSize: '11.5px', gap: '4px', marginTop: '4px' }}
                          >
                            <Eye size={12} /> View Photo
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: TRANSACTION PASSBOOK & RUNNING LEDGER */}
          {activeTab === 'passbook' && (
            <div>
              {/* Passbook Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div className="stat-card" style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>
                    Total Credits ({customer.profit_share_percentage !== undefined && customer.profit_share_percentage !== null ? customer.profit_share_percentage : 40}% Share)
                  </span>
                  <strong style={{ fontSize: '19px', color: 'var(--success-text)', fontWeight: 800 }}>
                    ₹ {totalCredits.toLocaleString('en-IN')}
                  </strong>
                </div>

                <div className="stat-card" style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Total 10% TDS Deducted</span>
                  <strong style={{ fontSize: '19px', color: 'var(--danger-text)', fontWeight: 800 }}>
                    ₹ {totalDebits.toLocaleString('en-IN')}
                  </strong>
                </div>

                <div className="stat-card" style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Net Account Payout</span>
                  <strong style={{ fontSize: '19px', color: 'var(--warning)', fontWeight: 800 }}>
                    ₹ {netEarnings.toLocaleString('en-IN')}
                  </strong>
                </div>

                <div className="stat-card" style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Current Balance</span>
                  <strong style={{ fontSize: '19px', color: 'var(--primary)', fontWeight: 800 }}>
                    ₹ {Number(customer.balance || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              {/* Passbook Table */}
              <div className="table-container">
                <table className="fintech-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>IPO Scrip / Action</th>
                      <th>Type / Description</th>
                      <th>Credit (+)</th>
                      <th>Debit (-)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingLedger ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          Loading customer transaction statement...
                        </td>
                      </tr>
                    ) : ledgerEntries.length > 0 ? (
                      ledgerEntries.map((row) => {
                        const dStr = row.date ? new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                        return (
                          <tr key={row.id}>
                            <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{dStr}</td>
                            <td>
                              <div>
                                <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{row.scrip}</strong>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.remarks}</div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{row.type}</span>
                            </td>
                            <td>
                              {row.credit > 0 ? (
                                <strong style={{ color: 'var(--success-text)', fontSize: '13px' }}>
                                  +₹{row.credit.toLocaleString('en-IN')}
                                </strong>
                              ) : (
                                <span style={{ color: 'var(--text-dim)' }}>—</span>
                              )}
                            </td>
                            <td>
                              {row.debit > 0 ? (
                                <strong style={{ color: 'var(--danger-text)', fontSize: '13px' }}>
                                  -₹{row.debit.toLocaleString('en-IN')}
                                </strong>
                              ) : (
                                <span style={{ color: 'var(--text-dim)' }}>—</span>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${row.status === 'Credited' ? 'badge-success' : row.status === 'Refunded' ? 'badge-purple' : 'badge-teal'}`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          <BookOpen size={28} style={{ opacity: 0.4, marginBottom: '8px' }} />
                          <p style={{ margin: 0, fontWeight: 600 }}>No transaction history found for this customer.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls Bar */}
        <div style={{
          padding: '16px 28px',
          background: 'var(--panel-bg)',
          borderTop: '1px solid var(--panel-border)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '9px 24px', fontSize: '13.5px' }}
          >
            Close
          </button>
        </div>

        {/* Document Photo Viewer Lightbox */}
        {activePhoto && (
          <div
            className="modal-backdrop"
            onClick={() => setActivePhoto(null)}
            style={{ zIndex: 1100, background: 'rgba(4, 47, 46, 0.85)' }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                background: 'var(--panel-bg)',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                  {activePhoto.label} &bull; {customer.full_name || customer.name}
                </h4>
                <button
                  type="button"
                  onClick={() => setActivePhoto(null)}
                  style={{
                    background: 'rgba(4, 47, 46, 0.05)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <img
                  src={activePhoto.url}
                  alt={activePhoto.label}
                  style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: '12px' }}
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
