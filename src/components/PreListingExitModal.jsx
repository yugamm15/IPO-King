import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  TrendingUp,
  Tag,
  Handshake,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Layers,
  Percent,
  HelpCircle
} from 'lucide-react';
import { applyPreListingExitToIpo, applyPreListingExitToApplications } from '../services/db.js';
import { useToast } from '../context/ToastContext.jsx';

export default function PreListingExitModal({
  isOpen,
  onClose,
  onSuccess,
  targetIpo = null,
  targetApplications = null,
  ipos = []
}) {
  const { showToast } = useToast();

  const [selectedIpoId, setSelectedIpoId] = useState(targetIpo?.id || (ipos[0]?.id || ''));
  const [exitMode, setExitMode] = useState('KOSTAK'); // 'KOSTAK' | 'SAUDA' | 'PRE_LISTING' | 'MARKET'
  const [kostakRate, setKostakRate] = useState(800);
  const [saudaRate, setSaudaRate] = useState(12000);
  const [preListingPrice, setPreListingPrice] = useState(0);
  const [exchangeListingPrice, setExchangeListingPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive active IPO
  const activeIpo = targetIpo || ipos.find((i) => String(i.id) === String(selectedIpoId)) || null;

  useEffect(() => {
    if (targetIpo) {
      setSelectedIpoId(targetIpo.id);
      if (targetIpo.exit_mode) setExitMode(targetIpo.exit_mode);
      if (targetIpo.kostak_rate) setKostakRate(targetIpo.kostak_rate);
      if (targetIpo.sauda_rate) setSaudaRate(targetIpo.sauda_rate);
      if (targetIpo.pre_listing_price) setPreListingPrice(targetIpo.pre_listing_price);
      if (targetIpo.listing_price) setExchangeListingPrice(targetIpo.listing_price);
    } else if (activeIpo) {
      const issuePrice = Number(activeIpo.price_band_max) || Number(activeIpo.price_band_min) || 100;
      if (!preListingPrice) setPreListingPrice(Math.round(issuePrice * 1.5));
      if (!exchangeListingPrice) setExchangeListingPrice(Math.round(issuePrice * 1.5));
    }
  }, [targetIpo, activeIpo]);

  if (!isOpen) return null;

  const lotSize = Number(activeIpo?.lot_size) || 1;
  const issuePrice = Number(activeIpo?.price_band_max) || Number(activeIpo?.price_band_min) || 100;

  // Real-time Preview Calculation for 1 Standard Lot / Application
  let sampleGross = 0;
  let sampleDesc = '';

  if (exitMode === 'KOSTAK') {
    sampleGross = Number(kostakRate) || 0;
    sampleDesc = `Flat ₹${sampleGross} per application (Allotment not required)`;
  } else if (exitMode === 'SAUDA') {
    sampleGross = Number(saudaRate) || 0;
    sampleDesc = `Guaranteed ₹${sampleGross} per allotted lot (Only if allotted)`;
  } else if (exitMode === 'PRE_LISTING') {
    const gainPerShare = Math.max(0, Number(preListingPrice) - issuePrice);
    sampleGross = gainPerShare * lotSize;
    sampleDesc = `₹${gainPerShare}/sh × ${lotSize} sh = ₹${sampleGross.toLocaleString('en-IN')} (Off-Market Exit)`;
  } else {
    const gainPerShare = Math.max(0, Number(exchangeListingPrice) - issuePrice);
    sampleGross = gainPerShare * lotSize;
    sampleDesc = `₹${gainPerShare}/sh × ${lotSize} sh = ₹${sampleGross.toLocaleString('en-IN')} (Exchange Listing)`;
  }

  const sampleCust40 = Math.round(sampleGross * 0.40);
  const sampleAdmin60 = Math.round(sampleGross * 0.60);
  const sampleTds10 = Math.round(sampleCust40 * 0.10);
  const sampleNetPayout = sampleCust40 - sampleTds10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeIpo && !targetApplications) {
      showToast('Please select a target IPO', 'warning');
      return;
    }

    const exitParams = {
      kostak_rate: Number(kostakRate) || 0,
      sauda_rate: Number(saudaRate) || 0,
      pre_listing_price: Number(preListingPrice) || 0,
      listing_price: Number(exchangeListingPrice) || 0
    };

    setIsSubmitting(true);
    try {
      if (targetApplications && targetApplications.length > 0) {
        const appIds = targetApplications.map((a) => a.id);
        await applyPreListingExitToApplications(appIds, exitMode, exitParams);
        showToast(`Pre-listing exit applied to ${appIds.length} application(s)!`, 'success');
      } else if (activeIpo) {
        await applyPreListingExitToIpo(activeIpo.id, exitMode, exitParams);
        showToast(`Pre-listing exit applied to "${activeIpo.ipo_name}" & all bids!`, 'success');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(`Error setting pre-listing exit: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '640px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '20px',
          padding: '0',
          overflow: 'hidden',
          background: '#FFFFFF',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Header (Fixed) */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Zap size={22} style={{ color: '#FDE047' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'Manrope', fontWeight: 800 }}>
                Pre-Listing &amp; Grey Market Exit
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.85 }}>
                {targetApplications
                  ? `Exiting ${targetApplications.length} Selected Application(s)`
                  : activeIpo
                  ? `Locking Pre-Listing Sale for ${activeIpo.ipo_name}`
                  : 'Bulk Pre-Listing Exit Engine'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: '1 1 auto'
          }}
        >
          {/* Target IPO Selector if not passed */}
          {!targetIpo && !targetApplications && (
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                Target IPO Offering
              </label>
              <select
                className="input-field"
                value={selectedIpoId}
                onChange={(e) => setSelectedIpoId(e.target.value)}
                style={{ width: '100%', height: '42px', fontWeight: 600 }}
              >
                {ipos.map((ipo) => (
                  <option key={ipo.id} value={ipo.id}>
                    {ipo.ipo_name} (Issue: ₹{ipo.price_band_max || ipo.price_band_min || 100} • Lot: {ipo.lot_size || 1} sh)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Strategy Selection Radio Tabs */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>
              Choose Pre-Listing Exit Strategy
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {/* Kostak Mode */}
              <div
                onClick={() => setExitMode('KOSTAK')}
                style={{
                  padding: '12px 10px',
                  borderRadius: '12px',
                  border: '2px solid',
                  borderColor: exitMode === 'KOSTAK' ? 'var(--primary)' : 'var(--panel-border)',
                  background: exitMode === 'KOSTAK' ? 'rgba(37, 99, 235, 0.08)' : 'var(--input-bg)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <Tag size={20} style={{ color: exitMode === 'KOSTAK' ? 'var(--primary)' : 'var(--text-dim)', marginBottom: '4px' }} />
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: exitMode === 'KOSTAK' ? 'var(--primary)' : 'var(--text-main)' }}>
                  1. Kostak Rate
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                  Flat ₹ / application
                </span>
              </div>

              {/* Subject to Sauda Mode */}
              <div
                onClick={() => setExitMode('SAUDA')}
                style={{
                  padding: '12px 10px',
                  borderRadius: '12px',
                  border: '2px solid',
                  borderColor: exitMode === 'SAUDA' ? '#D97706' : 'var(--panel-border)',
                  background: exitMode === 'SAUDA' ? 'rgba(217, 119, 6, 0.08)' : 'var(--input-bg)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <Handshake size={20} style={{ color: exitMode === 'SAUDA' ? '#D97706' : 'var(--text-dim)', marginBottom: '4px' }} />
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: exitMode === 'SAUDA' ? '#D97706' : 'var(--text-main)' }}>
                  2. Subject to Sauda
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                  Fixed ₹ on allotment
                </span>
              </div>

              {/* Pre-Listing Bulk Price */}
              <div
                onClick={() => setExitMode('PRE_LISTING')}
                style={{
                  padding: '12px 10px',
                  borderRadius: '12px',
                  border: '2px solid',
                  borderColor: exitMode === 'PRE_LISTING' ? '#059669' : 'var(--panel-border)',
                  background: exitMode === 'PRE_LISTING' ? 'rgba(5, 150, 105, 0.08)' : 'var(--input-bg)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <TrendingUp size={20} style={{ color: exitMode === 'PRE_LISTING' ? '#059669' : 'var(--text-dim)', marginBottom: '4px' }} />
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: exitMode === 'PRE_LISTING' ? '#059669' : 'var(--text-main)' }}>
                  3. Off-Market Price
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                  Fixed ₹ / share sale
                </span>
              </div>
            </div>
          </div>

          {/* Strategy Specific Input Fields */}
          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              background: 'var(--input-bg)',
              border: '1px solid var(--panel-border)',
              marginBottom: '20px'
            }}
          >
            {exitMode === 'KOSTAK' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                  Kostak Rate per Application Form (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-dim)' }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    className="input-field"
                    style={{ paddingLeft: '30px', fontWeight: 700, fontSize: '1.05rem', width: '100%', height: '44px' }}
                    value={kostakRate}
                    onChange={(e) => setKostakRate(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 800"
                    required
                  />
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  💡 <strong>Kostak Strategy:</strong> Locks in a fixed flat profit immediately. Distributed to all applied accounts even if allotment is 0.
                </p>
              </div>
            )}

            {exitMode === 'SAUDA' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                  Subject to Sauda Rate per Allotted Lot (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-dim)' }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    className="input-field"
                    style={{ paddingLeft: '30px', fontWeight: 700, fontSize: '1.05rem', width: '100%', height: '44px' }}
                    value={saudaRate}
                    onChange={(e) => setSaudaRate(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 12000"
                    required
                  />
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  💡 <strong>Sauda Strategy:</strong> Locks guaranteed profit per lot. Only accounts that receive allotment will earn this rate.
                </p>
              </div>
            )}

            {exitMode === 'PRE_LISTING' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Off-Market Negotiated Sale Price per Share (₹)
                  </label>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Issue Price: ₹{issuePrice}</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-dim)' }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    className="input-field"
                    style={{ paddingLeft: '30px', fontWeight: 700, fontSize: '1.05rem', width: '100%', height: '44px' }}
                    value={preListingPrice}
                    onChange={(e) => setPreListingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 185"
                    required
                  />
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  💡 <strong>Bulk Exit Strategy:</strong> Sells allotted shares off-market at a fixed price per share before 10:00 AM exchange listing.
                </p>
              </div>
            )}
          </div>

          {/* Real-time Profit & TDS Distribution Engine Simulator */}
          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              background: 'rgba(37, 99, 235, 0.04)',
              border: '1px solid rgba(37, 99, 235, 0.18)',
              marginBottom: '22px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)' }}>
                Per Lot / Application Profit Split (40-60 &amp; 10% TDS)
              </span>
              <span className="pill-badge" style={{ background: '#E8F7F1', color: '#087A55', fontWeight: 700, fontSize: '0.75rem' }}>
                Automated Ledger
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
              <div style={{ background: 'var(--card-bg)', padding: '10px 6px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Gross Profit</span>
                <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)', fontFamily: 'Manrope' }}>
                  ₹ {sampleGross.toLocaleString('en-IN')}
                </strong>
              </div>

              <div style={{ background: 'var(--card-bg)', padding: '10px 6px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <span style={{ fontSize: '0.72rem', color: '#087A55', display: 'block', fontWeight: 600 }}>40% Cust Gross</span>
                <strong style={{ fontSize: '0.92rem', color: '#087A55', fontFamily: 'Manrope' }}>
                  ₹ {sampleCust40.toLocaleString('en-IN')}
                </strong>
              </div>

              <div style={{ background: 'var(--card-bg)', padding: '10px 6px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <span style={{ fontSize: '0.72rem', color: '#D97706', display: 'block', fontWeight: 600 }}>10% TDS (Tax)</span>
                <strong style={{ fontSize: '0.92rem', color: '#D97706', fontFamily: 'Manrope' }}>
                  ₹ {sampleTds10.toLocaleString('en-IN')}
                </strong>
              </div>

              <div style={{ background: 'var(--card-bg)', padding: '10px 6px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--primary)', display: 'block', fontWeight: 700 }}>Net Payout</span>
                <strong style={{ fontSize: '0.92rem', color: 'var(--primary)', fontFamily: 'Manrope' }}>
                  ₹ {sampleNetPayout.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: '10px', fontSize: '0.76rem', color: 'var(--text-dim)', textAlign: 'center' }}>
              {sampleDesc} • <strong>Company 60% Share: ₹{sampleAdmin60.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ borderRadius: '10px', padding: '10px 18px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{
                borderRadius: '10px',
                padding: '10px 22px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)'
              }}
            >
              <Zap size={16} />
              <span>{isSubmitting ? 'Locking Pre-Listing Exit...' : '⚡ Lock Exit & Settle Ledger'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
