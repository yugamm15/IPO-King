import React, { useState, useEffect } from 'react';
import { Users, FileSpreadsheet, UserPlus, Eye, Edit, ShieldCheck } from 'lucide-react';
import AddCustomerModal from '../components/AddCustomerModal';
import CustomerDetailsModal from '../components/CustomerDetailsModal';
import { supabase } from '../services/db';

export default function Customers({ onOpenExcelModal }) {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomerForDetails, setSelectedCustomerForDetails] = useState(null);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState(null);

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
            // Normalize beneficiaries
            let bName = c.beneficiary_name;
            if (c.customer_beneficiaries && c.customer_beneficiaries.length > 0) {
              bName = c.customer_beneficiaries.map((b) => b.beneficiary_name).join(', ');
            }

            // Normalize documents
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

  // Compute next auto-increment customer_no
  const maxCustomerNo = customers.reduce(
    (max, c) => Math.max(max, parseInt(c.customer_no, 10) || 0),
    0
  );
  const nextCustomerNo = maxCustomerNo + 1;

  const handleSaveCustomer = (updatedCust, isEditMode) => {
    if (isEditMode) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === updatedCust.id || (c.pan_number && c.pan_number === updatedCust.pan_number)
            ? { ...c, ...updatedCust }
            : c
        )
      );
    } else {
      setCustomers((prev) => [
        {
          id: updatedCust.id || Date.now(),
          customer_no: updatedCust.customer_no || nextCustomerNo,
          full_name: updatedCust.full_name || updatedCust.name,
          login_id: updatedCust.login_id || '—',
          mobile_number: updatedCust.mobile_number || '—',
          code: updatedCust.code || `IPO-${String(nextCustomerNo).padStart(3, '0')}`,
          password_encrypted: updatedCust.password_encrypted || '—',
          balance: updatedCust.balance || 0,
          email: updatedCust.email || '—',
          phone_alternate: updatedCust.phone_alternate || '—',
          ...updatedCust
        },
        ...prev
      ]);
    }
    setIsAddModalOpen(false);
    setSelectedCustomerForEdit(null);
  };

  return (
    <div className="tab-pane active">
      <div className="welcome-header">
        <div>
          <h2><Users size={22} /> Customer Management</h2>
        </div>
        <div className="quick-actions">
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
                <th>NAME</th>
                <th>Login ID</th>
                <th>Mobile Number</th>
                <th>CODE</th>
                <th>PASS</th>
                <th>BALANCE (₹)</th>
                <th>Email</th>
                <th>Phone Kono chhe</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length > 0 ? (
                customers.map((c, index) => (
                  <tr key={c.id || index}>
                    <td><strong>{c.full_name || c.name || '—'}</strong></td>
                    <td>{c.login_id || '—'}</td>
                    <td>{c.mobile_number || '—'}</td>
                    <td><span style={{ fontWeight: 600, color: '#2563EB' }}>{c.code || `IPO-${String(c.customer_no || index + 1).padStart(3, '0')}`}</span></td>
                    <td><span style={{ fontSize: '11px', opacity: 0.7 }}>{c.password_encrypted ? '••••••••' : '—'}</span></td>
                    <td><strong style={{ color: '#10B981' }}>₹ {Number(c.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                    <td>{c.email || '—'}</td>
                    <td>{c.phone_alternate || '—'}</td>
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
                  <td colSpan="9" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
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
