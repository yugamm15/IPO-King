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
    <div className="page-content" style={{ padding: '0' }}>

      {/* Header (Hero-11) */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.03em' }}>
            System Configuration & Bank Master
          </h1>
          <span className="badge badge-teal">Settings</span>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--text-muted)' }}>
          Manage global financial parameters, cloud database connectors, and customer banking catalogs.
        </p>
      </div>

      {toastMsg.text && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          borderRadius: '12px',
          background: toastMsg.type === 'error' ? 'var(--danger-light)' : 'var(--success-light)',
          color: toastMsg.type === 'error' ? 'var(--danger-text)' : 'var(--success-text)',
          border: `1px solid ${toastMsg.type === 'error' ? 'rgba(220, 38, 38, 0.2)' : 'rgba(5, 150, 105, 0.2)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13.5px',
          fontWeight: 600
        }}>
          {toastMsg.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Parameter Grid (Hero-11 Fintech Cards) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        <div className="fintech-card" style={{ padding: '22px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
            Financial Parameters
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="input-label">Standard TDS Tax Rate (%)</label>
              <input type="number" className="input-field" value="10.00" readOnly style={{ fontWeight: 700 }} />
            </div>
            <div>
              <label className="input-label">Customer Profit Share (%)</label>
              <input type="number" className="input-field" value="40.00" readOnly style={{ fontWeight: 700 }} />
            </div>
            <div>
              <label className="input-label">Company Treasury Share (%)</label>
              <input type="number" className="input-field" value="60.00" readOnly style={{ fontWeight: 700 }} />
            </div>
          </div>
        </div>

        <div className="fintech-card" style={{ padding: '22px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
            Active Cloud Database
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 14px 0' }}>
            Connected to <strong>Supabase Cloud PostgreSQL</strong> (Realtime Engine Active)
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '10px',
            background: 'rgba(4, 47, 46, 0.05)',
            border: '1px solid var(--panel-border)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-main)',
            marginBottom: '16px'
          }}>
            <Database size={15} style={{ color: 'var(--brand-accent)' }} /> Supabase Cloud PostgreSQL / MySQL
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--panel-border)' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Bank DDL Schema Query</span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={copySqlToClipboard}
              style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
            >
              {copiedSql ? <Check size={14} /> : <Copy size={14} />}
              {copiedSql ? 'Copied SQL' : 'Copy Bank SQL'}
            </button>
          </div>
        </div>
      </div>

      {/* Bank Master Management Section (Hero-11) */}
      <div className="fintech-card" style={{ padding: '24px' }}>
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
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(4, 47, 46, 0.06)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Landmark size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                Bank Master Catalog
              </h3>
              <span className="badge badge-teal">
                {banks.length} Banks Active
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Banks listed here appear in the Customer Creation / Edit dropdown for direct one-click selection.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search banks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '32px', height: '36px', fontSize: '13px', width: '200px' }}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsAddModalOpen(true)}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <Plus size={15} /> Add Bank
            </button>
          </div>
        </div>

        {/* Bank Grid */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
            Loading bank master records...
          </div>
        ) : filteredBanks.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '12px'
          }}>
            {filteredBanks.map((b, idx) => (
              <div
                key={b.id || idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(4, 47, 46, 0.02)',
                  border: '1px solid var(--panel-border)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'rgba(4, 47, 46, 0.08)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '11px',
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <strong style={{
                      fontSize: '13.5px',
                      color: 'var(--text-main)',
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {b.bank_name}
                    </strong>
                    {b.ifsc_prefix ? (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        IFSC: {b.ifsc_prefix}
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Verified Bank</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteBank(b)}
                  title={`Delete ${b.bank_name}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
            <Landmark size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No banks found matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Add Bank Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(4, 47, 46, 0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>Add New Bank</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddBank}>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Bank Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Bank of Maharashtra, Saraswat Bank..."
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  autoFocus
                  required
                  className="input-field"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="input-label">IFSC Prefix / Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. MAHB, SRCB..."
                  value={newIfscPrefix}
                  maxLength={11}
                  onChange={(e) => setNewIfscPrefix(e.target.value.toUpperCase())}
                  className="input-field"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
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
