import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users,
  FileSpreadsheet,
  UserPlus,
  Eye,
  Edit,
  SlidersHorizontal,
  ChevronDown,
  FileDown,
  Search,
  Building2,
  Phone,
  Mail,
  MoreVertical,
  Trash2
} from 'lucide-react';
import AddCustomerModal from '../components/AddCustomerModal';
import CustomerDetailsModal from '../components/CustomerDetailsModal';
import Pagination from '../components/Pagination';
import ActionDropdown from '../components/ActionDropdown';
import { supabase } from '../services/db';
import { downloadCustomerPdf } from '../utils/pdfGenerator';
import { SkeletonTableRow } from '../components/SkeletonLoader';

const INITIAL_COLUMNS = [
  { id: 'customer_no', label: 'NO.', visible: true },
  { id: 'full_name', label: 'NAME', visible: true },
  { id: 'ca_number', label: 'CA NUMBER', visible: true },
  { id: 'pan_number', label: 'PAN NUMBER', visible: true },
  { id: 'dpid', label: 'DPID (DEMAT)', visible: true },
  { id: 'bank_name', label: 'BANK NAME', visible: true },
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomerForDetails, setSelectedCustomerForDetails] = useState(null);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState(null);

  // Pagination-2 State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c =>
      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
      (c.pan_number && c.pan_number.toLowerCase().includes(q)) ||
      (c.bank_name && c.bank_name.toLowerCase().includes(q)) ||
      (c.bank_account_no && c.bank_account_no.includes(q)) ||
      (c.mobile_number && c.mobile_number.includes(q)) ||
      (c.code && c.code.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  // Paginated Customers
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

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
    <div className="page-content">
      {/* Header & Quick Action Bar (Hero-11) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.03em' }}>
              Customer Registry
            </h1>
            <span className="badge badge-teal">
              {customers.length} Accounts
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--text-muted)' }}>
            Manage institutional client demat portfolios, bank coordinates, and document dossiers.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Customize Columns Button */}
          <div style={{ position: 'relative' }} ref={columnMenuRef}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
              style={{ padding: '9px 16px', gap: '8px' }}
            >
              <SlidersHorizontal size={15} style={{ color: 'var(--brand-accent)' }} />
              <span>Columns ({visibleColumnsCount}/{INITIAL_COLUMNS.length})</span>
              <ChevronDown size={14} style={{ transform: isColumnMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
            </button>

            {isColumnMenuOpen && (
              <div
                className="dropdown-menu-4-card"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  width: '300px',
                  maxHeight: '440px',
                  overflowY: 'auto',
                  padding: '14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--panel-border)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Visible Columns</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={showAllColumns} style={{ fontSize: '11px', color: 'var(--brand-accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Show All</button>
                    <span style={{ color: 'var(--panel-border)' }}>|</span>
                    <button onClick={resetDefaultColumns} style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Reset</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {columnState.map((col) => (
                    <label
                      key={col.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: col.visible ? 'rgba(4, 47, 46, 0.05)' : 'transparent',
                        fontSize: '12px',
                        fontWeight: col.visible ? 600 : 400
                      }}
                    >
                      <span style={{ color: col.visible ? 'var(--primary)' : 'var(--text-muted)' }}>{col.label}</span>
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() => toggleColumn(col.id)}
                        style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenExcelModal}
            style={{ padding: '9px 16px' }}
          >
            <FileSpreadsheet size={16} /> Bulk Import / Export
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => { setSelectedCustomerForEdit(null); setIsAddModalOpen(true); }}
            style={{ padding: '9px 18px' }}
          >
            <UserPlus size={16} /> Add Customer
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        borderRadius: '16px',
        padding: '12px 16px',
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '400px' }}>
          <Search size={17} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by customer name, PAN, bank name, phone, code..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '13.5px',
              color: 'var(--text-main)',
              width: '100%'
            }}
          />
        </div>
        <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 500 }}>
          {filteredCustomers.length} matching of {customers.length}
        </span>
      </div>

      {/* Main Table Card (Hero-11 Fintech Table) */}
      <div className="table-container">
        <table className="fintech-table">
          <thead>
            <tr>
              {isColVisible('customer_no') && <th>NO.</th>}
              {isColVisible('full_name') && <th>NAME</th>}
              {isColVisible('ca_number') && <th>CA NUMBER</th>}
              {isColVisible('pan_number') && <th>PAN NUMBER</th>}
              {isColVisible('dpid') && <th>DPID (DEMAT)</th>}
              {isColVisible('bank_name') && <th>BANK NAME</th>}
              {isColVisible('bank_account_no') && <th>BANK A/C NO.</th>}
              {isColVisible('login_id') && <th>LOGIN ID</th>}
              {isColVisible('password_encrypted') && <th>ARHAM</th>}
              {isColVisible('code') && <th>CODE</th>}
              {isColVisible('mobile_number') && <th>MOBILE NUMBER</th>}
              {isColVisible('balance') && <th>BALANCE (₹)</th>}
              {isColVisible('phone_alternate') && <th>PHONE KONO CHHE</th>}
              {isColVisible('email') && <th>EMAIL</th>}
              {isColVisible('phone_other') && <th>PHONE OTHER</th>}
              {isColVisible('return_amount') && <th>RETURN AMOUNT (₹)</th>}
              {isColVisible('tds_remarks') && <th>TDS REMARKS</th>}
              {isColVisible('beneficiary_name') && <th>BENEFICIARIES</th>}
              <th style={{ textAlign: 'center' }}>ACTIONS</th>
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
            ) : paginatedCustomers.length > 0 ? (
              paginatedCustomers.map((c, index) => (
                <tr key={c.id || index}>
                  {isColVisible('customer_no') && (
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                        {c.customer_no || (currentPage - 1) * pageSize + index + 1}
                      </span>
                    </td>
                  )}
                  {isColVisible('full_name') && (
                    <td>
                      <strong style={{ whiteSpace: 'nowrap', color: 'var(--text-main)' }}>
                        {c.full_name || c.name || '—'}
                      </strong>
                    </td>
                  )}
                  {isColVisible('ca_number') && <td><span style={{ fontSize: '12.5px' }}>{c.ca_number || '—'}</span></td>}
                  {isColVisible('pan_number') && (
                    <td>
                      <code style={{ fontWeight: 600, color: 'var(--primary)', background: 'rgba(4, 47, 46, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                        {c.pan_number || '—'}
                      </code>
                    </td>
                  )}
                  {isColVisible('dpid') && <td><span style={{ fontSize: '12px', fontFamily: 'monospace' }}>{c.dpid || '—'}</span></td>}
                  {isColVisible('bank_name') && (
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={13} style={{ color: 'var(--brand-accent)' }} />
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                          {c.bank_name || '—'}
                        </span>
                      </div>
                    </td>
                  )}
                  {isColVisible('bank_account_no') && <td><span style={{ fontSize: '12px' }}>{c.bank_account_no || '—'}</span></td>}
                  {isColVisible('login_id') && <td>{c.login_id || '—'}</td>}
                  {isColVisible('password_encrypted') && <td><span style={{ fontSize: '12px', fontWeight: 500 }}>{c.password_encrypted || 'Arham'}</span></td>}
                  {isColVisible('code') && (
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--brand-accent)' }}>
                        {c.code || `IPO-${String(c.customer_no || index + 1).padStart(3, '0')}`}
                      </span>
                    </td>
                  )}
                  {isColVisible('mobile_number') && <td>{c.mobile_number || '—'}</td>}
                  {isColVisible('balance') && (
                    <td>
                      <strong style={{ color: 'var(--success-text)', whiteSpace: 'nowrap' }}>
                        ₹ {Number(c.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </td>
                  )}
                  {isColVisible('phone_alternate') && <td>{c.phone_alternate || '—'}</td>}
                  {isColVisible('email') && <td>{c.email || '—'}</td>}
                  {isColVisible('phone_other') && <td>{c.phone_other || '—'}</td>}
                  {isColVisible('return_amount') && (
                    <td>
                      <strong style={{ color: 'var(--warning)', whiteSpace: 'nowrap' }}>
                        ₹ {Number(c.return_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </td>
                  )}
                  {isColVisible('tds_remarks') && <td><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.tds_remarks || '—'}</span></td>}
                  {isColVisible('beneficiary_name') && (
                    <td>
                      <span style={{ fontSize: '12px', maxWidth: '160px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.beneficiary_name || '—'}
                      </span>
                    </td>
                  )}
                  <td style={{ textAlign: 'center' }}>
                    {/* Watermelon Dropdown-Menu-4 for Row Actions */}
                    <ActionDropdown
                      items={[
                        {
                          icon: Eye,
                          label: 'View Dossier',
                          description: 'KYC & Demat details',
                          onClick: () => setSelectedCustomerForDetails(c)
                        },
                        {
                          icon: FileDown,
                          label: 'Download PDF',
                          description: 'Export PDF dossier',
                          onClick: async () => {
                            try {
                              await downloadCustomerPdf(c);
                            } catch (err) {
                              console.error('PDF download error:', err);
                            }
                          }
                        },
                        {
                          icon: Edit,
                          label: 'Edit Customer',
                          description: 'Update bank or credentials',
                          onClick: () => { setSelectedCustomerForEdit(c); setIsAddModalOpen(true); }
                        }
                      ]}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={visibleColumnsCount + 1} style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '16px',
                      background: 'rgba(4, 47, 46, 0.05)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Users size={28} />
                    </div>
                    <strong style={{ fontSize: '17px', color: 'var(--text-main)' }}>
                      {searchQuery ? 'No Customers Found Matching Query' : 'No Customers Registered'}
                    </strong>
                    <span style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '420px' }}>
                      {searchQuery ? 'Try clearing your search query or search by another identifier.' : 'Click "Add Customer" or "Bulk Import" to register client accounts.'}
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Watermelon Pagination-2 Component */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
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
