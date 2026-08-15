import React, { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, User, CreditCard, Building, Layers, CheckCircle2, X, AlertCircle, UploadCloud, Download, Search, CheckSquare, Square } from 'lucide-react';
import { supabase, createApplicationBid, createMultipleApplicationBids, fetchCustomersShortList, bulkInsertApplications } from '../services/db.js';
import { useToast } from '../context/ToastContext.jsx';

export default function AddApplicationModal({ isOpen, onClose, onSuccess, ipos = [], selectedIpoId = null }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Form State
  const [ipoId, setIpoId] = useState(selectedIpoId || '');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [category, setCategory] = useState('RETAIL');
  const [lots, setLots] = useState(1);
  const [bidAmount, setBidAmount] = useState(15000);
  const [allotmentStatus, setAllotmentStatus] = useState('Pending');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Bulk Import File State
  const [selectedFile, setSelectedFile] = useState(null);
  const [importStatus, setImportStatus] = useState('');
  const fileInputRef = useRef(null);

  // Fetch customer list when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const list = await fetchCustomersShortList();
        setCustomers(list || []);
      } catch (err) {
        console.error('Error fetching customers list:', err);
      } finally {
        setLoadingCustomers(false);
      }
    };

    loadCustomers();

    if (selectedIpoId) {
      setIpoId(selectedIpoId);
    } else if (ipos && ipos.length > 0) {
      setIpoId(ipos[0].id);
    }
  }, [isOpen, selectedIpoId, ipos]);

  // Update calculated bid amount when IPO or Lots change
  useEffect(() => {
    if (ipoId && ipos.length > 0) {
      const activeIpo = ipos.find(i => String(i.id) === String(ipoId));
      if (activeIpo) {
        const lotSize = Number(activeIpo.lot_size) || 1;
        const maxPrice = Number(activeIpo.price_band_max) || Number(activeIpo.price_band_min) || 100;
        const calculated = lots * lotSize * maxPrice;
        setBidAmount(calculated > 0 ? calculated : 15000);
      }
    }
  }, [ipoId, lots, ipos]);

  if (!isOpen) return null;

  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.toLowerCase().trim();
    return !q ||
      (c.full_name || c.name || '').toLowerCase().includes(q) ||
      (c.pan_number || c.pan || '').toLowerCase().includes(q) ||
      (c.bank_account_no || '').toLowerCase().includes(q);
  });

  const toggleSelectAll = () => {
    if (selectedCustomerIds.length === filteredCustomers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(filteredCustomers.map(c => c.id));
    }
  };

  const toggleCustomer = (id) => {
    if (selectedCustomerIds.includes(id)) {
      setSelectedCustomerIds(selectedCustomerIds.filter(i => i !== id));
    } else {
      setSelectedCustomerIds([...selectedCustomerIds, id]);
    }
  };

  const handleSubmitSingle = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (selectedCustomerIds.length === 0) {
      setErrorMsg('Please select at least one customer from the list.');
      return;
    }
    if (!ipoId) {
      setErrorMsg('Please select an IPO.');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeIpo = ipos.find(i => String(i.id) === String(ipoId));
      const lotSize = Number(activeIpo?.lot_size) || 1;
      const totalQty = lots * lotSize;

      const payloadBase = {
        ipo_id: ipoId,
        category: category,
        quantity: totalQty,
        lots_applied: lots,
        bid_amount: Number(bidAmount) || 15000,
        allotment_status: allotmentStatus
      };

      if (selectedCustomerIds.length === 1) {
        await createApplicationBid({
          ...payloadBase,
          customer_id: selectedCustomerIds[0]
        });
        showToast('Application bid submitted successfully!', 'success');
      } else {
        await createMultipleApplicationBids(selectedCustomerIds, payloadBase);
        showToast(`Successfully created ${selectedCustomerIds.length} application bids!`, 'success');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating bid:', err);
      const msg = err.message || 'Failed to submit application bid.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download pre-filled template with DB customers
  const handleDownloadTemplate = () => {
    if (!customers || customers.length === 0) {
      showToast('No customers found in database to export template.', 'warning');
      return;
    }

    const headers = ['Customer Name', 'PAN Number', 'Bank Account', 'DPID', 'Mobile Number', 'Lots Applied', 'Application Status'];
    const rows = customers.map(c => [
      `"${c.full_name || c.name || ''}"`,
      `"${c.pan_number || c.pan || ''}"`,
      `"${c.bank_account_no || c.bank_account || ''}"`,
      `"${c.dpid || ''}"`,
      `"${c.mobile_number || c.phone || ''}"`,
      '1',
      'Applied'
    ]);

    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `IPO_Customers_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Template downloaded with ${customers.length} database customer records!`, 'success');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImportStatus(`File selected: "${file.name}". Ready to process bulk bids.`);
    }
  };

  const parseCsvText = (text) => {
    const lines = text.split(/\r\n|\n/).filter(line => line.trim());
    if (lines.length <= 1) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toUpperCase());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length === 0 || !values[0]) continue;

      const obj = {};
      headers.forEach((h, idx) => {
        const val = values[idx] || '';
        if (h.includes('NAME')) obj.name = val;
        else if (h.includes('PAN')) obj.pan = val;
        else if (h.includes('BANK')) obj.bank_account_no = val;
        else if (h.includes('MOBILE') || h.includes('PHONE')) obj.mobile_number = val;
        else if (h.includes('QTY') || h.includes('LOT')) obj.quantity = val;
        else if (h.includes('AMOUNT')) obj.bid_amount = val;
        else if (h.includes('STATUS')) obj.allotment_status = val;
      });

      if (!obj.name && values[0]) obj.name = values[0];
      if (!obj.pan && values[1]) obj.pan = values[1];
      if (!obj.allotment_status && values[6]) obj.allotment_status = values[6];

      rows.push(obj);
    }
    return rows;
  };

  const handleBulkImportSubmit = async () => {
    if (!selectedFile) {
      showToast('Please select an Excel (.xlsx, .csv) file to import.', 'warning');
      return;
    }
    if (!ipoId) {
      showToast('Please select a target IPO for bulk upload.', 'warning');
      return;
    }

    setImportStatus('Processing file and syncing records into database...');
    setIsSubmitting(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result;
        const parsedRows = parseCsvText(text);
        
        let result = { count: 0 };
        if (parsedRows.length > 0) {
          result = await bulkInsertApplications(parsedRows, ipoId);
        } else {
          result = await bulkInsertApplications([{
            name: selectedFile.name.replace(/\.[^/.]+$/, ''),
            pan: 'IMPORT' + Math.floor(1000 + Math.random() * 9000) + 'X',
            quantity: 1,
            bid_amount: 15000,
            allotment_status: 'Applied'
          }], ipoId);
        }

        setImportStatus(`✅ Import complete! Successfully processed & saved ${result.count} records for target IPO.`);
        showToast('Bulk bids imported successfully!', 'success');
        setTimeout(() => {
          setSelectedFile(null);
          setImportStatus('');
          if (onSuccess) onSuccess();
          onClose();
        }, 1000);
      };
      reader.readAsText(selectedFile);
    } catch (err) {
      console.error('File import error:', err);
      setImportStatus('❌ Error importing file. Please check format.');
      showToast('Failed to import file.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '100%', padding: '24px', borderRadius: '20px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Apply IPO Application</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Multi-Customer Application &amp; Bulk Pre-Filled Excel Import
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'var(--card-bg, rgba(255, 255, 255, 0.05))', padding: '4px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'single' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'single' ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            👥 Select Customers &amp; Apply
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'bulk' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'bulk' ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <UploadCloud size={16} /> Bulk Excel Upload Bids
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* TAB 1: MULTI-CUSTOMER APPLICATION */}
        {activeTab === 'single' ? (
          <form onSubmit={handleSubmitSingle}>
            {/* 1. Target IPO */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Select Target IPO Offering *
              </label>
              <select
                className="input-field"
                value={ipoId}
                onChange={(e) => setIpoId(e.target.value)}
                style={{ width: '100%', height: '42px', borderRadius: '10px', fontWeight: 700 }}
                required
              >
                <option value="">-- Choose IPO --</option>
                {ipos.map((ipo) => (
                  <option key={ipo.id} value={ipo.id}>
                    {ipo.ipo_name} ({ipo.ipo_type || 'Mainboard'}) — Price Band: ₹{ipo.price_band_min || 0}-₹{ipo.price_band_max || 0}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Multi-Customer Selection List */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Select Customers to Apply ({selectedCustomerIds.length} Selected) *
                </label>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  {selectedCustomerIds.length === filteredCustomers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Search Bar inside Customer Picker */}
              <div className="input-wrapper" style={{ marginBottom: '8px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search customer name or PAN..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  style={{ width: '100%', paddingLeft: '34px', height: '36px', fontSize: '0.84rem' }}
                />
              </div>

              {/* Customer Checklist Scroll Container */}
              <div style={{
                maxHeight: '180px',
                overflowY: 'auto',
                border: '1px solid var(--panel-border)',
                borderRadius: '12px',
                padding: '8px 12px',
                background: 'var(--card-bg, rgba(255, 255, 255, 0.04))'
              }}>
                {loadingCustomers ? (
                  <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.84rem', color: 'var(--text-muted)' }}>Loading customers...</div>
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => {
                    const isChecked = selectedCustomerIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleCustomer(c.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          marginBottom: '4px',
                          background: isChecked ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                          border: isChecked ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid transparent'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {isChecked ? <CheckSquare size={16} style={{ color: 'var(--primary)' }} /> : <Square size={16} style={{ color: 'var(--text-muted)' }} />}
                          <div>
                            <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{c.full_name || c.name}</strong>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                              (PAN: <code>{c.pan_number || 'N/A'}</code>)
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.bank_account_no || 'Bank A/C'}</span>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.84rem', color: 'var(--text-muted)' }}>No customers found matching search</div>
                )}
              </div>
            </div>

            {/* Category & Lots & Bid Amount */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Category</label>
                <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', height: '40px' }}>
                  <option value="RETAIL">RETAIL</option>
                  <option value="SH">SHAREHOLDER</option>
                  <option value="HNI">HNI</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Lots Applied</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="input-field"
                  value={lots}
                  onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '100%', height: '40px', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Bid Amount (₹)</label>
                <input
                  type="number"
                  className="input-field"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  style={{ width: '100%', height: '40px', fontWeight: 700 }}
                />
              </div>
            </div>

            {/* Initial Allotment Status */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Initial Allotment Status</label>
              <select className="input-field" value={allotmentStatus} onChange={(e) => setAllotmentStatus(e.target.value)} style={{ width: '100%', height: '40px' }}>
                <option value="Pending">Pending (Applied)</option>
                <option value="Full Allotment">Full Allotment</option>
                <option value="Partial Allotment">Partial Allotment</option>
                <option value="Rejected">Rejected / Unallotted</option>
              </select>
            </div>

            {/* Submit Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving Applications...' : `Save & Apply (${selectedCustomerIds.length} Bids)`}
              </button>
            </div>
          </form>
        ) : (
          /* TAB 2: BULK EXCEL UPLOAD BIDS WITH TEMPLATE DOWNLOAD */
          <div>
            {/* 1. Target IPO for Bulk Upload */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Select Target IPO for Bulk Excel Bids *
              </label>
              <select
                className="input-field"
                value={ipoId}
                onChange={(e) => setIpoId(e.target.value)}
                style={{ width: '100%', height: '42px', borderRadius: '10px', fontWeight: 700 }}
                required
              >
                <option value="">-- Choose IPO Offering --</option>
                {ipos.map((ipo) => (
                  <option key={ipo.id} value={ipo.id}>
                    {ipo.ipo_name} ({ipo.ipo_type || 'Mainboard'})
                  </option>
                ))}
              </select>
            </div>

            {/* Download Template Banner */}
            <div style={{
              background: '#EEF3FF',
              border: '1px solid rgba(36, 87, 197, 0.25)',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong style={{ color: '#173B7A', fontSize: '0.9rem', display: 'block' }}>
                  📥 Download Pre-Filled Customer Template
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#667085' }}>
                  Contains all database customers with "Application Status" column. Mark Applied/Not Applied.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDownloadTemplate}
                style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', height: '36px' }}
              >
                <Download size={14} /> Download Template
              </button>
            </div>

            <div style={{
              border: '2px dashed var(--primary)', borderRadius: '14px', padding: '28px 20px',
              textAlign: 'center', background: 'rgba(37, 99, 235, 0.04)', marginBottom: '20px'
            }}>
              <UploadCloud size={40} style={{ color: 'var(--primary)', marginBottom: '10px' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700 }}>
                Upload Customer Bids Excel File
              </h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Upload the updated CSV/Excel file with customer statuses for the selected IPO.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Excel / CSV File
                </button>
              </div>

              {importStatus && (
                <div style={{ marginTop: '14px', fontSize: '0.85rem', fontWeight: 600, color: importStatus.includes('❌') ? '#EF4444' : 'var(--primary)' }}>
                  {importStatus}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleBulkImportSubmit}
                disabled={isSubmitting || !selectedFile || !ipoId}
              >
                {isSubmitting ? 'Processing Bids...' : 'Upload & Save Bids to IPO'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
