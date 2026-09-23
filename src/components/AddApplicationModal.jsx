import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  User,
  CreditCard,
  Building,
  Layers,
  CheckCircle2,
  X,
  AlertCircle,
  UploadCloud,
  Download,
  Search,
  CheckSquare,
  Square,
  Users
} from 'lucide-react';
import { supabase, createApplicationBid, createMultipleApplicationBids, fetchCustomersShortList, bulkInsertApplications, getSystemSettings } from '../services/db.js';
import { useToast } from '../context/ToastContext.jsx';

export default function AddApplicationModal({ isOpen, onClose, onSuccess, ipos = [], selectedIpoId = null }) {
  const { showToast } = useToast();
  const sysSettings = getSystemSettings();
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Form State
  const [ipoId, setIpoId] = useState(selectedIpoId || '');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [category, setCategory] = useState(sysSettings.default_category || 'RETAIL');
  const [lots, setLots] = useState(1);
  const [bidAmount, setBidAmount] = useState(sysSettings.default_retail_bid_amount || 15000);
  const [allotmentStatus, setAllotmentStatus] = useState('Pending');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [showOnlySelected, setShowOnlySelected] = useState(false);

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
    if (showOnlySelected && !selectedCustomerIds.includes(c.id)) {
      return false;
    }
    const q = customerSearch.toLowerCase().trim();
    return !q ||
      (c.full_name || c.name || '').toLowerCase().includes(q) ||
      (c.pan_number || c.pan || '').toLowerCase().includes(q) ||
      (c.bank_name || '').toLowerCase().includes(q) ||
      (c.bank_account_no || '').toLowerCase().includes(q);
  });

  const toggleSelectAll = () => {
    const visibleIds = filteredCustomers.map(c => c.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedCustomerIds.includes(id));

    if (allVisibleSelected) {
      // Deselect visible
      setSelectedCustomerIds(selectedCustomerIds.filter(id => !visibleIds.includes(id)));
    } else {
      // Select all visible (preserving already selected others)
      const merged = Array.from(new Set([...selectedCustomerIds, ...visibleIds]));
      setSelectedCustomerIds(merged);
    }
  };

  const clearAllSelected = () => {
    setSelectedCustomerIds([]);
    setShowOnlySelected(false);
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
      setErrorMsg('Please select a target IPO Offering.');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeIpo = ipos.find(i => String(i.id) === String(ipoId));
      const lotSize = Number(activeIpo?.lot_size) || 1;
      const totalQty = lots * lotSize;

      const bidPayloads = selectedCustomerIds.map(customerId => ({
        customer_id: customerId,
        ipo_id: ipoId,
        category: category,
        quantity: totalQty,
        bid_amount: Number(bidAmount),
        allotment_status: allotmentStatus || 'Pending'
      }));

      await createMultipleApplicationBids(bidPayloads);
      showToast(`Successfully registered ${bidPayloads.length} IPO bid(s)!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating applications:', err);
      setErrorMsg(err.message || 'Failed to submit application bids.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk Template Download
  const handleDownloadTemplate = () => {
    const activeIpo = ipos.find(i => String(i.id) === String(ipoId));
    const ipoTitle = activeIpo ? activeIpo.ipo_name : 'Selected_IPO';

    const headers = [
      'Customer No',
      'Customer Name',
      'PAN Number',
      'DPID',
      'Bank Name',
      'Bank Account No',
      'Mobile Number',
      'Target IPO Name',
      'Category (RETAIL/HNI)',
      'Lots Applied',
      'Bid Amount (INR)',
      'Application Status (Applied/Not Applied)'
    ];

    const rows = customers.map(c => [
      c.customer_no || '',
      `"${(c.full_name || c.name || '').replace(/"/g, '""')}"`,
      c.pan_number || '',
      c.dpid || '',
      `"${(c.bank_name || '').replace(/"/g, '""')}"`,
      c.bank_account_no || '',
      c.mobile_number || '',
      `"${ipoTitle}"`,
      'RETAIL',
      '1',
      bidAmount,
      'Applied'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `IPO_Application_Template_${ipoTitle.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Customer Application Template downloaded!', 'success');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setImportStatus(`Selected: ${file.name}`);
  };

  const handleBulkImportSubmit = async () => {
    if (!selectedFile) {
      showToast('Please select a CSV or Excel file first.', 'warning');
      return;
    }

    if (!ipoId) {
      showToast('Please select the Target IPO for this bulk import.', 'warning');
      return;
    }

    setIsSubmitting(true);
    setImportStatus('Parsing and importing customer applications...');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);

        if (lines.length <= 1) {
          setImportStatus('❌ File is empty or invalid.');
          setIsSubmitting(false);
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
        const dataRows = [];

        for (let i = 1; i < lines.length; i++) {
          const rawCols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          const cols = rawCols.map(c => (c || '').trim().replace(/^["']|["']$/g, ''));
          if (cols.length === 0 || !cols.some(c => c)) continue;

          const rowObj = {};
          headers.forEach((h, idx) => {
            rowObj[h] = cols[idx] || '';
          });

          const pan = rowObj['pan number'] || rowObj['pan'] || rowObj['pan_number'] || '';
          const name = rowObj['customer name'] || rowObj['name'] || rowObj['full_name'] || '';
          const status = rowObj['application status (applied/not applied)'] || rowObj['status'] || rowObj['application status'] || 'Applied';
          const lotsApplied = Number(rowObj['lots applied'] || rowObj['lots'] || rowObj['quantity']) || 1;
          const bidAmt = Number(rowObj['bid amount (inr)'] || rowObj['bid amount'] || rowObj['amount']) || 15000;

          if (String(status).toLowerCase().includes('not applied') || String(status).toLowerCase() === 'no') {
            continue;
          }

          dataRows.push({
            pan_number: pan,
            full_name: name,
            lots_applied: lotsApplied,
            bid_amount: bidAmt,
            allotment_status: 'Pending',
            ipo_id: ipoId
          });
        }

        if (dataRows.length === 0) {
          setImportStatus('❌ No "Applied" customer records found in file.');
          setIsSubmitting(false);
          return;
        }

        const res = await bulkInsertApplications(dataRows, ipoId);
        setImportStatus(`✅ Successfully imported ${res.count} applications!`);
        showToast(`Imported ${res.count} applications for IPO!`, 'success');

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
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '720px',
          width: '92vw',
          maxHeight: '90vh',
          borderRadius: '28px',
          padding: 0,
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
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Apply IPO Application
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Multi-Customer Bid Dispatcher &amp; Pre-Filled Excel Stream
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
              color: 'var(--text-muted)'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ padding: '16px 28px 0 28px' }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            background: 'rgba(4, 47, 46, 0.04)',
            padding: '4px',
            borderRadius: '14px',
            border: '1px solid var(--panel-border)'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`btn ${activeTab === 'single' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                border: 'none',
                boxShadow: activeTab === 'single' ? '0 2px 8px rgba(4, 47, 46, 0.15)' : 'none'
              }}
            >
              👥 Select Customers &amp; Apply
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bulk')}
              className={`btn ${activeTab === 'bulk' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                border: 'none',
                boxShadow: activeTab === 'bulk' ? '0 2px 8px rgba(4, 47, 46, 0.15)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <UploadCloud size={15} /> Bulk Excel Upload
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{
            margin: '16px 28px 0 28px',
            background: 'var(--danger-light)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            color: 'var(--danger-text)',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: MULTI-CUSTOMER APPLICATION */}
        {activeTab === 'single' ? (
          <form onSubmit={handleSubmitSingle} style={{ padding: '20px 28px 24px 28px', overflowY: 'auto', flex: 1 }}>
            {/* 1. Target IPO */}
            <div style={{ marginBottom: '16px' }}>
              <label className="input-label">Select Target IPO Offering *</label>
              <select
                className="input-field"
                value={ipoId}
                onChange={(e) => setIpoId(e.target.value)}
                style={{ fontWeight: 700 }}
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

            {/* 2. Application Parameters Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label className="input-label">Category</label>
                <select
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="RETAIL">Retail (IND)</option>
                  <option value="sHNI">sHNI (2-10L)</option>
                  <option value="bHNI">bHNI (&gt;10L)</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>
              </div>

              <div>
                <label className="input-label">Lots Applied</label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={lots}
                  onChange={(e) => setLots(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  required
                  style={{ fontWeight: 700 }}
                />
              </div>

              <div>
                <label className="input-label">Total Bid (₹)</label>
                <input
                  type="number"
                  className="input-field"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  required
                  style={{ fontWeight: 700 }}
                />
              </div>
            </div>

            {/* 3. Customer Selection Multi-Picker */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label className="input-label" style={{ margin: 0 }}>
                    Select Customers
                  </label>
                  <span className="badge badge-teal" style={{ fontSize: '11px', padding: '2px 8px' }}>
                    {selectedCustomerIds.length} Selected
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {selectedCustomerIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowOnlySelected(!showOnlySelected)}
                      style={{
                        background: showOnlySelected ? 'rgba(4, 47, 46, 0.12)' : 'none',
                        border: '1px solid var(--panel-border)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        color: 'var(--text-main)',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {showOnlySelected ? 'Show All' : `Show Selected (${selectedCustomerIds.length})`}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    style={{ background: 'none', border: 'none', color: 'var(--brand-accent)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {filteredCustomers.length > 0 && filteredCustomers.every(c => selectedCustomerIds.includes(c.id))
                      ? 'Deselect Visible'
                      : `Select All Visible (${filteredCustomers.length})`}
                  </button>

                  {selectedCustomerIds.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllSelected}
                      style={{ background: 'none', border: 'none', color: 'var(--danger-text)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Search input with live count indicator */}
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="Search customer by name, PAN, bank name..."
                  className="input-field"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  style={{ paddingLeft: '32px', paddingRight: '90px', height: '38px', fontSize: '13px' }}
                />
                <span style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '11px',
                  color: 'var(--text-dim)',
                  pointerEvents: 'none'
                }}>
                  {filteredCustomers.length} of {customers.length}
                </span>
              </div>

              {/* List of customer cards */}
              <div style={{
                maxHeight: '220px',
                overflowY: 'auto',
                border: '1px solid var(--panel-border)',
                borderRadius: '14px',
                background: 'rgba(4, 47, 46, 0.02)',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
              }}>
                {loadingCustomers ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Loading customer roster...
                  </div>
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.map(c => {
                    const isSelected = selectedCustomerIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleCustomer(c.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '9px 12px',
                          borderRadius: '10px',
                          background: isSelected ? 'rgba(13, 148, 136, 0.08)' : 'var(--panel-bg)',
                          border: '1.5px solid',
                          borderColor: isSelected ? 'var(--brand-accent)' : 'var(--panel-border)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {isSelected ? (
                            <CheckSquare size={16} style={{ color: 'var(--brand-accent)' }} />
                          ) : (
                            <Square size={16} style={{ color: 'var(--text-dim)' }} />
                          )}
                          <div>
                            <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{c.full_name || c.name}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                              PAN: <code style={{ color: 'var(--text-main)', fontWeight: 600 }}>{c.pan_number || c.pan || '—'}</code>
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge badge-teal" style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                            {c.profit_share_percentage !== undefined && c.profit_share_percentage !== null ? `${c.profit_share_percentage}%` : '40%'} Share
                          </span>
                          {c.bank_name && (
                            <span style={{
                              fontSize: '11px',
                              background: 'rgba(4, 47, 46, 0.05)',
                              color: 'var(--text-muted)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: 600
                            }}>
                              {c.bank_name}
                            </span>
                          )}
                          {isSelected && (
                            <span className="badge badge-teal" style={{ fontSize: '10px', padding: '1px 6px' }}>
                              Selected
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {showOnlySelected
                      ? 'No selected customers match your filter.'
                      : 'No customers found matching search.'}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Controls */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || selectedCustomerIds.length === 0}
                style={{ padding: '10px 24px', fontSize: '14px' }}
              >
                {isSubmitting ? 'Registering Bids...' : `Apply for ${selectedCustomerIds.length} Customer(s)`}
              </button>
            </div>
          </form>
        ) : (
          /* TAB 2: BULK EXCEL UPLOAD */
          <div style={{ padding: '20px 28px 24px 28px', overflowY: 'auto', flex: 1 }}>
            {/* Target IPO for Bulk File */}
            <div style={{ marginBottom: '16px' }}>
              <label className="input-label">Select Target IPO Offering for Bulk File *</label>
              <select
                className="input-field"
                value={ipoId}
                onChange={(e) => setIpoId(e.target.value)}
                style={{ fontWeight: 700 }}
                required
              >
                <option value="">-- Choose IPO --</option>
                {ipos.map((ipo) => (
                  <option key={ipo.id} value={ipo.id}>
                    {ipo.ipo_name} ({ipo.ipo_type || 'Mainboard'})
                  </option>
                ))}
              </select>
            </div>

            {/* Download Template Banner */}
            <div style={{
              background: 'rgba(4, 47, 46, 0.03)',
              border: '1px solid var(--panel-border)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div>
                <strong style={{ color: 'var(--text-main)', fontSize: '14px', display: 'block' }}>
                  📥 Download Pre-Filled Customer Template
                </strong>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Contains customer roster pre-filled. Mark "Applied" or "Not Applied".
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDownloadTemplate}
                style={{ whiteSpace: 'nowrap', fontSize: '12.5px', padding: '6px 14px' }}
              >
                <Download size={14} /> Download Template
              </button>
            </div>

            {/* File Upload Dropzone (Watermelon file-upload-2 style) */}
            <div style={{
              border: '2px dashed var(--panel-border)',
              borderRadius: '20px',
              padding: '28px 20px',
              textAlign: 'center',
              background: 'rgba(4, 47, 46, 0.02)',
              marginBottom: '20px'
            }}>
              <UploadCloud size={38} style={{ color: 'var(--brand-accent)', margin: '0 auto 8px auto', display: 'block' }} />
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                Upload Customer Bids Excel / CSV File
              </h4>
              <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Upload the updated spreadsheet to bulk register application bids.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                Choose Excel / CSV File
              </button>

              {importStatus && (
                <div style={{ marginTop: '14px', fontSize: '13px', fontWeight: 700, color: importStatus.includes('❌') ? 'var(--danger-text)' : 'var(--success-text)' }}>
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
                style={{ padding: '10px 24px', fontSize: '14px' }}
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
