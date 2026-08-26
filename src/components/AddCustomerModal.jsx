import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  UploadCloud,
  FileText,
  X,
  Plus,
  Landmark,
  ShieldCheck,
  Building2,
  Lock,
  CreditCard
} from 'lucide-react';
import { supabase, fetchBanks } from '../services/db';

export default function AddCustomerModal({ onClose, onCustomerAdded, nextCustomerNo, initialData }) {
  const isEditMode = Boolean(initialData);
  const modalScrollRef = useRef(null);

  const [availableBanks, setAvailableBanks] = useState([]);

  const [formData, setFormData] = useState({
    customer_no: '',
    full_name: '',
    ca_number: '',
    pan_number: '',
    dpid: '',
    bank_name: '',
    bank_account_no: '',
    login_id: '',
    password_encrypted: 'Arham',
    code: '',
    mobile_number: '',
    balance: '0',
    phone_alternate: '',
    email: '',
    phone_other: '',
    return_amount: '0',
    tds_remarks: '',
    kyc_status: 'Verified'
  });

  const [beneficiaries, setBeneficiaries] = useState(['']);

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

  useEffect(() => {
    async function loadBankOptions() {
      try {
        const list = await fetchBanks();
        setAvailableBanks(list || []);
      } catch (_) {}
    }
    loadBankOptions();
  }, []);

  const triggerError = (msg) => {
    setErrorMsg(msg);
    setIsSubmitting(false);
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        customer_no: initialData.customer_no || '',
        full_name: initialData.full_name || initialData.name || '',
        ca_number: initialData.ca_number || '',
        pan_number: initialData.pan_number || '',
        dpid: initialData.dpid || '',
        bank_name: initialData.bank_name || '',
        bank_account_no: initialData.bank_account_no || '',
        login_id: initialData.login_id || '',
        password_encrypted: initialData.password_encrypted || 'Arham',
        code: initialData.code || '',
        mobile_number: initialData.mobile_number || '',
        balance: initialData.balance !== undefined ? String(initialData.balance) : '0',
        phone_alternate: initialData.phone_alternate || '',
        email: initialData.email || '',
        phone_other: initialData.phone_other || '',
        return_amount: initialData.return_amount !== undefined ? String(initialData.return_amount) : '0',
        tds_remarks: initialData.tds_remarks || '',
        kyc_status: initialData.kyc_status || 'Verified'
      });

      if (initialData.beneficiary_name) {
        const bList = String(initialData.beneficiary_name).split(',').map(b => b.trim()).filter(Boolean);
        setBeneficiaries(bList.length > 0 ? bList : ['']);
      }

      if (initialData.documents && typeof initialData.documents === 'object') {
        setDocPreviews(initialData.documents);
      }
    } else {
      const targetNo = nextCustomerNo || 1;
      setFormData(prev => ({
        ...prev,
        customer_no: targetNo,
        code: prev.code || `IPO-${String(targetNo).padStart(3, '0')}`,
        password_encrypted: prev.password_encrypted || 'Arham'
      }));
    }
  }, [initialData, nextCustomerNo]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'pan_number') {
      const raw = value.toUpperCase().slice(0, 10);
      let cleanPan = '';
      for (let i = 0; i < raw.length; i++) {
        const char = raw[i];
        if (i < 5) {
          if (/[A-Z]/.test(char)) cleanPan += char;
        } else if (i >= 5 && i < 9) {
          if (/[0-9]/.test(char)) cleanPan += char;
        } else if (i === 9) {
          if (/[A-Z]/.test(char)) cleanPan += char;
        }
      }
      setFormData((prev) => ({ ...prev, pan_number: cleanPan }));
      return;
    }

    if (name === 'dpid') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 16);
      setFormData((prev) => ({ ...prev, dpid: digitsOnly }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
      return triggerError('Full Name is required.');
    }

    if (!formData.pan_number.trim()) {
      return triggerError('PAN Number is required.');
    }

    setIsSubmitting(true);

    const validBeneficiaries = beneficiaries.map((b) => b.trim()).filter(Boolean);
    const beneficiaryString = validBeneficiaries.join(', ');

    try {
      const uploadedDocUrls = await uploadDocsToBucket(formData.pan_number);
      const docJsonString = Object.keys(uploadedDocUrls).length > 0 ? JSON.stringify(uploadedDocUrls) : null;

      const payload = {
        customer_no: parseInt(formData.customer_no, 10) || null,
        full_name: formData.full_name.trim(),
        name: formData.full_name.trim(),
        ca_number: formData.ca_number.trim() || null,
        pan_number: formData.pan_number.trim().toUpperCase(),
        dpid: formData.dpid.trim() || null,
        bank_name: formData.bank_name.trim() || null,
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
        address: docJsonString
      };

      let data = null, error = null;
      if (isEditMode) {
        let res;
        if (initialData.id) {
          res = await supabase.from('customers').update(payload).eq('id', initialData.id).select();
        }
        if ((!res || !res.data || res.data.length === 0) && (initialData.pan_number || payload.pan_number)) {
          const panToMatch = initialData.pan_number || payload.pan_number;
          res = await supabase.from('customers').update(payload).eq('pan_number', panToMatch).select();
        }
        if ((!res || !res.data || res.data.length === 0) && (initialData.customer_no || payload.customer_no)) {
          const cNo = initialData.customer_no || payload.customer_no;
          res = await supabase.from('customers').update(payload).eq('customer_no', cNo).select();
        }
        if (!res || !res.data || res.data.length === 0) {
          const upsertItem = { ...payload };
          if (initialData.id) upsertItem.id = initialData.id;
          res = await supabase.from('customers').upsert([upsertItem]).select();
        }
        data = res?.data;
        error = res?.error;
      } else {
        const res = await supabase.from('customers').insert([payload]).select();
        data = res?.data;
        error = res?.error;
      }

      if (error) {
        console.error('Supabase customer save error:', error);
        return triggerError(`Database error: ${error.message || 'Could not save record.'}`);
      }

      const savedCust = (data && data[0]) ? data[0] : null;
      const targetCustId = savedCust ? savedCust.id : initialData?.id;

      if (targetCustId) {
        if (validBeneficiaries.length > 0) {
          try {
            if (isEditMode) {
              await supabase.from('customer_beneficiaries').delete().eq('customer_id', targetCustId);
            }
            const bPayloads = validBeneficiaries.map((bName) => ({
              customer_id: targetCustId,
              beneficiary_name: bName
            }));
            await supabase.from('customer_beneficiaries').insert(bPayloads);
          } catch (bErr) {
            console.warn('Note on customer_beneficiaries relational insert:', bErr);
          }
        }

        if (Object.keys(uploadedDocUrls).length > 0) {
          try {
            if (isEditMode) {
              await supabase.from('customer_documents').delete().eq('customer_id', targetCustId);
            }
            const dPayloads = Object.entries(uploadedDocUrls).map(([dType, dUrl]) => ({
              customer_id: targetCustId,
              document_type: dType,
              file_name: `${dType}_proof`,
              file_path: String(dUrl)
            }));
            await supabase.from('customer_documents').insert(dPayloads);
          } catch (dErr) {
            console.warn('Note on customer_documents relational insert:', dErr);
          }
        }
      }

      setSuccessMsg(isEditMode ? 'Customer profile updated successfully!' : 'Customer added successfully!');
      
      const newCust = savedCust ? { ...savedCust, documents: uploadedDocUrls } : { ...payload, id: targetCustId, documents: uploadedDocUrls };
      if (onCustomerAdded) {
        onCustomerAdded(newCust, isEditMode);
      }

      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      console.error('Save customer exception:', err);
      return triggerError(`Save failed: ${err.message || 'Server error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalScrollRef}
        onClick={(e) => e.stopPropagation()}
        className="modal-content"
        style={{
          maxWidth: '920px',
          width: '92vw',
          maxHeight: '90vh',
          borderRadius: '28px',
          padding: '0',
          overflow: 'hidden',
          background: 'var(--panel-bg)'
        }}
      >
        {/* Modal Header (Hero-11) */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid var(--panel-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--panel-bg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(4, 47, 46, 0.08)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                {isEditMode ? 'Edit Customer Details' : 'Add New Customer'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Register Demat parameters, bank coordinates, and KYC document proofs.
              </p>
            </div>
          </div>
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
              color: 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>

          {errorMsg && (
            <div style={{
              marginBottom: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              background: 'var(--danger-light)',
              color: 'var(--danger-text)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600
            }}>
              <AlertTriangle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              marginBottom: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              background: 'var(--success-light)',
              color: 'var(--success-text)',
              border: '1px solid rgba(5, 150, 105, 0.2)',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600
            }}>
              <CheckCircle size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Customer Identification & Demat */}
          <div style={{
            background: 'rgba(4, 47, 46, 0.02)',
            border: '1px solid var(--panel-border)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label className="input-label">1. NO. (Customer No) 🔒</label>
                <input
                  type="number"
                  name="customer_no"
                  placeholder="Auto"
                  value={formData.customer_no}
                  readOnly
                  disabled
                  className="input-field"
                  style={{ background: 'rgba(4, 47, 46, 0.05)', color: 'var(--text-muted)', cursor: 'not-allowed', fontWeight: 700 }}
                />
              </div>

              <div>
                <label className="input-label">2. NAME (Full Name) *</label>
                <input
                  type="text"
                  name="full_name"
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="input-label">3. CA (CA Number)</label>
                <input
                  type="text"
                  name="ca_number"
                  placeholder="e.g. AC123456"
                  value={formData.ca_number}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">4. PAN (PAN NUMBER) *</label>
                <input
                  type="text"
                  name="pan_number"
                  maxLength={10}
                  placeholder="e.g. ABCDE1234F"
                  value={formData.pan_number}
                  onChange={handleChange}
                  className="input-field"
                  style={{ textTransform: 'uppercase', fontWeight: 700 }}
                  required
                />
              </div>

              <div>
                <label className="input-label">5. DPID (DEMAT A/C)</label>
                <input
                  type="text"
                  name="dpid"
                  maxLength={16}
                  placeholder="e.g. 1208160012345678"
                  value={formData.dpid}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">6. BANK NAME 🏦</label>
                <select
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  className="input-field"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">-- Select Bank Name --</option>
                  {availableBanks.map((b, idx) => (
                    <option key={b.id || idx} value={b.bank_name}>
                      {b.bank_name} {b.ifsc_prefix ? `(${b.ifsc_prefix})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label">7. Bank A/c No.</label>
                <input
                  type="text"
                  name="bank_account_no"
                  placeholder="e.g. 50100234567890"
                  value={formData.bank_account_no}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">8. Login ID</label>
                <input
                  type="text"
                  name="login_id"
                  placeholder="e.g. ramesh_k"
                  value={formData.login_id}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">9. ARHAM (Password)</label>
                <input
                  type="text"
                  name="password_encrypted"
                  placeholder="Arham"
                  value={formData.password_encrypted}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">10. CODE (Customer Code)</label>
                <input
                  type="text"
                  name="code"
                  placeholder="e.g. IPO-004"
                  value={formData.code}
                  onChange={handleChange}
                  className="input-field"
                  style={{ fontWeight: 700 }}
                />
              </div>

              <div>
                <label className="input-label">11. Mobile Number</label>
                <input
                  type="text"
                  name="mobile_number"
                  placeholder="e.g. 9876543210"
                  value={formData.mobile_number}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">12. BALANCE (₹)</label>
                <input
                  type="number"
                  name="balance"
                  placeholder="e.g. 50000"
                  value={formData.balance}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">13. Alt Phone (Kono chhe)</label>
                <input
                  type="text"
                  name="phone_alternate"
                  placeholder="e.g. 9876543211 (Brother)"
                  value={formData.phone_alternate}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">14. EMAIL ADDRESS</label>
                <input
                  type="email"
                  name="email"
                  placeholder="e.g. ramesh@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">15. Other Phone Number</label>
                <input
                  type="text"
                  name="phone_other"
                  placeholder="e.g. 9123456789"
                  value={formData.phone_other}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">16. RETURN AMOUNT (₹)</label>
                <input
                  type="number"
                  name="return_amount"
                  placeholder="0"
                  value={formData.return_amount}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="input-label">17. TDS REMARKS</label>
                <input
                  type="text"
                  name="tds_remarks"
                  placeholder="e.g. 10% TDS Deducted for FY26"
                  value={formData.tds_remarks}
                  onChange={handleChange}
                  className="input-field"
                />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Beneficiary Accounts (Multiple Allowed)
              </span>
              <button
                type="button"
                onClick={addBeneficiaryField}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', gap: '4px' }}
              >
                <Plus size={13} /> Add Beneficiary
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {beneficiaries.map((bName, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={`Beneficiary #${idx + 1} Name (e.g. Sunita Kumar)`}
                    value={bName}
                    onChange={(e) => handleBeneficiaryChange(idx, e.target.value)}
                    className="input-field"
                  />
                  {beneficiaries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBeneficiaryField(idx)}
                      style={{
                        background: 'var(--danger-light)',
                        color: 'var(--danger-text)',
                        border: '1px solid rgba(220, 38, 38, 0.2)',
                        borderRadius: '10px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Document Uploads (Watermelon file-upload-2 style) */}
          <div style={{
            background: 'rgba(4, 47, 46, 0.02)',
            border: '1px solid var(--panel-border)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '10px'
          }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '14px' }}>
              KYC &amp; Demat Documents (PAN / Aadhaar / Cheque / CMR)
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {/* PAN Card */}
              <div style={{
                background: 'var(--panel-bg)',
                border: '1.5px dashed var(--panel-border)',
                borderRadius: '16px',
                padding: '14px',
                textAlign: 'center',
                position: 'relative'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '8px', color: 'var(--text-main)' }}>PAN Card Photo</span>
                {docPreviews.pan_card ? (
                  <div style={{ position: 'relative' }}>
                    {docPreviews.pan_card.startsWith('data:image') ? (
                      <img src={docPreviews.pan_card} alt="PAN Card" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                    ) : (
                      <div style={{ padding: '16px 4px', fontSize: '11.5px', color: 'var(--text-muted)' }}><FileText size={20} /><br />{docPreviews.pan_card}</div>
                    )}
                    <button type="button" onClick={() => removeDoc('pan_card')} style={{ position: 'absolute', top: 3, right: 3, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
                  </div>
                ) : (
                  <label style={{ cursor: 'pointer', display: 'block', padding: '12px 4px' }}>
                    <UploadCloud size={24} style={{ color: 'var(--brand-accent)', margin: '0 auto 6px auto', display: 'block' }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Upload PAN</span>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileSelect('pan_card', e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              {/* Aadhaar Card */}
              <div style={{
                background: 'var(--panel-bg)',
                border: '1.5px dashed var(--panel-border)',
                borderRadius: '16px',
                padding: '14px',
                textAlign: 'center',
                position: 'relative'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '8px', color: 'var(--text-main)' }}>Aadhaar Card</span>
                {docPreviews.aadhaar_card ? (
                  <div style={{ position: 'relative' }}>
                    {docPreviews.aadhaar_card.startsWith('data:image') ? (
                      <img src={docPreviews.aadhaar_card} alt="Aadhaar" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                    ) : (
                      <div style={{ padding: '16px 4px', fontSize: '11.5px', color: 'var(--text-muted)' }}><FileText size={20} /><br />{docPreviews.aadhaar_card}</div>
                    )}
                    <button type="button" onClick={() => removeDoc('aadhaar_card')} style={{ position: 'absolute', top: 3, right: 3, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
                  </div>
                ) : (
                  <label style={{ cursor: 'pointer', display: 'block', padding: '12px 4px' }}>
                    <UploadCloud size={24} style={{ color: 'var(--brand-accent)', margin: '0 auto 6px auto', display: 'block' }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Upload Aadhaar</span>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileSelect('aadhaar_card', e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              {/* Cancelled Cheque */}
              <div style={{
                background: 'var(--panel-bg)',
                border: '1.5px dashed var(--panel-border)',
                borderRadius: '16px',
                padding: '14px',
                textAlign: 'center',
                position: 'relative'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '8px', color: 'var(--text-main)' }}>Cancelled Cheque</span>
                {docPreviews.cheque_proof ? (
                  <div style={{ position: 'relative' }}>
                    {docPreviews.cheque_proof.startsWith('data:image') ? (
                      <img src={docPreviews.cheque_proof} alt="Cheque" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                    ) : (
                      <div style={{ padding: '16px 4px', fontSize: '11.5px', color: 'var(--text-muted)' }}><FileText size={20} /><br />{docPreviews.cheque_proof}</div>
                    )}
                    <button type="button" onClick={() => removeDoc('cheque_proof')} style={{ position: 'absolute', top: 3, right: 3, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
                  </div>
                ) : (
                  <label style={{ cursor: 'pointer', display: 'block', padding: '12px 4px' }}>
                    <UploadCloud size={24} style={{ color: 'var(--brand-accent)', margin: '0 auto 6px auto', display: 'block' }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Upload Cheque</span>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileSelect('cheque_proof', e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              {/* Demat CMR Copy */}
              <div style={{
                background: 'var(--panel-bg)',
                border: '1.5px dashed var(--panel-border)',
                borderRadius: '16px',
                padding: '14px',
                textAlign: 'center',
                position: 'relative'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '8px', color: 'var(--text-main)' }}>Demat CMR Copy</span>
                {docPreviews.demat_proof ? (
                  <div style={{ position: 'relative' }}>
                    {docPreviews.demat_proof.startsWith('data:image') ? (
                      <img src={docPreviews.demat_proof} alt="Demat Proof" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                    ) : (
                      <div style={{ padding: '16px 4px', fontSize: '11.5px', color: 'var(--text-muted)' }}><FileText size={20} /><br />{docPreviews.demat_proof}</div>
                    )}
                    <button type="button" onClick={() => removeDoc('demat_proof')} style={{ position: 'absolute', top: 3, right: 3, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
                  </div>
                ) : (
                  <label style={{ cursor: 'pointer', display: 'block', padding: '12px 4px' }}>
                    <UploadCloud size={24} style={{ color: 'var(--brand-accent)', margin: '0 auto 6px auto', display: 'block' }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Upload CMR</span>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileSelect('demat_proof', e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ padding: '10px 20px', fontSize: '14px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ padding: '10px 24px', minWidth: '220px', fontSize: '14px' }}
            >
              {isSubmitting ? 'Saving Profile...' : (isEditMode ? 'Update Customer Profile' : 'Save Customer Profile')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
