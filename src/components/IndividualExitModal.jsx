import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  X,
  Zap,
  Tag,
  Handshake,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { updateApplicationIndividualExit } from '../services/db.js';
import { useToast } from '../context/ToastContext.jsx';

export default function IndividualExitModal({ isOpen, app, onClose, onSuccess }) {
  const { showToast } = useToast();

  const [exitMode, setExitMode] = useState('MARKET');
  const [sellPrice, setSellPrice] = useState('');
  const [kostakRate, setKostakRate] = useState('');
  const [saudaRate, setSaudaRate] = useState('');
  const [allotmentStatus, setAllotmentStatus] = useState('Full Allotment');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (app) {
      setExitMode(app.exit_mode || 'MARKET');
      setSellPrice(app.exit_price ? String(app.exit_price) : '');
      setKostakRate(app.kostak_rate ? String(app.kostak_rate) : '');
      setSaudaRate(app.sauda_rate ? String(app.sauda_rate) : '');
      setAllotmentStatus(app.allotment_status || 'Full Allotment');
    }
  }, [app, isOpen]);

  if (!isOpen || !app) return null;

  const lotSize = Number(app.lot_size) || (app.quantity && app.lots_applied ? Math.floor(app.quantity / app.lots_applied) : 50) || 50;
  const rawLots = Number(app.lots_applied) || 1;
  const rawQty = Number(app.quantity) || (rawLots * lotSize);
  const calculatedUnit = (app.bid_amount && app.quantity) ? Math.round(Number(app.bid_amount) / Number(app.quantity)) : 0;
  const issuePrice = Number(app.price_band_max) > 0
    ? Number(app.price_band_max)
    : (Number(app.issue_price) > 0 ? Number(app.issue_price) : (calculatedUnit > 0 ? calculatedUnit : (Number(app.price_band_min) || 100)));

  // Live Calculations
  let sampleGross = 0;
  const isRejected = String(allotmentStatus).toLowerCase().includes('reject') || String(allotmentStatus).toLowerCase().includes('not');

  if (exitMode === 'KOSTAK') {
    const kRate = Number(kostakRate) || 0;
    sampleGross = Math.round(kRate * rawLots);
  } else if (exitMode === 'SAUDA') {
    const sRate = Number(saudaRate) || 0;
    sampleGross = isRejected ? 0 : Math.round(sRate * rawLots);
  } else if (exitMode === 'PRE_LISTING') {
    const pPrice = Number(sellPrice) || 0;
    const gain = Math.max(0, pPrice - issuePrice);
    sampleGross = isRejected ? 0 : Math.round(gain * rawQty);
  } else {
    // MARKET
    const mPrice = Number(sellPrice) || 0;
    const gain = Math.max(0, mPrice - issuePrice);
    sampleGross = isRejected ? 0 : Math.round(gain * rawQty);
  }

  const sampleClient40 = Math.round(sampleGross * 0.40);
  const sampleAdmin60 = Math.round(sampleGross * 0.60);
  const sampleTds10 = Math.round(sampleClient40 * 0.10);
  const sampleNetPayout = Math.max(0, sampleClient40 - sampleTds10);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await updateApplicationIndividualExit(app.id, {
        exit_price: Number(sellPrice) || 0,
        exit_mode: exitMode,
        kostak_rate: Number(kostakRate) || 0,
        sauda_rate: Number(saudaRate) || 0,
        allotment_status: allotmentStatus
      });

      showToast(`Custom Exit saved for ${app.customer_name} (${app.ipo_name})!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving individual exit:', err);
      setErrorMsg(err.message || 'Failed to save individual exit');
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
          maxWidth: '680px',
          width: '92vw',
          maxHeight: '90vh',
          borderRadius: '24px',
          padding: 0,
          overflow: 'hidden',
          background: 'var(--panel-bg)'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--panel-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--panel-bg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(217, 119, 6, 0.12)',
              color: 'var(--warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                Individual Exit / Sell Price
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                {app.customer_name} &bull; <strong style={{ color: 'var(--primary)' }}>{app.ipo_name}</strong> ({rawLots} Lots / {rawQty} sh)
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {errorMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'var(--danger-light)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                color: 'var(--danger-text)',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quick Context Card */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
              background: 'rgba(4, 47, 46, 0.03)',
              border: '1px solid var(--panel-border)',
              borderRadius: '14px',
              padding: '12px 14px'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>PAN Number</span>
                <code style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--primary)' }}>{app.pan || '—'}</code>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Bank</span>
                <strong style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>{app.bank_name || 'Bank'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Issue Cap Price</span>
                <strong style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>₹{issuePrice}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Total Shares</span>
                <strong style={{ fontSize: '12.5px', color: 'var(--brand-accent)' }}>{rawQty} shares</strong>
              </div>
            </div>

            {/* Exit Mode Selector */}
            <div>
              <label className="input-label">Select Exit Strategy</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {[
                  { id: 'MARKET', label: 'Market Listing', icon: TrendingUp, desc: 'Actual Sell Price' },
                  { id: 'KOSTAK', label: 'Kostak', icon: Tag, desc: 'Fixed / Lot' },
                  { id: 'SAUDA', label: 'Sub to Sauda', icon: Handshake, desc: 'Fixed if Allotted' },
                  { id: 'PRE_LISTING', label: 'Off-Market', icon: Zap, desc: 'Pre-Listing Price' }
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = exitMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setExitMode(mode.id)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--panel-border)',
                        background: isSelected ? 'rgba(4, 47, 46, 0.08)' : 'var(--panel-bg)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon size={18} style={{ color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }} />
                      <strong style={{ fontSize: '12px', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>{mode.label}</strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{mode.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Inputs Based on Selected Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {exitMode === 'MARKET' && (
                <div>
                  <label className="input-label">Actual Market Sell Price (₹/share) *</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder={`e.g. ${issuePrice + 120}`}
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              )}

              {exitMode === 'KOSTAK' && (
                <div>
                  <label className="input-label">Kostak Rate (₹/lot) *</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 2500"
                    value={kostakRate}
                    onChange={(e) => setKostakRate(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              )}

              {exitMode === 'SAUDA' && (
                <div>
                  <label className="input-label">Subject to Sauda Rate (₹/lot) *</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 15000"
                    value={saudaRate}
                    onChange={(e) => setSaudaRate(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              )}

              {exitMode === 'PRE_LISTING' && (
                <div>
                  <label className="input-label">Pre-Listing Off-Market Price (₹/share) *</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder={`e.g. ${issuePrice + 100}`}
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label className="input-label">Allotment Status</label>
                <select
                  className="input-field"
                  value={allotmentStatus}
                  onChange={(e) => setAllotmentStatus(e.target.value)}
                >
                  <option value="Full Allotment">Full Allotment</option>
                  <option value="Partial">Partial Allotment</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected / Not Allotted</option>
                </select>
              </div>
            </div>

            {/* Live Financial Breakdown Card (40-60 Split + 10% TDS) */}
            <div style={{
              background: 'rgba(4, 47, 46, 0.04)',
              border: '1px solid var(--panel-border)',
              borderRadius: '16px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-accent)' }}>
                  Institutional Settlement Preview
                </span>
                <span className="badge badge-teal" style={{ fontSize: '11px' }}>
                  40% Client &bull; 60% Desk &bull; 10% TDS
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div style={{ background: 'var(--panel-bg)', padding: '10px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Gross Profit</span>
                  <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>₹ {sampleGross.toLocaleString('en-IN')}</strong>
                </div>

                <div style={{ background: 'var(--panel-bg)', padding: '10px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Customer 40%</span>
                  <strong style={{ fontSize: '15px', color: 'var(--warning)' }}>₹ {sampleClient40.toLocaleString('en-IN')}</strong>
                </div>

                <div style={{ background: 'var(--panel-bg)', padding: '10px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>10% TDS Withheld</span>
                  <strong style={{ fontSize: '15px', color: 'var(--danger-text)' }}>₹ {sampleTds10.toLocaleString('en-IN')}</strong>
                </div>

                <div style={{ background: 'var(--panel-bg)', padding: '10px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Net Client Payout</span>
                  <strong style={{ fontSize: '15px', color: 'var(--success-text)' }}>₹ {sampleNetPayout.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Controls */}
          <div style={{
            padding: '14px 24px',
            background: 'var(--panel-bg)',
            borderTop: '1px solid var(--panel-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
          }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Lock Exit & Settle'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
