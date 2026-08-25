import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Database, Landmark, Plus, Trash2, Search, CheckCircle, AlertTriangle, X, Copy, Check } from 'lucide-react';
import { fetchBanks, createBank, deleteBank } from '../services/db';

export default function Settings() {
  const [banks, setBanks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newIfscPrefix, setNewIfscPrefix] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState({ type: '', text: '' });
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBanks(true);
      setBanks(data || []);
    } catch (err) {
      console.error('Error loading banks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg({ type: '', text: '' }), 4000);
  };

  const handleAddBank = async (e) => {
    e.preventDefault();
    if (!newBankName.trim()) {
      showToast('Please enter a valid bank name.', 'error');
      return;
    }

    const trimmed = newBankName.trim();
    const existing = banks.find(b => b.bank_name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      showToast(`"${trimmed}" already exists in the bank list.`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createBank(trimmed, newIfscPrefix.trim());
      setBanks(prev => [...prev.filter(b => b.bank_name.toLowerCase() !== trimmed.toLowerCase()), created].sort((a, b) => a.bank_name.localeCompare(b.bank_name)));
      setNewBankName('');
      setNewIfscPrefix('');
      setIsAddModalOpen(false);
      showToast(`Bank "${trimmed}" added successfully!`);
    } catch (err) {
      showToast(err.message || 'Failed to add bank.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBank = async (bank) => {
    if (!window.confirm(`Are you sure you want to remove "${bank.bank_name}" from the bank master list?`)) {
      return;
    }

    try {
      await deleteBank(bank.id, bank.bank_name);
      setBanks(prev => prev.filter(b => b.id !== bank.id && b.bank_name !== bank.bank_name));
      showToast(`Bank "${bank.bank_name}" removed successfully.`);
    } catch (err) {
      showToast('Failed to delete bank.', 'error');
    }
  };

  const filteredBanks = banks.filter(b =>
    (b.bank_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.ifsc_prefix || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const postgresSqlSnippet = `-- Create banks table in Supabase PostgreSQL
CREATE TABLE IF NOT EXISTS banks (
    id SERIAL PRIMARY KEY,
    bank_name VARCHAR(150) UNIQUE NOT NULL,
    ifsc_prefix VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE banks DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(postgresSqlSnippet);
    setCopiedSql(true);
    showToast('SQL Migration Query copied to clipboard!');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="tab-pane active">
      <div className="welcome-header">
        <div>
          <h2><SettingsIcon size={22} /> System Configuration & Settings</h2>
          <p>Manage system parameters, database connection, and Bank Master catalog</p>
        </div>
      </div>

      {toastMsg.text && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          borderRadius: '10px',
          background: toastMsg.type === 'error' ? '#FEE2E2' : '#DCFCE7',
          color: toastMsg.type === 'error' ? '#991B1B' : '#166534',
          border: `1px solid ${toastMsg.type === 'error' ? '#F87171' : '#86EFAC'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 600
        }}>
          {toastMsg.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Parameter Grid */}
      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="card glass-panel">
          <h3>System Parameters</h3>
          <div className="calc-group margin-top">
            <label>Standard TDS Tax Rate (%)</label>
            <input type="number" value="10.00" readOnly />
          </div>
          <div className="calc-group">
            <label>Customer Profit Share (%)</label>
            <input type="number" value="40.00" readOnly />
          </div>
          <div className="calc-group">
            <label>Company Profit Share (%)</label>
            <input type="number" value="60.00" readOnly />
          </div>
        </div>

        <div className="card glass-panel">
          <h3>Active Database Connection</h3>
          <p className="cell-sub margin-top">Connected to <strong>Supabase Cloud PostgreSQL</strong> (Free Tier)</p>
          <div className="db-pill margin-top">
            <Database size={14} /> Database: Supabase PostgreSQL / MySQL
          </div>
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Database Migration SQL</span>
            <button
              onClick={copySqlToClipboard}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#EFF6FF',
                color: '#2563EB',
                border: '1px solid #BFDBFE',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {copiedSql ? <Check size={14} /> : <Copy size={14} />}
              {copiedSql ? 'Copied SQL' : 'Copy Bank SQL'}
            </button>
          </div>
        </div>
      </div>

      {/* Bank Master Management Section */}
      <div className="card glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: '#EFF6FF', color: '#2563EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Landmark size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                Bank Master Catalog
              </h3>
              <span style={{
                background: '#F1F5F9',
                color: '#475569',
                padding: '2px 10px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 700
              }}>
                {banks.length} Banks Active
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
              Banks listed here appear in the Customer Creation / Edit dropdown for direct one-click selection.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search banks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '7px 10px 7px 30px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  width: '200px',
                  background: '#F8FAFC'
                }}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setIsAddModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#2563EB',
                color: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <Plus size={16} /> Add Bank
            </button>
          </div>
        </div>

        {/* Bank Grid */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
            Loading banks master...
          </div>
        ) : filteredBanks.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '12px'
          }}>
            {filteredBanks.map((b, idx) => (
              <div
                key={b.id || idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '6px',
                    background: '#EEF2FF', color: '#4F46E5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '11px', flexShrink: 0
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <strong style={{
                      fontSize: '13px',
                      color: '#0F172A',
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {b.bank_name}
                    </strong>
                    {b.ifsc_prefix ? (
                      <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                        IFSC: {b.ifsc_prefix}
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>Verified Bank</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteBank(b)}
                  title={`Delete ${b.bank_name}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: '#64748B' }}>
            <Landmark size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No banks found matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Add Bank Modal */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px'
        }} onClick={() => setIsAddModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            maxWidth: '480px', width: '100%', borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)', border: '1px solid #E2E8F0',
            background: '#FFFFFF', color: '#0F172A', padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Add New Bank</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748B' }}>&times;</button>
            </div>

            <form onSubmit={handleAddBank}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                  Bank Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bank of Maharashtra, Saraswat Bank..."
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '8px',
                    border: '1px solid #CBD5E1', fontSize: '13px', background: '#F8FAFC'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                  IFSC Prefix / Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. MAHB, SRCB..."
                  value={newIfscPrefix}
                  maxLength={11}
                  onChange={(e) => setNewIfscPrefix(e.target.value.toUpperCase())}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '8px',
                    border: '1px solid #CBD5E1', fontSize: '13px', background: '#F8FAFC',
                    textTransform: 'uppercase'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1',
                    background: '#FFFFFF', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 20px', borderRadius: '8px', border: 'none',
                    background: '#2563EB', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer', fontSize: '13px'
                  }}
                >
                  {isSubmitting ? 'Adding...' : 'Save Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

