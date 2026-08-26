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
    sampleDesc = `Flat Kostak Rate per application regardless of allotment`;
  } else if (exitMode === 'SAUDA') {
    sampleGross = Number(saudaRate) || 0;
    sampleDesc = `Flat Subject to Sauda premium only payable on allotment`;
  } else if (exitMode === 'PRE_LISTING') {
    const gain = Math.max(0, (Number(preListingPrice) || 0) - issuePrice);
    sampleGross = gain * lotSize;
    sampleDesc = `Pre-Listing gain (₹${gain}/sh) × ${lotSize} shares`;
  } else {
    const gain = Math.max(0, (Number(exchangeListingPrice) || 0) - issuePrice);
    sampleGross = gain * lotSize;
    sampleDesc = `Exchange Listing Gain (₹${gain}/sh) × ${lotSize} shares`;
  }

  // 40-60 Split + 10% TDS
  const sampleClient40 = Math.round(sampleGross * 0.40);
  const sampleAdmin60 = Math.round(sampleGross * 0.60);
  const sampleTds10 = Math.round(sampleClient40 * 0.10);
  const sampleNetPayout = Math.max(0, sampleClient40 - sampleTds10);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeIpo && !targetApplications) {
      showToast('Please select a valid IPO', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const exitParams = {
        exit_mode: exitMode,
        kostak_rate: Number(kostakRate) || 0,
        sauda_rate: Number(saudaRate) || 0,
        pre_listing_price: Number(preListingPrice) || 0,
        listing_price: Number(exchangeListingPrice) || 0,
        issue_price: issuePrice,
        lot_size: lotSize
      };

      if (targetApplications && targetApplications.length > 0) {
        const appIds = targetApplications.map((a) => a.id);
        await applyPreListingExitToApplications(appIds, exitMode, exitParams);
        showToast(`Pre-Listing Exit applied to ${targetApplications.length} application(s)!`, 'success');
      } else if (activeIpo) {
        await applyPreListingExitToIpo(activeIpo.id, exitMode, exitParams);
        showToast(`Pre-Listing Exit locked for ${activeIpo.ipo_name}!`, 'success');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error applying pre-listing exit:', err);
      showToast(`Error: ${err.message || 'Failed to apply exit'}`, 'error');
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
          borderRadius: '28px',
          padding: 0,
          overflow: 'hidden',
          background: 'var(--panel-bg)'
        }}
      >
        {/* Header (Hero-11) */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid var(--panel-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--panel-bg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(217, 119, 6, 0.12)',
              color: 'var(--warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Pre-Listing &amp; Grey Market Exit
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                {targetApplications
                  ? `Exiting ${targetApplications.length} Selected Application(s)`
                  : activeIpo
                  ? `Locking Pre-Listing Sale for ${activeIpo.ipo_name}`
                  : 'Bulk Pre-Listing Exit Engine'}
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

        {/* Body (Scrollable) */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {/* Target IPO Selector if not passed */}
          {!targetIpo && !targetApplications && (
            <div style={{ marginBottom: '18px' }}>
              <label className="input-label">Target IPO Offering</label>
              <select
                className="input-field"
                value={selectedIpoId}
                onChange={(e) => setSelectedIpoId(e.target.value)}
                style={{ fontWeight: 700 }}
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
            <label className="input-label">Choose Pre-Listing Exit Strategy</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {/* Kostak Mode */}
              <div
                onClick={() => setExitMode('KOSTAK')}
                style={{
                  padding: '12px 10px',
                  borderRadius: '14px',
                  border: '1.5px solid',
                  borderColor: exitMode === 'KOSTAK' ? 'var(--primary)' : 'var(--panel-border)',
                  background: exitMode === 'KOSTAK' ? 'rgba(4, 47, 46, 0.06)' : 'var(--panel-bg)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <Tag size={20} style={{ color: exitMode === 'KOSTAK' ? 'var(--primary)' : 'var(--text-muted)', margin: '0 auto 4px auto', display: 'block' }} />
                <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-main)' }}>Kostak Rate</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Guaranteed Flat</span>
              </div>

              {/* Subject to Sauda Mode */}
              <div
                onClick={() => setExitMode('SAUDA')}
                style={{
                  padding: '12px 10px',
                  borderRadius: '14px',
                  border: '1.5px solid',
                  borderColor: exitMode === 'SAUDA' ? 'var(--primary)' : 'var(--panel-border)',
                  background: exitMode === 'SAUDA' ? 'rgba(4, 47, 46, 0.06)' : 'var(--panel-bg)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <Handshake size={20} style={{ color: exitMode === 'SAUDA' ? 'var(--primary)' : 'var(--text-muted)', margin: '0 auto 4px auto', display: 'block' }} />
                <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-main)' }}>Sub to Sauda</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>On Allotment</span>
              </div>

              {/* Pre-Listing Fixed Price Mode */}
              <div
                onClick={() => setExitMode('PRE_LISTING')}
                style={{
                  padding: '12px 10px',
                  borderRadius: '14px',
                  border: '1.5px solid',
                  borderColor: exitMode === 'PRE_LISTING' ? 'var(--primary)' : 'var(--panel-border)',
                  background: exitMode === 'PRE_LISTING' ? 'rgba(4, 47, 46, 0.06)' : 'var(--panel-bg)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <TrendingUp size={20} style={{ color: exitMode === 'PRE_LISTING' ? 'var(--primary)' : 'var(--text-muted)', margin: '0 auto 4px auto', display: 'block' }} />
                <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-main)' }}>Pre-Listing Price</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Grey Market Rate</span>
              </div>
            </div>
          </div>

          {/* Dynamic Strategy Inputs */}
          <div style={{
            background: 'rgba(4, 47, 46, 0.02)',
            border: '1px solid var(--panel-border)',
            borderRadius: '20px',
            padding: '18px',
            marginBottom: '20px'
          }}>
            {exitMode === 'KOSTAK' && (
              <div>
                <label className="input-label">Kostak Rate per Application (₹)</label>
                <input
                  type="number"
                  className="input-field"
                  value={kostakRate}
                  onChange={(e) => setKostakRate(Number(e.target.value))}
                  placeholder="e.g. 800"
                  style={{ fontWeight: 800 }}
                  required
                />
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Customer receives fixed 40% share regardless of whether IPO gets allotted or rejected.
                </p>
              </div>
            )}

            {exitMode === 'SAUDA' && (
              <div>
                <label className="input-label">Subject to Sauda Rate per Allotted Lot (₹)</label>
                <input
                  type="number"
                  className="input-field"
                  value={saudaRate}
                  onChange={(e) => setSaudaRate(Number(e.target.value))}
                  placeholder="e.g. 12000"
                  style={{ fontWeight: 800 }}
                  required
                />
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Only applies to applications that receive full or partial allotment.
                </p>
              </div>
            )}

            {exitMode === 'PRE_LISTING' && (
              <div>
                <label className="input-label">Locked Pre-Listing / Grey Market Price (₹)</label>
                <input
                  type="number"
                  className="input-field"
                  value={preListingPrice}
                  onChange={(e) => setPreListingPrice(Number(e.target.value))}
                  placeholder="e.g. 240"
                  style={{ fontWeight: 800 }}
                  required
                />
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Locked sale price before official stock exchange ring-bell listing.
                </p>
              </div>
            )}
          </div>

          {/* Real-time Math Preview Card */}
          <div style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: '20px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Distribution Breakdown (Per Lot / Bid)
              </span>
              <span className="badge badge-teal">40% Client &bull; 60% Company</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(4, 47, 46, 0.02)', padding: '10px 6px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Gross Profit</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                  ₹ {sampleGross.toLocaleString('en-IN')}
                </strong>
              </div>

              <div style={{ background: 'rgba(4, 47, 46, 0.02)', padding: '10px 6px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Client 40%</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                  ₹ {sampleClient40.toLocaleString('en-IN')}
                </strong>
              </div>

              <div style={{ background: 'rgba(4, 47, 46, 0.02)', padding: '10px 6px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--warning)', display: 'block', fontWeight: 700 }}>10% TDS</span>
                <strong style={{ fontSize: '14px', color: 'var(--warning)' }}>
                  ₹ {sampleTds10.toLocaleString('en-IN')}
                </strong>
              </div>

              <div style={{ background: 'rgba(4, 47, 46, 0.02)', padding: '10px 6px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--success-text)', display: 'block', fontWeight: 700 }}>Net Payout</span>
                <strong style={{ fontSize: '14px', color: 'var(--success-text)' }}>
                  ₹ {sampleNetPayout.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              {sampleDesc} &bull; <strong>Company 60% Share: ₹{sampleAdmin60.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ padding: '10px 20px', fontSize: '14px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ padding: '10px 24px', fontSize: '14px' }}
            >
              <Zap size={16} />
              <span>{isSubmitting ? 'Locking Exit...' : '⚡ Lock Exit & Settle Ledger'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
