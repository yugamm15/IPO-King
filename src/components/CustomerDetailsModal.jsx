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
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px'
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: '820px', width: '100%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #E2E8F0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF',
          borderTopLeftRadius: '16px', borderTopRightRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '12px', background: '#EFF6FF',
              color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '18px'
            }}>
              {(customer.full_name || customer.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>
                  {customer.full_name || customer.name}
                </h3>
                <span style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', borderRadius: '20px', fontSize: '11px', fontWeight: 600, padding: '2px 10px' }}>
                  {customer.kyc_status || 'Verified KYC'}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
                Customer No: <strong style={{ color: '#0F172A' }}>#{customer.customer_no || 'N/A'}</strong> &bull; Code: <strong style={{ color: '#0F172A' }}>{customer.code || 'N/A'}</strong>
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={async () => {
              try {
                await downloadCustomerPdf(customer);
              } catch (err) {
                console.error('PDF error:', err);
              }
            }} style={{
              background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669',
              borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
            }}>
              <FileDown size={14} /> Download PDF
            </button>
            {onEdit && (
              <button onClick={() => { onClose(); onEdit(customer); }} style={{
                background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}>
                <Edit size={14} /> Edit Customer
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748B', lineHeight: 1 }}>&times;</button>
          </div>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '24px', background: '#FFFFFF' }}>
          {/* Quick Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '2px' }}>Available Balance</span>
              <strong style={{ fontSize: '16px', color: '#10B981', fontWeight: 700 }}>₹ {Number(customer.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '2px' }}>PAN Number</span>
              <code style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{customer.pan_number || 'N/A'}</code>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '2px' }}>Mobile Number</span>
              <strong style={{ fontSize: '14px', color: '#0F172A', fontWeight: 600 }}>{customer.mobile_number || 'N/A'}</strong>
            </div>
          </div>

          {/* Section 1: All Details */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#2563EB', fontWeight: 700, marginBottom: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
              📋 FULL CUSTOMER RECORD (17 FIELDS)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '13px' }}>
              <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}><span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>1. Customer No</span><strong style={{ color: '#0F172A' }}>{customer.customer_no || '—'}</strong></div>
              <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}><span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>2. Full Name</span><strong style={{ color: '#0F172A' }}>{customer.full_name || customer.name || '—'}</strong></div>
              <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}><span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>3. CA Number</span><strong style={{ color: '#0F172A' }}>{customer.ca_number || '—'}</strong></div>
              <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}><span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>4. PAN Number</span><code style={{ color: '#0F172A', fontWeight: 600 }}>{customer.pan_number || '—'}</code></div>
              <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}><span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>5. DPID (Demat)</span><strong style={{ color: '#0F172A' }}>{customer.dpid || '—'}</strong></div>
              <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}><span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>6. Bank Account No</span><strong style={{ color: '#0F172A' }}>{customer.bank_account_no || '—'}</strong></div>
              <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}><span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>7. Login ID</span><strong style={{ color: '#0F172A' }}>{customer.login_id || '—'}</strong></div>
              <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>8. Arham</span>
                <strong style={{ color: '#0F172A' }}>{customer.password_encrypted || 'Arham'}</strong>
              </div>
              <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}><span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>9. Customer Code</span><strong style={{ color: '#2563EB' }}>{customer.code || '—'}</strong></div>
              <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}><span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>10. Mobile Number</span><strong style={{ color: '#0F172A' }}>{customer.mobile_number || '—'}</strong></div>
              <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}><span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>11. Balance</span><strong style={{ color: '#10B981' }}>₹ {Number(customer.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
              <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}><span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>12. Phone Kono chhe (Alt)</span><strong style={{ color: '#0F172A' }}>{customer.phone_alternate || '—'}</strong></div>
              <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}><span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>13. Email Address</span><strong style={{ color: '#0F172A' }}>{customer.email || '—'}</strong></div>
              <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}><span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>14. Other Phone</span><strong style={{ color: '#0F172A' }}>{customer.phone_other || '—'}</strong></div>
              <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}><span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>15. Return Amount</span><strong style={{ color: '#0F172A' }}>₹ {Number(customer.return_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
              <div style={{ gridColumn: 'span 2', background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}><span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>16. TDS Remarks</span><strong style={{ color: '#0F172A' }}>{customer.tds_remarks || '—'}</strong></div>
            </div>
          </div>

          {/* Section 2: Beneficiary Names */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#2563EB', fontWeight: 700, marginBottom: '10px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
              👥 17. BENEFICIARY NAMES ({beneficiaries.length})
            </h4>
            {beneficiaries.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {beneficiaries.map((name, i) => (
                  <span key={i} style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                    {i + 1}. {name}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: '#64748B' }}>No beneficiary specified</span>
            )}
          </div>

          {/* Section 3: Document Photos */}
          <div>
            <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#2563EB', fontWeight: 700, marginBottom: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
              🖼️ DOCUMENT PICTURES & PROOFS
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {docTypes.map((dt) => {
                const url = docs[dt.key];
                const isImage = url && (typeof url === 'string') && (url.startsWith('data:image') || url.startsWith('http') || url.match(/\.(jpeg|jpg|gif|png|webp)/i));

                return (
                  <div key={dt.key} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '8px', color: '#0F172A' }}>{dt.label}</span>
                    {url ? (
                      isImage ? (
                        <div style={{ cursor: 'pointer', overflow: 'hidden', borderRadius: '6px', border: '1px solid #CBD5E1' }} onClick={() => setActivePhoto({ label: dt.label, url })}>
                          <img src={url} alt={dt.label} style={{ width: '100%', height: '90px', objectFit: 'cover', transition: 'transform 0.2s' }} />
                          <span style={{ fontSize: '10px', color: '#2563EB', fontWeight: 600, display: 'block', marginTop: '4px' }}>Click to view photo</span>
                        </div>
                      ) : (
                        <div style={{ padding: '16px 8px', fontSize: '11px', color: '#64748B' }}>
                          <FileText size={24} style={{ color: '#2563EB', marginBottom: '4px' }} />
                          <br />
                          <span style={{ wordBreak: 'break-all' }}>{String(url)}</span>
                        </div>
                      )
                    ) : (
                      <div style={{ padding: '20px 8px', background: '#FFFFFF', borderRadius: '6px', border: '1px dashed #CBD5E1' }}>
                        <ImageIcon size={22} style={{ opacity: 0.3, marginBottom: '4px' }} />
                        <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block' }}>Not Uploaded</span>
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
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', zIndex: 100000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={() => setActivePhoto(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#FFFFFF', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{activePhoto.label}</h4>
              <button onClick={() => setActivePhoto(null)} style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            <img src={activePhoto.url} alt={activePhoto.label} style={{ maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
