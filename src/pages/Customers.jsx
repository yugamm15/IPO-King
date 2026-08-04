import React, { useState, useEffect, useRef } from 'react';
import { Users, FileSpreadsheet, UserPlus, Eye, Edit, ShieldCheck, SlidersHorizontal, ChevronDown, Check, RefreshCw, FileDown } from 'lucide-react';
import AddCustomerModal from '../components/AddCustomerModal';
import CustomerDetailsModal from '../components/CustomerDetailsModal';
import { supabase } from '../services/db';
import { downloadCustomerPdf } from '../utils/pdfGenerator';
import { SkeletonTableRow } from '../components/SkeletonLoader';


const INITIAL_COLUMNS = [
  { id: 'customer_no', label: 'NO.', visible: true },
  { id: 'full_name', label: 'NAME', visible: true },
  { id: 'ca_number', label: 'CA NUMBER', visible: true },
  { id: 'pan_number', label: 'PAN NUMBER', visible: true },
  { id: 'dpid', label: 'DPID (DEMAT)', visible: true },
  { id: 'bank_account_no', label: 'BANK A/C NO.', visible: true },
  { id: 'login_id', label: 'LOGIN ID', visible: true },
  { id: 'password_encrypted', label: 'ARHAM', visible: true },
  { id: 'code', label: 'CODE', visible: true },
  { id: 'mobile_number', label: 'MOBILE NUMBER', visible: true },
  { id: 'balance', label: 'BALANCE (₹)', visible: true },
  { id: 'phone_alternate', label: 'PHONE KONO CHHE', visible: true },
  { id: 'email', label: 'EMAIL', visible: true },
  { id: 'phone_other', label: 'PHONE OTHER', visible: true },
  { id: 'return_amount', label: 'RETURN AMOUNT (₹)', visible: true },
  { id: 'tds_remarks', label: 'TDS REMARKS', visible: true },
  { id: 'beneficiary_name', label: 'BENEFICIARIES', visible: true }
];

export default function Customers({ onOpenExcelModal }) {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomerForDetails, setSelectedCustomerForDetails] = useState(null);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState(null);

  // Column Visibility State & Persistence
  const [columnState, setColumnState] = useState(() => {
    try {
      const saved = localStorage.getItem('customer_table_columns_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        return INITIAL_COLUMNS.map(col => ({
          ...col,
          visible: parsed[col.id] !== undefined ? Boolean(parsed[col.id]) : col.visible
        }));
      }
    } catch (_) {}
    return INITIAL_COLUMNS;
  });

  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
        setIsColumnMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadCustomers() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select(`
            *,
            customer_beneficiaries (*),
            customer_documents (*)
          `)
          .order('id', { ascending: false });

        if (!error && data) {
          const normalized = data.map((c) => {
            let bName = c.beneficiary_name;
            if (c.customer_beneficiaries && c.customer_beneficiaries.length > 0) {
              bName = c.customer_beneficiaries.map((b) => b.beneficiary_name).join(', ');
            }

            let docs = c.documents;
            if (!docs && c.customer_documents && c.customer_documents.length > 0) {
              docs = {};
              c.customer_documents.forEach((d) => {
                docs[d.document_type || 'doc'] = d.file_path;
              });
            }
            if (!docs && c.address && typeof c.address === 'string' && c.address.startsWith('{')) {
              try { docs = JSON.parse(c.address); } catch (_) {}
            }

            return {
              ...c,
              beneficiary_name: bName,
              documents: docs || {}
            };
          });

          setCustomers(normalized);
        }
      } catch (err) {
        console.error('Failed to load customers:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCustomers();
  }, []);

  const toggleColumn = (colId) => {
    setColumnState((prev) => {
      const updated = prev.map((col) =>
        col.id === colId ? { ...col, visible: !col.visible } : col
      );
      try {
        const savedMap = updated.reduce((acc, col) => {
          acc[col.id] = col.visible;
          return acc;
        }, {});
        localStorage.setItem('customer_table_columns_v2', JSON.stringify(savedMap));
      } catch (_) {}
      return updated;
    });
  };

  const showAllColumns = () => {
    const updated = INITIAL_COLUMNS.map((col) => ({ ...col, visible: true }));
    setColumnState(updated);
    try {
      const savedMap = updated.reduce((acc, col) => { acc[col.id] = true; return acc; }, {});
      localStorage.setItem('customer_table_columns_v2', JSON.stringify(savedMap));
    } catch (_) {}
  };

  const resetDefaultColumns = () => {
    setColumnState(INITIAL_COLUMNS);
    try {
      localStorage.removeItem('customer_table_columns_v2');
    } catch (_) {}
  };

  const isColVisible = (id) => {
    const found = columnState.find((c) => c.id === id);
    return found ? found.visible : true;
  };

  const visibleColumnsCount = columnState.filter((c) => c.visible).length;

  const maxCustomerNo = customers.reduce(
    (max, c) => Math.max(max, parseInt(c.customer_no, 10) || 0),
    0
  );
  const nextCustomerNo = maxCustomerNo + 1;

  const handleSaveCustomer = async (updatedCust, isEditMode) => {
    setCustomers((prev) => {
      if (isEditMode) {
        const matchIndex = prev.findIndex(
          (c) =>
            (c.id && updatedCust.id && String(c.id) === String(updatedCust.id)) ||
            (c.pan_number && updatedCust.pan_number && c.pan_number === updatedCust.pan_number) ||
            (c.customer_no && updatedCust.customer_no && String(c.customer_no) === String(updatedCust.customer_no))
        );
        if (matchIndex !== -1) {
          const copy = [...prev];
          copy[matchIndex] = { ...copy[matchIndex], ...updatedCust };
          return copy;
        }
      }
      return [
        {
          id: updatedCust.id || Date.now(),
          customer_no: updatedCust.customer_no || nextCustomerNo,
          full_name: updatedCust.full_name || updatedCust.name,
          login_id: updatedCust.login_id || '—',
          mobile_number: updatedCust.mobile_number || '—',
          code: updatedCust.code || `IPO-${String(nextCustomerNo).padStart(3, '0')}`,
          password_encrypted: updatedCust.password_encrypted || 'Arham',
          balance: updatedCust.balance || 0,
          email: updatedCust.email || '—',
          phone_alternate: updatedCust.phone_alternate || '—',
          ...updatedCust
        },
        ...prev
      ];
    });

    setIsAddModalOpen(false);
    setSelectedCustomerForEdit(null);

    // Background re-fetch from database to ensure 100% sync
    try {
      const { data } = await supabase
        .from('customers')
        .select(`*, customer_beneficiaries (*), customer_documents (*)`)
        .order('id', { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((c) => {
          let bName = c.beneficiary_name;
          if (c.customer_beneficiaries && c.customer_beneficiaries.length > 0) {
            bName = c.customer_beneficiaries.map((b) => b.beneficiary_name).join(', ');
          }
          let docs = c.documents;
          if (!docs && c.customer_documents && c.customer_documents.length > 0) {
            docs = {};
            c.customer_documents.forEach((d) => { docs[d.document_type || 'doc'] = d.file_path; });
          }
          if (!docs && c.address && typeof c.address === 'string' && c.address.startsWith('{')) {
            try { docs = JSON.parse(c.address); } catch (_) {}
          }
          return { ...c, beneficiary_name: bName, documents: docs || {} };
        });
        setCustomers(normalized);
      }
    } catch (_) {}
  };

  return (
    <div className="tab-pane active">
      <div className="welcome-header">
        <div>
          <h2><Users size={22} /> Customer Management</h2>
        </div>
        <div className="quick-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

          {/* Customize Columns Dropdown Button */}
          <div style={{ position: 'relative' }} ref={columnMenuRef}>
            <button
              className="btn btn-outline"
              onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#FFFFFF', border: '1px solid #CBD5E1',
                color: '#0F172A', padding: '8px 14px', borderRadius: '8px',
                cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <SlidersHorizontal size={15} style={{ color: '#2563EB' }} />
              <span>Columns ({visibleColumnsCount}/{INITIAL_COLUMNS.length})</span>
              <ChevronDown size={14} style={{ transform: isColumnMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#64748B' }} />
            </button>

            {isColumnMenuOpen && (
              <div
                style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                  width: '300px', maxHeight: '440px', overflowY: 'auto',
                  background: '#FFFFFF', border: '1px solid #E2E8F0',
                  borderRadius: '12px', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.18)',
                  zIndex: 99999, padding: '14px', color: '#0F172A'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Customize Columns</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={showAllColumns} style={{ fontSize: '11px', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Show All</button>
                    <span style={{ color: '#CBD5E1' }}>|</span>
                    <button onClick={resetDefaultColumns} style={{ fontSize: '11px', color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Reset</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {columnState.map((col) => (
                    <label
                      key={col.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '7px 10px', borderRadius: '8px', cursor: 'pointer',
                        background: col.visible ? '#F0F9FF' : '#F8FAFC',
                        border: col.visible ? '1px solid #BAE6FD' : '1px solid #F1F5F9',
                        fontSize: '12px', fontWeight: col.visible ? 600 : 400,
                        transition: 'all 0.15s'
                      }}
                    >
                      <span style={{ color: col.visible ? '#0369A1' : '#64748B' }}>{col.label}</span>
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() => toggleColumn(col.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#2563EB' }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button className="btn btn-primary" onClick={onOpenExcelModal}>
            <FileSpreadsheet size={16} /> Bulk Import / Export
          </button>
          <button className="btn btn-secondary" onClick={() => { setSelectedCustomerForEdit(null); setIsAddModalOpen(true); }}>
            <UserPlus size={16} /> Add Customer
          </button>
        </div>
      </div>

      <div className="card glass-panel">
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                {isColVisible('customer_no') && <th style={{ whiteSpace: 'nowrap' }}>NO.</th>}
                {isColVisible('full_name') && <th style={{ whiteSpace: 'nowrap' }}>NAME</th>}
                {isColVisible('ca_number') && <th style={{ whiteSpace: 'nowrap' }}>CA NUMBER</th>}
                {isColVisible('pan_number') && <th style={{ whiteSpace: 'nowrap' }}>PAN NUMBER</th>}
                {isColVisible('dpid') && <th style={{ whiteSpace: 'nowrap' }}>DPID (DEMAT)</th>}
                {isColVisible('bank_account_no') && <th style={{ whiteSpace: 'nowrap' }}>BANK A/C NO.</th>}
                {isColVisible('login_id') && <th style={{ whiteSpace: 'nowrap' }}>LOGIN ID</th>}
                {isColVisible('password_encrypted') && <th style={{ whiteSpace: 'nowrap' }}>ARHAM</th>}
                {isColVisible('code') && <th style={{ whiteSpace: 'nowrap' }}>CODE</th>}
                {isColVisible('mobile_number') && <th style={{ whiteSpace: 'nowrap' }}>MOBILE NUMBER</th>}
                {isColVisible('balance') && <th style={{ whiteSpace: 'nowrap' }}>BALANCE (₹)</th>}
                {isColVisible('phone_alternate') && <th style={{ whiteSpace: 'nowrap' }}>PHONE KONO CHHE</th>}
                {isColVisible('email') && <th style={{ whiteSpace: 'nowrap' }}>EMAIL</th>}
                {isColVisible('phone_other') && <th style={{ whiteSpace: 'nowrap' }}>PHONE OTHER</th>}
                {isColVisible('return_amount') && <th style={{ whiteSpace: 'nowrap' }}>RETURN AMOUNT (₹)</th>}
                {isColVisible('tds_remarks') && <th style={{ whiteSpace: 'nowrap' }}>TDS REMARKS</th>}
                {isColVisible('beneficiary_name') && <th style={{ whiteSpace: 'nowrap' }}>BENEFICIARIES</th>}
                <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  <SkeletonTableRow columns={visibleColumnsCount + 1} />
                  <SkeletonTableRow columns={visibleColumnsCount + 1} />
                  <SkeletonTableRow columns={visibleColumnsCount + 1} />
                  <SkeletonTableRow columns={visibleColumnsCount + 1} />
                  <SkeletonTableRow columns={visibleColumnsCount + 1} />
                </>
              ) : customers.length > 0 ? (
                customers.map((c, index) => (
                  <tr key={c.id || index}>
                    {isColVisible('customer_no') && <td><span style={{ fontWeight: 600, color: '#64748B' }}>{c.customer_no || index + 1}</span></td>}
                    {isColVisible('full_name') && <td><strong style={{ whiteSpace: 'nowrap' }}>{c.full_name || c.name || '—'}</strong></td>}
                    {isColVisible('ca_number') && <td><span style={{ fontSize: '12px' }}>{c.ca_number || '—'}</span></td>}
                    {isColVisible('pan_number') && <td><code style={{ fontWeight: 600 }}>{c.pan_number || '—'}</code></td>}
                    {isColVisible('dpid') && <td><span style={{ fontSize: '12px', fontFamily: 'monospace' }}>{c.dpid || '—'}</span></td>}
                    {isColVisible('bank_account_no') && <td><span style={{ fontSize: '12px' }}>{c.bank_account_no || '—'}</span></td>}
                    {isColVisible('login_id') && <td>{c.login_id || '—'}</td>}
                    {isColVisible('password_encrypted') && <td><span style={{ fontSize: '12px', fontWeight: 500 }}>{c.password_encrypted || 'Arham'}</span></td>}
                    {isColVisible('code') && <td><span style={{ fontWeight: 600, color: '#2563EB' }}>{c.code || `IPO-${String(c.customer_no || index + 1).padStart(3, '0')}`}</span></td>}
                    {isColVisible('mobile_number') && <td>{c.mobile_number || '—'}</td>}
                    {isColVisible('balance') && <td><strong style={{ color: '#10B981', whiteSpace: 'nowrap' }}>₹ {Number(c.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>}
                    {isColVisible('phone_alternate') && <td>{c.phone_alternate || '—'}</td>}
                    {isColVisible('email') && <td>{c.email || '—'}</td>}
                    {isColVisible('phone_other') && <td>{c.phone_other || '—'}</td>}
                    {isColVisible('return_amount') && <td><strong style={{ color: '#F59E0B', whiteSpace: 'nowrap' }}>₹ {Number(c.return_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>}
                    {isColVisible('tds_remarks') && <td><span style={{ fontSize: '12px', color: '#64748B' }}>{c.tds_remarks || '—'}</span></td>}
                    {isColVisible('beneficiary_name') && <td><span style={{ fontSize: '12px', maxWidth: '160px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.beneficiary_name || '—'}</span></td>}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn-xs btn-outline"
                          onClick={() => setSelectedCustomerForDetails(c)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(37, 99, 235, 0.08)', color: '#2563EB', borderColor: 'rgba(37, 99, 235, 0.3)' }}
                        >
                          <Eye size={12} /> Details
                        </button>
                        <button
                          className="btn-xs btn-outline"
                          onClick={async () => {
                            try {
                              await downloadCustomerPdf(c);
                            } catch (err) {
                              console.error('PDF download error:', err);
                            }
                          }}
                          title="Download All Document Images as PDF"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.08)', color: '#059669', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                        >
                          <FileDown size={12} /> PDF
                        </button>
                        <button
                          className="btn-xs btn-outline"
                          onClick={() => { setSelectedCustomerForEdit(c); setIsAddModalOpen(true); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Edit size={12} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleColumnsCount + 1} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <Users size={36} style={{ opacity: 0.4, color: '#2563EB' }} />
                      <strong style={{ fontSize: '16px', color: 'var(--text-main)' }}>No Customers Registered</strong>
                      <span style={{ fontSize: '13px', color: 'var(--text-dim)', maxWidth: '400px' }}>
                        No records in your database yet. Click "Add Customer" or "Bulk Import" to populate customer records live.
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isAddModalOpen && (
        <AddCustomerModal
          onClose={() => { setIsAddModalOpen(false); setSelectedCustomerForEdit(null); }}
          onCustomerAdded={handleSaveCustomer}
          nextCustomerNo={nextCustomerNo}
          initialData={selectedCustomerForEdit}
        />
      )}

      {/* View Customer Details Modal */}
      {selectedCustomerForDetails && (
        <CustomerDetailsModal
          customer={selectedCustomerForDetails}
          onClose={() => setSelectedCustomerForDetails(null)}
          onEdit={(cust) => {
            setSelectedCustomerForDetails(null);
            setSelectedCustomerForEdit(cust);
            setIsAddModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
