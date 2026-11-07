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
  CreditCard,
  Banknote
} from 'lucide-react';
import { supabase, fetchBanks, getSystemSettings } from '../services/db';
import CashWithdrawalModal from './CashWithdrawalModal';

// Master document definitions for Customer Dossier (11 Required Documents)
export const CUSTOMER_DOC_TYPES = [
  { key: 'pan_card', label: 'Pan card', accept: 'image/*,.pdf' },
  { key: 'aadhar_card', label: 'Aadhar Card', accept: 'image/*,.pdf', aliases: ['aadhaar_card'] },
  { key: 'check', label: 'Check', accept: 'image/*,.pdf', aliases: ['cheque_proof', 'cheque'] },
  { key: 'passbook', label: 'PassBook', accept: 'image/*,.pdf', aliases: ['passbook_proof'] },
  { key: 'lc_birth_certificate', label: 'Lc/Birth Certificate', accept: 'image/*,.pdf', aliases: ['lc_birth_cert', 'birth_certificate', 'lc_birth_ccertificate'] },
  { key: 'merrit_certificate', label: 'Merrit Certificate', accept: 'image/*,.pdf', aliases: ['merrit_cert', 'marriage_certificate'] },
  { key: 'stamp_paper', label: 'Stamp paper', accept: 'image/*,.pdf', aliases: ['stamp_paper_proof'] },
  { key: 'huf_did', label: 'Huf Did', accept: 'image/*,.pdf', aliases: ['huf_deed'] },
  { key: 'passport_picture', label: 'Passport Size Picture', accept: 'image/*,.pdf', aliases: ['passport_photo', 'passport_pic'] },
  { key: 'signature_arham', label: 'Signature Photo ( Arham )', accept: 'image/*,.pdf', aliases: ['sig_arham', 'signature_photo_arham'] },
  { key: 'signature_bank', label: 'Signature Photo ( Bank )', accept: 'image/*,.pdf', aliases: ['sig_bank', 'signature_photo_bank'] },
];

export const createEmptyDocMap = () => {
  const map = {};
  CUSTOMER_DOC_TYPES.forEach((dt) => {
    map[dt.key] = null;
  });
  return map;
};

export const createEmptyPreviewMap = () => {
  const map = {};
  CUSTOMER_DOC_TYPES.forEach((dt) => {
    map[dt.key] = '';
  });
  return map;
};

export default function AddCustomerModal({ onClose, onCustomerAdded, nextCustomerNo, initialData }) {
  const isEditMode = Boolean(initialData);
  const modalScrollRef = useRef(null);

  const [availableBanks, setAvailableBanks] = useState([]);

  const defaultProfitPct = String(getSystemSettings().default_customer_profit_pct || 40);

  const [formData, setFormData] = useState({
    customer_no: '',
    full_name: '',
    ca_number: '',
    pan_number: '',
    aadhaar_number: '',
    birthdate: '',
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
    profit_share_percentage: defaultProfitPct,
    kyc_status: 'Verified'
  });

  const [beneficiaries, setBeneficiaries] = useState(['']);

  const [documents, setDocuments] = useState(createEmptyDocMap);
  const [docPreviews, setDocPreviews] = useState(createEmptyPreviewMap);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);

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
      const rawDob = initialData.birthdate || initialData.date_of_birth || initialData.dob || '';
      const formattedDob = rawDob ? String(rawDob).split('T')[0] : '';

      setFormData({
        customer_no: initialData.customer_no || '',
        full_name: initialData.full_name || initialData.name || '',
        ca_number: initialData.ca_number || '',
        pan_number: initialData.pan_number || '',
        aadhaar_number: initialData.aadhaar_number || initialData.aadhar_number || initialData.aadhar_card_number || '',
        birthdate: formattedDob,
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
        profit_share_percentage: (() => {
          let p = initialData.profit_share_percentage;
          if (p === undefined || p === null || p === '') {
            if (initialData.address && typeof initialData.address === 'string' && initialData.address.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(initialData.address);
                if (parsed?.__meta?.profit_share_percentage !== undefined && parsed?.__meta?.profit_share_percentage !== null) {
                  p = parsed.__meta.profit_share_percentage;
                }
              } catch (_) {}
            }
          }
          return p !== undefined && p !== null && p !== '' ? String(p) : '40';
        })(),
        kyc_status: initialData.kyc_status || 'Verified'
      });

      if (initialData.beneficiary_name) {
        const bList = String(initialData.beneficiary_name).split(',').map(b => b.trim()).filter(Boolean);
        setBeneficiaries(bList.length > 0 ? bList : ['']);
      }

      // Load existing document previews from initialData (documents object, address JSON, or customer_documents array)
      let existingDocs = {};
      if (initialData.documents && typeof initialData.documents === 'object') {
        existingDocs = { ...initialData.documents };
      }
      if (initialData.address && typeof initialData.address === 'string' && initialData.address.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(initialData.address);
          if (parsed && typeof parsed === 'object') {
            existingDocs = { ...existingDocs, ...parsed };
          }
        } catch (_) {}
      }
      if (Array.isArray(initialData.customer_documents)) {
        initialData.customer_documents.forEach(d => {
          if (d.document_type && d.file_path) {
            existingDocs[d.document_type] = d.file_path;
          }
        });
      }

      const resolvedPreviews = createEmptyPreviewMap();
      CUSTOMER_DOC_TYPES.forEach(dt => {
        let val = existingDocs[dt.key];
        if (!val && dt.aliases) {
          for (const alias of dt.aliases) {
            if (existingDocs[alias]) {
              val = existingDocs[alias];
              break;
            }
          }
        }
        resolvedPreviews[dt.key] = val || '';
      });
      setDocPreviews(resolvedPreviews);
    } else {
      const targetNo = nextCustomerNo || 1;
      setFormData(prev => ({
        ...prev,
        customer_no: targetNo,
        code: prev.code || `IPO-${String(targetNo).padStart(3, '0')}`,
        password_encrypted: prev.password_encrypted || 'Arham',
        profit_share_percentage: prev.profit_share_percentage !== undefined && prev.profit_share_percentage !== null && prev.profit_share_percentage !== '' ? prev.profit_share_percentage : '40'
      }));
      setDocuments(createEmptyDocMap());
      setDocPreviews(createEmptyPreviewMap());
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

    if (name === 'aadhaar_number') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 12);
      setFormData((prev) => ({ ...prev, aadhaar_number: digitsOnly }));
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

    const reader = new FileReader();
    reader.onload = (e) => {
      setDocPreviews((prev) => ({ ...prev, [docType]: e.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const removeDoc = (docType) => {
    setDocuments((prev) => ({ ...prev, [docType]: null }));
    setDocPreviews((prev) => ({ ...prev, [docType]: '' }));
  };

  const uploadDocsToBucket = async (customerId) => {
    const uploadedUrls = {};
    for (const [docType, file] of Object.entries(documents)) {
      if (!file) {
        // If there was an existing uploaded document preview (from edit mode), preserve it
        if (docPreviews[docType] && typeof docPreviews[docType] === 'string') {
          uploadedUrls[docType] = docPreviews[docType];
        }
        continue;
      }
      try {
        const fileExt = file.name ? file.name.split('.').pop() : 'png';
        const cleanDocType = docType.replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `cust_${customerId || Date.now()}_${cleanDocType}_${Date.now()}.${fileExt}`;
        const filePath = `customer-documents/${fileName}`;
        const contentType = file.type || (fileExt.toLowerCase() === 'pdf' ? 'application/pdf' : 'image/jpeg');

        const { data, error } = await supabase.storage
          .from('customer-docs')
          .upload(filePath, file, { contentType, upsert: true });

        if (!error && data) {
          const { data: pubData } = supabase.storage
            .from('customer-docs')
            .getPublicUrl(filePath);
          uploadedUrls[docType] = pubData?.publicUrl || filePath;
        } else {
          // If storage bucket upload is denied or fails, store the full Base64 Data URL so the document is 100% saved & viewable/downloadable
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
      const rawProfit = String(formData.profit_share_percentage ?? '').trim();
      let profitPctNum = 40;
      if (rawProfit === '0' || rawProfit === 0) {
        profitPctNum = 0;
      } else if (rawProfit !== '' && !isNaN(parseFloat(rawProfit))) {
        profitPctNum = parseFloat(rawProfit);
      }

      // Preserve existing metadata (like withdrawals) from initialData.address if present
      let existingAddressMeta = {};
      if (initialData?.address && typeof initialData.address === 'string' && initialData.address.trim().startsWith('{')) {
        try {
          existingAddressMeta = JSON.parse(initialData.address);
        } catch (_) {}
      }

      const docPayloadWithMeta = {
        ...existingAddressMeta,
        ...uploadedDocUrls,
        __meta: {
          ...(existingAddressMeta.__meta || {}),
          profit_share_percentage: profitPctNum
        }
      };
      const docJsonString = JSON.stringify(docPayloadWithMeta);

      const payload = {
        customer_no: parseInt(formData.customer_no, 10) || null,
        full_name: formData.full_name.trim(),
        name: formData.full_name.trim(),
        ca_number: formData.ca_number.trim() || null,
        pan_number: formData.pan_number.trim().toUpperCase(),
        aadhaar_number: formData.aadhaar_number ? formData.aadhaar_number.replace(/\D/g, '') : null,
        birthdate: formData.birthdate || null,
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
        profit_share_percentage: profitPctNum,
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

      if (error && (String(error.message || '').includes('profit_share_percentage') || String(error.message || '').includes('aadhaar_number') || String(error.message || '').includes('birthdate'))) {
        const safePayload = { ...payload };
        if (String(error.message || '').includes('profit_share_percentage')) delete safePayload.profit_share_percentage;
        if (String(error.message || '').includes('aadhaar_number')) delete safePayload.aadhaar_number;
        if (String(error.message || '').includes('birthdate')) delete safePayload.birthdate;
        if (isEditMode) {
          const res = await supabase.from('customers').update(safePayload).eq('id', initialData?.id).select();
          data = res?.data;
          error = res?.error;
        } else {
          const res = await supabase.from('customers').insert([safePayload]).select();
          data = res?.data;
          error = res?.error;
        }
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
      
      const newCust = savedCust
        ? { ...savedCust, documents: uploadedDocUrls, profit_share_percentage: profitPctNum }
        : { ...payload, id: targetCustId, documents: uploadedDocUrls, profit_share_percentage: profitPctNum };

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
                <label className="input-label">5. AADHAAR CARD NO. 🪪</label>
                <input
                  type="text"
                  name="aadhaar_number"
                  maxLength={12}
                  placeholder="e.g. 5678 1234 9012"
                  value={formData.aadhaar_number}
                  onChange={handleChange}
                  className="input-field"
                  style={{ letterSpacing: '0.05em', fontWeight: 600 }}
                />
              </div>

              <div>
                <label className="input-label">6. BIRTHDATE (DOB) 📅</label>
                <input
                  type="date"
                  name="birthdate"
                  max={new Date().toISOString().split('T')[0]}
                  value={formData.birthdate}
                  onChange={handleChange}
                  className="input-field"
                  style={{ cursor: 'pointer' }}
                />
              </div>

              <div>
                <label className="input-label">7. DPID (DEMAT A/C)</label>
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
                <label className="input-label">8. BANK NAME 🏦</label>
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
                <label className="input-label">9. Bank A/c No.</label>
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
                <label className="input-label">10. Login ID</label>
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
                <label className="input-label">11. ARHAM (Password)</label>
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
                <label className="input-label">12. CODE (Customer Code)</label>
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
                <label className="input-label">13. Mobile Number</label>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="input-label" style={{ margin: 0 }}>14. BALANCE (₹)</label>
                  {isEditMode && initialData?.id && (
                    <button
                      type="button"
                      onClick={() => setIsWithdrawalOpen(true)}
                      className="btn btn-secondary"
                      style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#0f766e',
                        borderColor: '#0f766e',
                        background: 'rgba(15, 118, 110, 0.08)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Withdraw cash for this customer"
                    >
                      <Banknote size={13} /> Cash Withdrawal
                    </button>
                  )}
                </div>
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
                <label className="input-label">15. PH KONO CHE</label>
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
                <label className="input-label">16. EMAIL ADDRESS</label>
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
                <label className="input-label">17. PHONE</label>
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
                <label className="input-label">18. RETURN AMOUNT (₹)</label>
                <input
                  type="number"
                  name="return_amount"
                  placeholder="0"
                  value={formData.return_amount}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">19. TDS REMARKS</label>
                <input
                  type="text"
                  name="tds_remarks"
                  placeholder="e.g. 10% TDS Deducted for FY26"
                  value={formData.tds_remarks}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="input-label" style={{ margin: 0 }}>20. PROFIT SHARE (%)</label>
                  <span className="badge badge-teal" style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 800 }}>
                    Treasury: {Math.max(0, 100 - (formData.profit_share_percentage === '' ? 0 : (!isNaN(parseFloat(formData.profit_share_percentage)) ? parseFloat(formData.profit_share_percentage) : 0)))}%
                  </span>
                </div>
                <input
                  type="number"
                  name="profit_share_percentage"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="0"
                  value={formData.profit_share_percentage}
                  onChange={handleChange}
                  className="input-field"
                  style={{ fontWeight: 800, color: 'var(--brand-accent)' }}
                />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {[0, 20, 40, 50, 60, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, profit_share_percentage: String(pct) }))}
                      style={{
                        border: String(formData.profit_share_percentage) === String(pct) ? '1.5px solid #0f766e' : '1px solid var(--panel-border)',
                        background: String(formData.profit_share_percentage) === String(pct) ? 'rgba(15, 118, 110, 0.12)' : 'var(--panel-bg)',
                        color: String(formData.profit_share_percentage) === String(pct) ? '#0f766e' : 'var(--text-main)',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {pct === 0 ? '0% (Zero Share)' : pct === 100 ? '100% (Full Share)' : `${pct}%`}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Default is 40% (Can be set to 0%, 100% or any percentage)
                </span>
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

          {/* Section 3: Document Uploads */}
          <div style={{
            background: 'rgba(4, 47, 46, 0.02)',
            border: '1px solid var(--panel-border)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Required Customer Documents ({CUSTOMER_DOC_TYPES.length} Documents)
              </span>
              <span className="badge badge-teal" style={{ fontSize: '11px', padding: '2px 8px' }}>
                Images &amp; PDF Allowed
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {CUSTOMER_DOC_TYPES.map((dt) => {
                const preview = docPreviews[dt.key];
                const isImage = preview && (preview.startsWith('data:image') || preview.match(/\.(jpeg|jpg|png|webp|gif)($|\?)/i));
                return (
                  <div
                    key={dt.key}
                    style={{
                      background: 'var(--panel-bg)',
                      border: preview ? '1.5px solid var(--brand-accent)' : '1.5px dashed var(--panel-border)',
                      borderRadius: '16px',
                      padding: '14px',
                      textAlign: 'center',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '145px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '8px', color: 'var(--text-main)', lineHeight: '1.3' }}>
                      {dt.label}
                    </span>
                    {preview ? (
                      <div style={{ position: 'relative', width: '100%' }}>
                        {isImage ? (
                          <img
                            src={preview}
                            alt={dt.label}
                            style={{ width: '100%', height: '84px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--panel-border)' }}
                          />
                        ) : (
                          <div style={{ padding: '8px 4px', fontSize: '11px', color: 'var(--text-main)', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <FileText size={24} style={{ margin: '0 auto 4px auto', display: 'block', color: '#dc2626' }} />
                            <strong style={{ color: '#dc2626', display: 'block', fontSize: '11px' }}>PDF File Attached</strong>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 auto' }}>
                              {documents[dt.key]?.name || (typeof preview === 'string' && preview.includes('/') ? preview.split('/').pop() : 'Document')}
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeDoc(dt.key)}
                          title="Remove document"
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            background: 'var(--danger)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <label style={{ cursor: 'pointer', display: 'block', padding: '10px 4px' }}>
                        <UploadCloud size={24} style={{ color: 'var(--brand-accent)', margin: '0 auto 6px auto', display: 'block' }} />
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)' }}>Upload</span>
                        <input
                          type="file"
                          accept={dt.accept || 'image/*,.pdf'}
                          onChange={(e) => handleFileSelect(dt.key, e.target.files[0])}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
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

      {/* Cash Withdrawal Modal */}
      {isWithdrawalOpen && initialData && (
        <CashWithdrawalModal
          isOpen={isWithdrawalOpen}
          onClose={() => setIsWithdrawalOpen(false)}
          customer={initialData}
          onSuccess={(newBal) => {
            setFormData((prev) => ({ ...prev, balance: String(newBal) }));
          }}
        />
      )}
    </div>
  );
}
