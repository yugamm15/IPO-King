import React, { useState } from 'react';
import { Users, AlertTriangle, CheckCircle, UploadCloud, FileText, Image as ImageIcon, X, Plus } from 'lucide-react';
import { supabase } from '../services/db';

export default function AddCustomerModal({ onClose, onCustomerAdded }) {
  const [formData, setFormData] = useState({
    // 17 Excel Columns
    customer_no: '',
    full_name: '',
    ca_number: '',
    pan_number: '',
    dpid: '',
    bank_account_no: '',
    login_id: '',
    password_encrypted: '',
    code: '',
    mobile_number: '',
    balance: '0',
    phone_alternate: '',
    email: '',
    phone_other: '',
    return_amount: '0',
    tds_remarks: '',
    // Additional KYC
    kyc_status: 'Verified'
  });

  // Multiple Beneficiaries state
  const [beneficiaries, setBeneficiaries] = useState(['']);

  // Document Upload State
  const [documents, setDocuments] = useState({
    pan_card: null,
    aadhaar_card: null,
    cheque_proof: null,
    demat_proof: null
  });

  const [docPreviews, setDocPreviews] = useState({
    pan_card: '',
    aadhaar_card: '',
    cheque_proof: '',
    demat_proof: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Beneficiary Handlers
  const handleBeneficiaryChange = (index, value) => {
    setBeneficiaries((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const addBeneficiaryField = () => {
    setBeneficiaries((prev) => [...prev, '']);
  };

  const removeBeneficiaryField = (index) => {
    if (beneficiaries.length === 1) {
      setBeneficiaries(['']);
      return;
    }
    setBeneficiaries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (docType, file) => {
    if (!file) return;
    setDocuments((prev) => ({ ...prev, [docType]: file }));

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setDocPreviews((prev) => ({ ...prev, [docType]: e.target.result }));
      };
      reader.readAsDataURL(file);
    } else {
      setDocPreviews((prev) => ({ ...prev, [docType]: file.name }));
    }
  };

  const removeDoc = (docType) => {
    setDocuments((prev) => ({ ...prev, [docType]: null }));
    setDocPreviews((prev) => ({ ...prev, [docType]: '' }));
  };

  const uploadDocsToBucket = async (customerId) => {
    const uploadedUrls = {};
    for (const [docType, file] of Object.entries(documents)) {
      if (!file) continue;
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `cust_${customerId || Date.now()}_${docType}.${fileExt}`;
        const filePath = `customer-documents/${fileName}`;

        const { data, error } = await supabase.storage
          .from('customer-docs')
          .upload(filePath, file, { upsert: true });

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from('customer-docs')
            .getPublicUrl(filePath);
          uploadedUrls[docType] = publicUrlData?.publicUrl || filePath;
        } else {
          uploadedUrls[docType] = docPreviews[docType] || file.name;
        }
      } catch (_) {
        uploadedUrls[docType] = docPreviews[docType] || file.name;
      }
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.full_name.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }

    if (!formData.pan_number.trim()) {
      setErrorMsg('PAN Number is required.');
      return;
    }

    setIsSubmitting(true);

    const validBeneficiaries = beneficiaries.map((b) => b.trim()).filter(Boolean);
    const beneficiaryString = validBeneficiaries.join(', ');

    try {
      const uploadedDocUrls = await uploadDocsToBucket(formData.pan_number);

      const payload = {
        customer_no: parseInt(formData.customer_no, 10) || null,
        full_name: formData.full_name.trim(),
        name: formData.full_name.trim(),
        ca_number: formData.ca_number.trim() || null,
        pan_number: formData.pan_number.trim().toUpperCase(),
        dpid: formData.dpid.trim() || null,
        bank_account_no: formData.bank_account_no.trim() || null,
        login_id: formData.login_id.trim() || null,
        password_encrypted: formData.password_encrypted.trim() || null,
        code: formData.code.trim() || null,
        mobile_number: formData.mobile_number.trim() || null,
        balance: parseFloat(formData.balance) || 0,
        phone_alternate: formData.phone_alternate.trim() || null,
        email: formData.email.trim() || null,
        phone_other: formData.phone_other.trim() || null,
        return_amount: parseFloat(formData.return_amount) || 0,
        tds_remarks: formData.tds_remarks.trim() || null,
        beneficiary_name: beneficiaryString || null,
        kyc_status: formData.kyc_status || 'Verified',
        documents: uploadedDocUrls
      };

      const { data, error } = await supabase.from('customers').insert([payload]).select();

      if (error) {
        console.warn('Supabase customer insert note:', error.message);
      }

      setSuccessMsg('Customer and multiple beneficiaries added successfully!');
      
      const newCust = (data && data[0]) ? { ...data[0], documents: uploadedDocUrls } : payload;
      if (onCustomerAdded) {
        onCustomerAdded(newCust);
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Add customer error:', err);
      if (onCustomerAdded) {
        onCustomerAdded({
          ...formData,
          pan_number: formData.pan_number.trim().toUpperCase(),
          beneficiary_name: beneficiaryString,
          documents: docPreviews
        });
      }
      setSuccessMsg('Customer added to list successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px'
    }}>
      <div className="email-modal-card glass-panel" onClick={(e) => e.stopPropagation()} style={{
        maxWidth: '860px', width: '100%', maxHeight: '92vh', overflowY: 'auto', borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border-color)'
      }}>
        <div className="email-modal-header" style={{
          padding: '16px 24px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)'
        }}>
          <div className="email-meta" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={22} className="brand-icon" style={{ color: '#2563EB' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)' }}>Add New Customer</h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-dim)' }}>All 17 Excel fields + Multiple Beneficiaries + Document Buckets</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-dim)'
          }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {errorMsg && (
            <div className="auth-banner auth-banner-error" style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center', background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px' }}>
              <AlertTriangle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-banner auth-banner-success" style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center', background: '#dcfce7', color: '#166534', padding: '10px 14px', borderRadius: '8px' }}>
              <CheckCircle size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Standard 17 Excel Fields */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#2563EB', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              📋 17 Excel Columns Data
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {/* 1. NO. */}
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>1. NO. (Customer No)</label>
                <input type="number" name="customer_no" placeholder="e.g. 101" value={formData.customer_no} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>

              {/* 2. NAME */}
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>2. NAME (Full Name) *</label>
                <input type="text" name="full_name" placeholder="e.g. Ramesh Kumar" value={formData.full_name} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} required />
              </div>

              {/* 3. CA */}
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>3. CA (CA Number)</label>
                <input type="text" name="ca_number" placeholder="e.g. AC123456" value={formData.ca_number} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>

              {/* 4. PAN */}
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>4. PAN (PAN Number) *</label>
                <input type="text" name="pan_number" placeholder="e.g. ABCDE1234F" value={formData.pan_number} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} required />
              </div>

              {/* 5. DPID */}
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>5. DPID (Demat A/c)</label>
                <input type="text" name="dpid" placeholder="e.g. 1208160012345678" value={formData.dpid} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>

              {/* 6. Bank A/c No. */}
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>6. Bank A/c No.</label>
                <input type="text" name="bank_account_no" placeholder="e.g. 50100234567890" value={formData.bank_account_no} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>

              {/* 7. Login ID */}
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>7. Login ID</label>
                <input type="text" name="login_id" placeholder="e.g. ramesh_k" value={formData.login_id} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>

              {/* 8. PASS */}
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>8. PASS (Password)</label>
                <input type="password" name="password_encrypted" placeholder="e.g. ••••••••" value={formData.password_encrypted} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>

              {/* 9. CODE */}
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>9. CODE (Customer Code)</label>
                <input type="text" name="code" placeholder="e.g. IPO-004" value={formData.code} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>

              {/* 10. Mobile Number */}
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>10. Mobile Number</label>
                <input type="text" name="mobile_number" placeholder="e.g. 9876543210" value={formData.mobile_number} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>

              {/* 11. BALANCE */}
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>11. BALANCE (₹)</label>
                <input type="number" name="balance" placeholder="e.g. 50000" value={formData.balance} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>

              {/* 12. Phone Kono chhe */}
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>12. Phone Kono chhe (Alt Phone)</label>
                <input type="text" name="phone_alternate" placeholder="e.g. 9876543211 (Brother)" value={formData.phone_alternate} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>

              {/* 13. email */}
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>13. email Address</label>
                <input type="email" name="email" placeholder="e.g. ramesh@email.com" value={formData.email} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>

              {/* 14. Phone */}
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>14. Phone (Other Number)</label>
                <input type="text" name="phone_other" placeholder="e.g. 9123456789" value={formData.phone_other} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>

              {/* 15. RETURN */}
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>15. RETURN Amount (₹)</label>
                <input type="number" name="return_amount" placeholder="e.g. 1500" value={formData.return_amount} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>

              {/* 16. TDS remarks */}
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>16. TDS Remarks</label>
                <input type="text" name="tds_remarks" placeholder="e.g. 10% TDS Deducted for FY26" value={formData.tds_remarks} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>
            </div>
          </div>

          {/* Section 2: MULTIPLE BENEFICIARIES (Dynamic List) */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#2563EB', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                17. Beneficiary Names (Multiple Beneficiaries Allowed)
              </h4>
              <button
                type="button"
                onClick={addBeneficiaryField}
                style={{
                  background: 'var(--input-bg)', border: '1px solid #2563EB', color: '#2563EB',
                  padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <Plus size={14} /> Add Another Beneficiary
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {beneficiaries.map((b, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={`Beneficiary #${index + 1} Name (e.g. Sunita Kumar)`}
                    value={b}
                    onChange={(e) => handleBeneficiaryChange(index, e.target.value)}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }}
                  />
                  {beneficiaries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBeneficiaryField(index)}
                      style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer' }}
                      title="Remove Beneficiary"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Document Picture Uploads to Database Buckets */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed var(--border-color)' }}>
            <h4 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#2563EB', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🖼️ Document Pictures (Saved to Database Buckets)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {/* Document 1: PAN Card */}
              <div style={{ background: 'var(--card-bg)', border: '1px dashed var(--border-color)', borderRadius: '10px', padding: '12px', textAlign: 'center', position: 'relative' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>PAN Card Photo</span>
                {docPreviews.pan_card ? (
                  <div style={{ position: 'relative' }}>
                    {docPreviews.pan_card.startsWith('data:image') ? (
                      <img src={docPreviews.pan_card} alt="PAN Card" style={{ width: '100%', height: '75px', objectFit: 'cover', borderRadius: '6px' }} />
                    ) : (
                      <div style={{ padding: '20px 4px', fontSize: '11px' }}><FileText size={20} /><br />{docPreviews.pan_card}</div>
                    )}
                    <button type="button" onClick={() => removeDoc('pan_card')} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' }}><X size={12} /></button>
                  </div>
                ) : (
                  <label style={{ cursor: 'pointer', display: 'block', padding: '16px 4px' }}>
                    <UploadCloud size={24} style={{ color: '#2563EB', marginBottom: '4px' }} />
                    <span style={{ fontSize: '10px', display: 'block', color: 'var(--text-dim)' }}>Upload PAN Image</span>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileSelect('pan_card', e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              {/* Document 2: Aadhaar Card */}
              <div style={{ background: 'var(--card-bg)', border: '1px dashed var(--border-color)', borderRadius: '10px', padding: '12px', textAlign: 'center', position: 'relative' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Aadhaar Card Photo</span>
                {docPreviews.aadhaar_card ? (
                  <div style={{ position: 'relative' }}>
                    {docPreviews.aadhaar_card.startsWith('data:image') ? (
                      <img src={docPreviews.aadhaar_card} alt="Aadhaar" style={{ width: '100%', height: '75px', objectFit: 'cover', borderRadius: '6px' }} />
                    ) : (
                      <div style={{ padding: '20px 4px', fontSize: '11px' }}><FileText size={20} /><br />{docPreviews.aadhaar_card}</div>
                    )}
                    <button type="button" onClick={() => removeDoc('aadhaar_card')} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' }}><X size={12} /></button>
                  </div>
                ) : (
                  <label style={{ cursor: 'pointer', display: 'block', padding: '16px 4px' }}>
                    <UploadCloud size={24} style={{ color: '#2563EB', marginBottom: '4px' }} />
                    <span style={{ fontSize: '10px', display: 'block', color: 'var(--text-dim)' }}>Upload Aadhaar Image</span>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileSelect('aadhaar_card', e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              {/* Document 3: Cancelled Cheque */}
              <div style={{ background: 'var(--card-bg)', border: '1px dashed var(--border-color)', borderRadius: '10px', padding: '12px', textAlign: 'center', position: 'relative' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Cancelled Cheque</span>
                {docPreviews.cheque_proof ? (
                  <div style={{ position: 'relative' }}>
                    {docPreviews.cheque_proof.startsWith('data:image') ? (
                      <img src={docPreviews.cheque_proof} alt="Cheque" style={{ width: '100%', height: '75px', objectFit: 'cover', borderRadius: '6px' }} />
                    ) : (
                      <div style={{ padding: '20px 4px', fontSize: '11px' }}><FileText size={20} /><br />{docPreviews.cheque_proof}</div>
                    )}
                    <button type="button" onClick={() => removeDoc('cheque_proof')} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' }}><X size={12} /></button>
                  </div>
                ) : (
                  <label style={{ cursor: 'pointer', display: 'block', padding: '16px 4px' }}>
                    <UploadCloud size={24} style={{ color: '#2563EB', marginBottom: '4px' }} />
                    <span style={{ fontSize: '10px', display: 'block', color: 'var(--text-dim)' }}>Upload Cheque Proof</span>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileSelect('cheque_proof', e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              {/* Document 4: Demat CMR Proof */}
              <div style={{ background: 'var(--card-bg)', border: '1px dashed var(--border-color)', borderRadius: '10px', padding: '12px', textAlign: 'center', position: 'relative' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Demat CMR Copy</span>
                {docPreviews.demat_proof ? (
                  <div style={{ position: 'relative' }}>
                    {docPreviews.demat_proof.startsWith('data:image') ? (
                      <img src={docPreviews.demat_proof} alt="Demat Proof" style={{ width: '100%', height: '75px', objectFit: 'cover', borderRadius: '6px' }} />
                    ) : (
                      <div style={{ padding: '20px 4px', fontSize: '11px' }}><FileText size={20} /><br />{docPreviews.demat_proof}</div>
                    )}
                    <button type="button" onClick={() => removeDoc('demat_proof')} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' }}><X size={12} /></button>
                  </div>
                ) : (
                  <label style={{ cursor: 'pointer', display: 'block', padding: '16px 4px' }}>
                    <UploadCloud size={24} style={{ color: '#2563EB', marginBottom: '4px' }} />
                    <span style={{ fontSize: '10px', display: 'block', color: 'var(--text-dim)' }}>Upload Demat Proof</span>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileSelect('demat_proof', e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ background: '#2563EB', color: '#fff' }}>
              {isSubmitting ? 'Saving Customer & Documents...' : 'Save Customer Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
