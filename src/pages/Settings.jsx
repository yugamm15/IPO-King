import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Plus,
  Trash2,
  Search,
  CheckCircle,
  AlertTriangle,
  X,
  Sliders,
  Percent,
  ShieldCheck,
  Save,
  RotateCcw,
  DollarSign,
  TrendingUp,
  Tag,
  Briefcase
} from 'lucide-react';
import {
  fetchBanks,
  createBank,
  deleteBank,
  getSystemSettings,
  fetchSystemSettings,
  saveSystemSettings,
  DEFAULT_SYSTEM_SETTINGS
} from '../services/db';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('financial'); // 'financial' | 'banks'

  // Settings State
  const [settings, setSettings] = useState(getSystemSettings());
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Bank Master State
  const [banks, setBanks] = useState([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newIfscPrefix, setNewIfscPrefix] = useState('');
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);

  // Toast State
  const [toastMsg, setToastMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    loadSettingsData();
    loadBanks();
  }, []);

  const loadSettingsData = async () => {
    try {
      const data = await fetchSystemSettings(true);
      if (data) setSettings(data);
    } catch (err) {
      console.error('Error loading system settings:', err);
    }
  };

  const loadBanks = async () => {
    setIsLoadingBanks(true);
    try {
      const data = await fetchBanks(true);
      setBanks(data || []);
    } catch (err) {
      console.error('Error loading banks:', err);
    } finally {
      setIsLoadingBanks(false);
    }
  };

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg({ type: '', text: '' }), 4000);
  };

  const handleSettingChange = (field, value) => {
    setSettings((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'default_customer_profit_pct') {
        const custVal = Math.min(100, Math.max(0, Number(value) || 0));
        updated.default_customer_profit_pct = custVal;
        updated.default_company_profit_pct = 100 - custVal;
      }
      return updated;
    });
  };

  const handleSaveSettings = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsSavingSettings(true);
    try {
      await saveSystemSettings(settings);
      showToast('System calculation settings saved & applied across application!');
    } catch (err) {
      console.error('Save settings error:', err);
      showToast('Failed to save settings to cloud. Saved locally.', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleResetSettings = () => {
    if (window.confirm('Reset all financial calculations and initial defaults back to factory default values?')) {
      setSettings(DEFAULT_SYSTEM_SETTINGS);
      saveSystemSettings(DEFAULT_SYSTEM_SETTINGS);
      showToast('Settings reset to system defaults.');
    }
  };

  // Bank Handlers
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

    setIsSubmittingBank(true);
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
      setIsSubmittingBank(false);
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

  return (
    <div className="page-content" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.03em' }}>
            System Settings &amp; Defaults
          </h1>
          <span className="badge badge-teal">Configuration</span>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--text-muted)' }}>
          Configure global financial sharing ratios, TDS tax deduction rates, IPO defaults, and bank master catalogs.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--panel-border)',
        paddingBottom: '8px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('financial')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'financial' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'financial' ? '#ffffff' : 'var(--text-muted)',
            transition: 'all 0.15s ease'
          }}
        >
          <Percent size={16} />
          Profit Split &amp; Financial Defaults
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('banks')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'banks' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'banks' ? '#ffffff' : 'var(--text-muted)',
            transition: 'all 0.15s ease'
          }}
        >
          <Landmark size={16} />
          Bank Master Catalog ({banks.length})
        </button>
      </div>

      {/* Alert Notification Toast */}
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

      {/* TAB 1: FINANCIAL & CALCULATION SETTINGS */}
      {activeTab === 'financial' && (
        <form onSubmit={handleSaveSettings}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>

            {/* Section 1: Profit Share Ratio Card */}
            <div className="fintech-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Percent size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                    Default Profit Sharing Ratio
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Applied to all new customers unless individually customized
                  </span>
                </div>
              </div>

              {/* Customer Profit % */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="input-label" style={{ margin: 0 }}>Customer Profit Share (%)</label>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>
                    {settings.default_customer_profit_pct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.default_customer_profit_pct}
                  onChange={(e) => handleSettingChange('default_customer_profit_pct', e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer', marginBottom: '8px' }}
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={settings.default_customer_profit_pct}
                  onChange={(e) => handleSettingChange('default_customer_profit_pct', e.target.value)}
                  className="input-field"
                  style={{ fontWeight: 700, fontSize: '14px' }}
                  required
                />
              </div>

              {/* Company Profit % (Auto calculated compliment) */}
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(4, 47, 46, 0.03)',
                border: '1px dashed var(--panel-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Company / Admin Retained Share:</span>
                  <strong style={{ fontSize: '16px', color: 'var(--text-main)', fontWeight: 800 }}>
                    {100 - (Number(settings.default_customer_profit_pct) || 40)}%
                  </strong>
                </div>
                <span className="badge badge-teal" style={{ fontSize: '11px' }}>Auto Calculated</span>
              </div>
            </div>

            {/* Section 2: TDS Tax Deduction Settings */}
            <div className="fintech-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(234, 88, 12, 0.1)', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                    TDS Deduction Configuration
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Tax Deducted at Source on Customer Gross Profit Share
                  </span>
                </div>
              </div>

              {/* Toggle Enable TDS */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(4, 47, 46, 0.02)',
                border: '1px solid var(--panel-border)',
                marginBottom: '16px'
              }}>
                <div>
                  <strong style={{ fontSize: '13.5px', color: 'var(--text-main)', display: 'block' }}>Enable TDS Deduction</strong>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Automatically deduct TDS from customer payouts</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.enable_tds_deduction)}
                    onChange={(e) => handleSettingChange('enable_tds_deduction', e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: '24px',
                    background: settings.enable_tds_deduction ? 'var(--primary)' : '#cbd5e1',
                    transition: '0.2s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: '18px',
                      width: '18px',
                      left: settings.enable_tds_deduction ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.2s'
                    }} />
                  </span>
                </label>
              </div>

              {/* TDS Rate % */}
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Default TDS Deduction Rate (%) *</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  disabled={!settings.enable_tds_deduction}
                  value={settings.default_tds_pct}
                  onChange={(e) => handleSettingChange('default_tds_pct', e.target.value)}
                  className="input-field"
                  style={{ fontWeight: 700, fontSize: '14px', opacity: settings.enable_tds_deduction ? 1 : 0.6 }}
                  required
                />
              </div>
            </div>

            {/* Section 3: Trading & Application Defaults */}
            <div className="fintech-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                    Application &amp; IPO Defaults
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Default parameters for new applications and offering biddings
                  </span>
                </div>
              </div>

              {/* Default Bid Amount */}
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Default Retail Application Bid Amount (₹) *</label>
                <input
                  type="number"
                  min="1000"
                  step="100"
                  value={settings.default_retail_bid_amount}
                  onChange={(e) => handleSettingChange('default_retail_bid_amount', e.target.value)}
                  className="input-field"
                  style={{ fontWeight: 700, fontSize: '14px' }}
                  required
                />
              </div>

              {/* Default Category */}
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">Default Application Category</label>
                <select
                  value={settings.default_category}
                  onChange={(e) => handleSettingChange('default_category', e.target.value)}
                  className="input-field"
                  style={{ fontWeight: 700 }}
                >
                  <option value="RETAIL">RETAIL (Individual ≤ ₹2 Lakh)</option>
                  <option value="sHNI">sHNI (Small HNI ₹2 Lakh - ₹10 Lakh)</option>
                  <option value="bHNI">bHNI (Big HNI &gt; ₹10 Lakh)</option>
                </select>
              </div>

              {/* Default Exit Mode */}
              <div>
                <label className="input-label">Default Settlement Exit Strategy</label>
                <select
                  value={settings.default_exit_mode}
                  onChange={(e) => handleSettingChange('default_exit_mode', e.target.value)}
                  className="input-field"
                  style={{ fontWeight: 700 }}
                >
                  <option value="MARKET">Exchange Market Listing (Standard)</option>
                  <option value="KOSTAK">Kostak Rate (Fixed Application Exit)</option>
                  <option value="SAUDA">Subject to Sauda (Allotment-Linked Exit)</option>
                  <option value="PRE_LISTING">Off-Market / Pre-Listing Sale</option>
                </select>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 24px',
            borderRadius: '16px',
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetSettings}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <RotateCcw size={15} /> Reset to Defaults
            </button>

            <button
              type="submit"
              disabled={isSavingSettings}
              className="btn btn-primary"
              style={{ padding: '12px 28px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={16} />
              {isSavingSettings ? 'Saving Settings...' : 'Save & Apply Calculation Settings'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: BANK MASTER CATALOG */}
      {activeTab === 'banks' && (
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
          {isLoadingBanks ? (
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
      )}

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
                  disabled={isSubmittingBank}
                  className="btn btn-primary"
                >
                  {isSubmittingBank ? 'Adding...' : 'Save Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
