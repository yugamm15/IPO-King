import React, { useState, useEffect } from 'react';
import { Users, FileSpreadsheet, UserPlus, Image as ImageIcon, CheckCircle, FileText } from 'lucide-react';
import AddCustomerModal from '../components/AddCustomerModal';
import { supabase } from '../services/db';

const DEFAULT_CUSTOMERS = [
  {
    id: 1,
    customer_no: 1,
    full_name: 'Amit Kumar Patel',
    ca_number: 'AC123456',
    pan_number: 'AAAPA1234X',
    dpid: '0012345678',
    bank_account_no: '1234567890123',
    login_id: 'amit_patel_24',
    password_encrypted: '••••••••',
    code: 'IPO-001',
    mobile_number: '9876543210',
    balance: 50000,
    phone_alternate: '9876543211 (Brother)',
    email: 'amit@email.com',
    phone_other: '9876543212',
    return_amount: 1200,
    tds_remarks: '10% TDS Deducted',
    beneficiary_name: 'Priya Patel',
    kyc_status: 'Verified',
    documents: { pan_card: 'Uploaded', aadhaar_card: 'Uploaded', cheque_proof: 'Uploaded', demat_proof: 'Uploaded' }
  },
  {
    id: 2,
    customer_no: 2,
    full_name: 'Rajesh Sharma',
    ca_number: 'AC987654',
    pan_number: 'BBBPB5678Y',
    dpid: '0098765432',
    bank_account_no: '9876543210987',
    login_id: 'rajesh_sharma',
    password_encrypted: '••••••••',
    code: 'IPO-002',
    mobile_number: '9123456789',
    balance: 120000,
    phone_alternate: '9123456790 (Wife)',
    email: 'rajesh@email.com',
    phone_other: '9123456791',
    return_amount: 3500,
    tds_remarks: '10% TDS Deducted',
    beneficiary_name: 'Sonia Sharma',
    kyc_status: 'Verified',
    documents: { pan_card: 'Uploaded', aadhaar_card: 'Uploaded' }
  },
  {
    id: 3,
    customer_no: 3,
    full_name: 'Priya Verma',
    ca_number: '—',
    pan_number: 'CCCPC9012Z',
    dpid: '0034567890',
    bank_account_no: '4567890123456',
    login_id: 'priya_v',
    password_encrypted: '••••••••',
    code: 'IPO-003',
    mobile_number: '8765432109',
    balance: 35000,
    phone_alternate: '—',
    email: 'priya@email.com',
    phone_other: '—',
    return_amount: 0,
    tds_remarks: 'Pending TDS',
    beneficiary_name: 'Rohan Verma',
    kyc_status: 'Pending KYC',
    documents: {}
  }
];

export default function Customers({ onOpenExcelModal }) {
  const [customers, setCustomers] = useState(DEFAULT_CUSTOMERS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const { data, error } = await supabase.from('customers').select('*').order('id', { ascending: true });
        if (!error && data && data.length > 0) {
          setCustomers(data);
        }
      } catch (_) {
        /* fallback to default */
      }
    }
    loadCustomers();
  }, []);

  const handleCustomerAdded = (newCust) => {
    setCustomers((prev) => [
      {
        id: newCust.id || prev.length + 1,
        customer_no: newCust.customer_no || prev.length + 1,
        full_name: newCust.full_name || newCust.name,
        ca_number: newCust.ca_number || '—',
        pan_number: newCust.pan_number || 'N/A',
        dpid: newCust.dpid || '—',
        bank_account_no: newCust.bank_account_no || '—',
        login_id: newCust.login_id || '—',
        password_encrypted: newCust.password_encrypted ? '••••••••' : '—',
        code: newCust.code || `IPO-00${prev.length + 1}`,
        mobile_number: newCust.mobile_number || '—',
        balance: newCust.balance || 0,
        phone_alternate: newCust.phone_alternate || '—',
        email: newCust.email || '—',
        phone_other: newCust.phone_other || '—',
        return_amount: newCust.return_amount || 0,
        tds_remarks: newCust.tds_remarks || '—',
        beneficiary_name: newCust.beneficiary_name || '—',
        kyc_status: newCust.kyc_status || 'Verified',
        documents: newCust.documents || {}
      },
      ...prev
    ]);
  };

  return (
    <div className="tab-pane active">
      <div className="welcome-header">
        <div>
          <h2><Users size={22} /> Customers</h2>
        </div>
        <div className="quick-actions">
          <button className="btn btn-primary" onClick={onOpenExcelModal}>
            <FileSpreadsheet size={16} /> Bulk Import
          </button>
          <button className="btn btn-secondary" onClick={() => setIsAddModalOpen(true)}>
            <UserPlus size={16} /> Add Customer
          </button>
        </div>
      </div>

      <div className="card glass-panel">
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>1. NO.</th>
                <th>2. NAME</th>
                <th>3. CA</th>
                <th>4. PAN</th>
                <th>5. DPID</th>
                <th>6. Bank A/c No.</th>
                <th>7. Login ID</th>
                <th>8. PASS</th>
                <th>9. CODE</th>
                <th>10. Mobile Number</th>
                <th>11. BALANCE (₹)</th>
                <th>12. Phone Kono chhe</th>
                <th>13. email</th>
                <th>14. Phone</th>
                <th>15. RETURN (₹)</th>
                <th>16. TDS Remarks</th>
                <th>17. Beneficiary</th>
                <th>KYC Documents</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, index) => {
                const docCount = Object.keys(c.documents || {}).length;
                return (
                  <tr key={c.id || index}>
                    <td>{c.customer_no || index + 1}</td>
                    <td><strong>{c.full_name || c.name}</strong></td>
                    <td>{c.ca_number || '—'}</td>
                    <td><code>{c.pan_number}</code></td>
                    <td>{c.dpid || '—'}</td>
                    <td>{c.bank_account_no || '—'}</td>
                    <td>{c.login_id || '—'}</td>
                    <td><span style={{ fontSize: '11px', opacity: 0.7 }}>{c.password_encrypted ? '••••••••' : '—'}</span></td>
                    <td>{c.code || `IPO-00${index + 1}`}</td>
                    <td>{c.mobile_number || '—'}</td>
                    <td>₹ {Number(c.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>{c.phone_alternate || '—'}</td>
                    <td>{c.email || '—'}</td>
                    <td>{c.phone_other || '—'}</td>
                    <td>₹ {Number(c.return_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td><span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{c.tds_remarks || '—'}</span></td>
                    <td>{c.beneficiary_name || '—'}</td>
                    <td>
                      {docCount > 0 ? (
                        <span className="status-badge open" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                          <ImageIcon size={12} /> {docCount} Docs Uploaded
                        </span>
                      ) : (
                        <span className="status-badge partial" style={{ fontSize: '11px' }}>No Docs</span>
                      )}
                    </td>
                    <td><button className="btn-xs btn-outline">Edit</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <AddCustomerModal
          onClose={() => setIsAddModalOpen(false)}
          onCustomerAdded={handleCustomerAdded}
        />
      )}
    </div>
  );
}
