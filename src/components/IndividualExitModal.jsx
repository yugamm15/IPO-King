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
    const diff = pPrice > 0 ? (pPrice - issuePrice) : 0;
    sampleGross = isRejected ? 0 : Math.round(diff * rawQty);
  } else {
    // MARKET
    const mPrice = Number(sellPrice) || 0;
    const diff = mPrice > 0 ? (mPrice - issuePrice) : 0;
    sampleGross = isRejected ? 0 : Math.round(diff * rawQty);
  }

  const clientPct = Number(app.profit_share_percentage ?? app.customers?.profit_share_percentage ?? 40);
  const sampleClientShare = Math.round(sampleGross * (clientPct / 100));
  const sampleAdminShare = sampleGross - sampleClientShare;
  const sampleTds10 = sampleClientShare > 0 ? Math.round(sampleClientShare * 0.10) : 0;
  const sampleNetPayout = sampleClientShare > 0 ? (sampleClientShare - sampleTds10) : sampleClientShare;

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
                {app.customer_name} &bull; <strong style={{ color: 'var(--primary)' }}>{app.ipo_name}</strong> ({rawLots} Lots / {rawQty} sh) &bull; <span className="badge badge-teal" style={{ padding: '1px 6px', fontSize: '11px' }}>{clientPct}% Profit Share</span>
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {errorMsg && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'var(--danger-light)',
                color: 'var(--danger-text)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quick Context Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
              background: 'rgba(4, 47, 46, 0.02)',
              border: '1px solid var(--panel-border)',
              borderRadius: '14px',
              padding: '12px'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Applied Lots</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{rawLots} Lots ({rawQty} sh)</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Issue / Cut-off</span>
                <strong style={{ fontSize: '14px', color: 'var(--primary)' }}>₹{issuePrice}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Customer Profit Split</span>
                <strong style={{ fontSize: '14px', color: 'var(--brand-accent)' }}>{clientPct}% Client</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Current Exit Mode</span>
                <span className="badge badge-teal" style={{ marginTop: '2px', display: 'inline-block' }}>{exitMode}</span>
              </div>
            </div>

            {/* Exit Mode Selector */}
            <div>
              <label className="input-label" style={{ marginBottom: '8px' }}>Select Settlement / Exit Mode</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { mode: 'MARKET', label: 'Market Exit', desc: 'Listing Exchange Price' },
                  { mode: 'PRE_LISTING', label: 'Pre-Listing', desc: 'Off-market share sale' },
                  { mode: 'KOSTAK', label: 'Kostak', desc: 'Flat rate per lot' },
                  { mode: 'SAUDA', label: 'Subject Sauda', desc: 'Premium on allotment' }
                ].map((item) => {
                  const active = exitMode === item.mode;
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => setExitMode(item.mode)}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '12px',
                        border: '1.5px solid',
                        borderColor: active ? 'var(--brand-accent)' : 'var(--panel-border)',
                        background: active ? 'rgba(13, 148, 136, 0.08)' : 'var(--panel-bg)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <strong style={{ fontSize: '12.5px', color: active ? 'var(--brand-accent)' : 'var(--text-main)' }}>
                        {item.label}
                      </strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.desc}</span>
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

            {/* Live Financial Breakdown Card (Custom Split + 10% TDS) */}
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
                  {clientPct}% Client &bull; {Math.max(0, 100 - clientPct)}% Desk &bull; 10% TDS
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div style={{ background: 'var(--panel-bg)', padding: '10px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                    {sampleGross < 0 ? 'Realized Loss' : 'Gross Profit'}
                  </span>
                  <strong style={{ fontSize: '15px', color: sampleGross < 0 ? 'var(--danger-text)' : 'var(--text-main)' }}>
                    {sampleGross < 0 ? `-₹${Math.abs(sampleGross).toLocaleString('en-IN')}` : `₹${sampleGross.toLocaleString('en-IN')}`}
                  </strong>
                </div>

                <div style={{ background: 'var(--panel-bg)', padding: '10px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                    {sampleClientShare < 0 ? `Customer Loss (${clientPct}%)` : `Customer Share (${clientPct}%)`}
                  </span>
                  <strong style={{ fontSize: '15px', color: sampleClientShare < 0 ? 'var(--danger-text)' : 'var(--warning)' }}>
                    {sampleClientShare < 0 ? `-₹${Math.abs(sampleClientShare).toLocaleString('en-IN')}` : `₹${sampleClientShare.toLocaleString('en-IN')}`}
                  </strong>
                </div>

                <div style={{ background: 'var(--panel-bg)', padding: '10px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>10% TDS Withheld</span>
                  <strong style={{ fontSize: '15px', color: sampleTds10 > 0 ? 'var(--warning)' : 'var(--text-dim)' }}>
                    {sampleTds10 > 0 ? `₹${sampleTds10.toLocaleString('en-IN')}` : '₹0 (No TDS)'}
                  </strong>
                </div>

                <div style={{ background: 'var(--panel-bg)', padding: '10px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                    {sampleNetPayout < 0 ? 'Net Loss Settlement' : 'Net Client Payout'}
                  </span>
                  <strong style={{ fontSize: '15px', color: sampleNetPayout < 0 ? 'var(--danger-text)' : 'var(--success-text)' }}>
                    {sampleNetPayout < 0 ? `-₹${Math.abs(sampleNetPayout).toLocaleString('en-IN')}` : `₹${sampleNetPayout.toLocaleString('en-IN')}`}
                  </strong>
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
