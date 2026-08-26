import React, { useState } from 'react';
import { Users, FileText, Image as ImageIcon, Eye, EyeOff, X, Edit, FileDown } from 'lucide-react';
import { downloadCustomerPdf } from '../utils/pdfGenerator';

export default function CustomerDetailsModal({ customer, onClose, onEdit }) {
  const [showPassword, setShowPassword] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);

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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-content"
        style={{
          maxWidth: '860px',
          width: '92vw',
          maxHeight: '90vh',
          borderRadius: '28px',
          padding: '0',
          overflow: 'hidden',
          background: 'var(--panel-bg)'
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
              <FileDown size={14} /> Download PDF
            </button>
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

        {/* Modal Scroll Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
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
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>5. DPID (Demat)</span>
                <strong style={{ color: 'var(--text-main)' }}>{customer.dpid || '—'}</strong>
              </div>
              <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>6. Bank Name</span>
                <strong style={{ color: 'var(--primary)' }}>{customer.bank_name || '—'}</strong>
              </div>
              <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>7. Bank Account No</span>
                <strong style={{ color: 'var(--text-main)' }}>{customer.bank_account_no || '—'}</strong>
              </div>
              <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>8. Login ID</span>
                <strong style={{ color: 'var(--text-main)' }}>{customer.login_id || '—'}</strong>
              </div>
              <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>9. Arham (Password)</span>
                <strong style={{ color: 'var(--text-main)' }}>{customer.password_encrypted || 'Arham'}</strong>
              </div>
              <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>10. Customer Code</span>
                <strong style={{ color: 'var(--brand-accent)' }}>{customer.code || '—'}</strong>
              </div>
              <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>11. Mobile Number</span>
                <strong style={{ color: 'var(--text-main)' }}>{customer.mobile_number || '—'}</strong>
              </div>
              <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>12. Balance</span>
                <strong style={{ color: 'var(--success-text)' }}>₹ {Number(customer.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>13. Alt Phone</span>
                <strong style={{ color: 'var(--text-main)' }}>{customer.phone_alternate || '—'}</strong>
              </div>
              <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>14. Email Address</span>
                <strong style={{ color: 'var(--text-main)' }}>{customer.email || '—'}</strong>
              </div>
              <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>15. Other Phone</span>
                <strong style={{ color: 'var(--text-main)' }}>{customer.phone_other || '—'}</strong>
              </div>
              <div style={{ background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>16. Return Amount</span>
                <strong style={{ color: 'var(--warning)' }}>₹ {Number(customer.return_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ gridColumn: 'span 2', background: 'var(--panel-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>17. TDS Remarks</span>
                <strong style={{ color: 'var(--text-main)' }}>{customer.tds_remarks || '—'}</strong>
              </div>
            </div>
          </div>

          {/* Section 2: Beneficiary Names */}
          <div style={{
            background: 'rgba(4, 47, 46, 0.02)',
            border: '1px solid var(--panel-border)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--brand-accent)', fontWeight: 800, margin: '0 0 10px 0' }}>
              Beneficiary Accounts ({beneficiaries.length})
            </h4>
            {beneficiaries.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {beneficiaries.map((name, i) => (
                  <span key={i} className="badge badge-teal" style={{ padding: '6px 14px', fontSize: '13px' }}>
                    {i + 1}. {name}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No beneficiary specified</span>
            )}
          </div>

          {/* Section 3: Document Photos */}
          <div style={{
            background: 'rgba(4, 47, 46, 0.02)',
            border: '1px solid var(--panel-border)',
            borderRadius: '20px',
            padding: '20px'
          }}>
            <h4 style={{ fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--brand-accent)', fontWeight: 800, margin: '0 0 14px 0' }}>
              KYC &amp; Demat Document Proofs
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {docTypes.map((dt) => {
                const url = docs[dt.key];
                const isImage = url && (typeof url === 'string') && (url.startsWith('data:image') || url.startsWith('http') || url.match(/\.(jpeg|jpg|gif|png|webp)/i));

                return (
                  <div key={dt.key} style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '8px', color: 'var(--text-main)' }}>{dt.label}</span>
                    {url ? (
                      isImage ? (
                        <div style={{ cursor: 'pointer', overflow: 'hidden', borderRadius: '10px', border: '1px solid var(--panel-border)' }} onClick={() => setActivePhoto({ label: dt.label, url })}>
                          <img src={url} alt={dt.label} style={{ width: '100%', height: '90px', objectFit: 'cover', transition: 'transform 0.2s' }} />
                          <span style={{ fontSize: '11px', color: 'var(--brand-accent)', fontWeight: 700, display: 'block', marginTop: '6px' }}>Click to view</span>
                        </div>
                      ) : (
                        <div style={{ padding: '16px 8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <FileText size={24} style={{ color: 'var(--brand-accent)', margin: '0 auto 6px auto', display: 'block' }} />
                          <span style={{ wordBreak: 'break-all' }}>{String(url)}</span>
                        </div>
                      )
                    ) : (
                      <div style={{ padding: '20px 8px', background: 'rgba(4, 47, 46, 0.02)', borderRadius: '10px', border: '1.5px dashed var(--panel-border)' }}>
                        <ImageIcon size={22} style={{ opacity: 0.3, margin: '0 auto 6px auto', display: 'block' }} />
                        <span style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block' }}>Not Uploaded</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Full Photo Lightbox Modal */}
      {activePhoto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(4, 47, 46, 0.85)', backdropFilter: 'blur(10px)', zIndex: 100000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={() => setActivePhoto(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#FAF6EC', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{activePhoto.label}</h4>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                style={{ background: 'none', border: 'none', color: '#FAF6EC', fontSize: '24px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            <img src={activePhoto.url} alt={activePhoto.label} style={{ maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
