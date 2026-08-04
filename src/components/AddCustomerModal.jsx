import React, { useState, useEffect, useRef } from 'react';
import { Users, AlertTriangle, CheckCircle, UploadCloud, FileText, Image as ImageIcon, X, Plus } from 'lucide-react';
import { supabase } from '../services/db';

export default function AddCustomerModal({ onClose, onCustomerAdded, nextCustomerNo, initialData }) {
  const isEditMode = Boolean(initialData);
  const modalScrollRef = useRef(null);

  const [formData, setFormData] = useState({
    customer_no: '',
    full_name: '',
    ca_number: '',
    pan_number: '',
    dpid: '',
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
      }, 800);
    } catch (err) {
      console.error('Save customer exception:', err);
      return triggerError(`Save failed: ${err.message || 'Server error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px'
    }} onClick={onClose}>
      <div ref={modalScrollRef} onClick={(e) => e.stopPropagation()} style={{
        maxWidth: '860px', width: '100%', maxHeight: '92vh', overflowY: 'auto', borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A'
      }}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #E2E8F0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF',
          borderTopLeftRadius: '16px', borderTopRightRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                {isEditMode ? 'Edit Customer Details' : 'Add New Customer'}
              </h3>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748B', lineHeight: 1 }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>1. NO. (Customer No) 🔒</label>
                <input type="number" name="customer_no" placeholder="Auto" value={formData.customer_no} readOnly disabled style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: '#F1F5F9', color: '#475569', cursor: 'not-allowed', fontWeight: 600, fontSize: '13px' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>2. NAME (Full Name) *</label>
                <input type="text" name="full_name" placeholder="e.g. Ramesh Kumar" value={formData.full_name} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} required />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>3. CA (CA Number)</label>
                <input type="text" name="ca_number" placeholder="e.g. AC123456" value={formData.ca_number} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>4. PAN (PAN NUMBER) *</label>
                <input type="text" name="pan_number" maxLength={10} placeholder="e.g. ABCDE1234F" value={formData.pan_number} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} required />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>5. DPID (DEMAT A/C)</label>
                <input type="text" name="dpid" maxLength={16} placeholder="e.g. 1208160012345678" value={formData.dpid} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>6. Bank A/c No.</label>
                <input type="text" name="bank_account_no" placeholder="e.g. 50100234567890" value={formData.bank_account_no} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>7. Login ID</label>
                <input type="text" name="login_id" placeholder="e.g. ramesh_k" value={formData.login_id} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>8. ARHAM</label>
                <input type="text" name="password_encrypted" placeholder="Arham" value={formData.password_encrypted} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>9. CODE (Customer Code)</label>
                <input type="text" name="code" placeholder="e.g. IPO-004" value={formData.code} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>10. Mobile Number</label>
                <input type="text" name="mobile_number" placeholder="e.g. 9876543210" value={formData.mobile_number} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>11. BALANCE (₹)</label>
                <input type="number" name="balance" placeholder="e.g. 50000" value={formData.balance} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>12. Phone Kono chhe (Alt Phone)</label>
                <input type="text" name="phone_alternate" placeholder="e.g. 9876543211 (Brother)" value={formData.phone_alternate} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>13. EMAIL ADDRESS</label>
                <input type="email" name="email" placeholder="e.g. ramesh@email.com" value={formData.email} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>14. PHONE (OTHER NUMBER)</label>
                <input type="text" name="phone_other" placeholder="e.g. 9123456789" value={formData.phone_other} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>15. RETURN AMOUNT (₹)</label>
                <input type="number" name="return_amount" placeholder="0" value={formData.return_amount} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>16. TDS REMARKS</label>
              <input type="text" name="tds_remarks" placeholder="e.g. 10% TDS Deducted for FY26" value={formData.tds_remarks} onChange={handleChange} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }} />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                17. BENEFICIARY NAMES (MULTIPLE BENEFICIARIES ALLOWED)
              </label>
              <button type="button" onClick={addBeneficiaryField} style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={12} /> Add Another Beneficiary
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {beneficiaries.map((bName, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={`Beneficiary #${idx + 1} Name (e.g. Sunita Kumar)`}
                    value={bName}
                    onChange={(e) => handleBeneficiaryChange(idx, e.target.value)}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px' }}
                  />
                  {beneficiaries.length > 1 && (
                    <button type="button" onClick={() => removeBeneficiaryField(idx)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', padding: '8px 10px', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '12px' }}>
              🖼️ DOCUMENT PICTURES
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
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

          {errorMsg && (
            <div className="auth-banner auth-banner-error" style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px' }}>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ background: '#2563EB', color: '#fff', minWidth: '200px' }}>
              {isSubmitting ? 'Updating Customer Profile...' : (isEditMode ? 'Update Customer Profile' : 'Save Customer Profile')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
