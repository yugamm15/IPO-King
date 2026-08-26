import React, { useState, useEffect } from 'react';
import {
  Layers,
  Building2,
  TrendingUp,
  X,
  AlertTriangle,
  Save,
  Zap
} from 'lucide-react';
import { supabase, invalidateDbCache } from '../services/db.js';

export default function AddIpoModal({ isOpen, onClose, onSuccess, ipoToEdit = null }) {
  const [ipoName, setIpoName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [ipoType, setIpoType] = useState('Mainboard');
  const [priceMin, setPriceMin] = useState(100);
  const [priceMax, setPriceMax] = useState(120);
  const [lotSize, setLotSize] = useState(50);
  const [issueSize, setIssueSize] = useState('');
  const [status, setStatus] = useState('open');
  const [gainEst, setGainEst] = useState('+₹150/sh Est.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (ipoToEdit) {
      setIpoName(ipoToEdit.ipo_name || '');
      setSymbol(ipoToEdit.symbol || '');
      setCompanyName(ipoToEdit.company_name || '');
      setIpoType(ipoToEdit.ipo_type || 'Mainboard');
      setPriceMin(ipoToEdit.price_band_min || 100);
      setPriceMax(ipoToEdit.price_band_max || 120);
      setLotSize(ipoToEdit.lot_size || 50);
      setIssueSize(ipoToEdit.issue_size || '');
      setStatus(ipoToEdit.status || 'open');
      setGainEst(ipoToEdit.gain_est || '+₹150/sh Est.');
    } else {
      setIpoName('');
      setSymbol('');
      setCompanyName('');
      setIpoType('Mainboard');
      setPriceMin(100);
      setPriceMax(120);
      setLotSize(50);
      setIssueSize('');
      setStatus('open');
      setGainEst('+₹150/sh Est.');
    }
  }, [ipoToEdit, isOpen]);

  if (!isOpen) return null;

  const minPriceNum = Number(priceMin) || 0;
  const maxPriceNum = Number(priceMax) || minPriceNum;
  const lotSizeNum = Number(lotSize) || 1;
  const minRetailInvestment = maxPriceNum * lotSizeNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ipoName.trim()) {
      setErrorMsg('IPO Name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    // Format gain_est
    let formattedGainEst = gainEst ? gainEst.trim() : '';
    if (formattedGainEst && !formattedGainEst.startsWith('+') && !formattedGainEst.startsWith('Listed')) {
      formattedGainEst = `+₹${formattedGainEst}/sh Est.`;
    }

    const payload = {
      ipo_name: ipoName.trim(),
      symbol: symbol.trim().toUpperCase() || ipoName.trim().toUpperCase(),
      company_name: companyName.trim() || ipoName.trim(),
      price_band_min: minPriceNum,
      price_band_max: maxPriceNum,
      lot_size: lotSizeNum,
      status: status || 'open',
      gain_est: formattedGainEst || null
    };

    try {
      let resultData;
      if (ipoToEdit?.id) {
        const { data, error } = await supabase
          .from('ipos')
          .update(payload)
          .eq('id', ipoToEdit.id)
          .select();

        if (error) throw error;
        resultData = data?.[0] || payload;
      } else {
        const { data, error } = await supabase
          .from('ipos')
          .insert([payload])
          .select();

        if (error) throw error;
        resultData = data?.[0] || payload;
      }

      invalidateDbCache();
      if (onSuccess) onSuccess(resultData);
      onClose();
    } catch (err) {
      console.error('Error saving IPO:', err);
      setErrorMsg(err.message || 'Failed to save IPO to database.');
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
          maxWidth: '840px',
          width: '92vw',
          maxHeight: '90vh',
          borderRadius: '28px',
          padding: 0,
          overflow: 'hidden',
          background: 'var(--panel-bg)'
        }}
      >
        {/* Modal Header (Hero-11) */}
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
              background: 'rgba(4, 47, 46, 0.08)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={22} />
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                {ipoToEdit ? 'Edit IPO Parameters' : 'New IPO Offering'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Configure NSE/BSE offering parameters, price band, and lot size.
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

        {/* Form Content */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {errorMsg && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'var(--danger-light)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                color: 'var(--danger-text)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                fontWeight: 600
              }}>
                <AlertTriangle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SECTION 1: Company & Exchange Identification */}
            <div style={{
              background: 'rgba(4, 47, 46, 0.02)',
              border: '1px solid var(--panel-border)',
              borderRadius: '20px',
              padding: '20px'
            }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 800, color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={16} />
                1. Company &amp; Stock Exchange Identification
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label className="input-label">IPO Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Premier Energies Ltd"
                    value={ipoName}
                    onChange={(e) => setIpoName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="input-label">Stock Symbol / Ticker</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. PREMIERENE"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div>
                  <label className="input-label">Exchange Board / Series</label>
                  <select
                    className="input-field"
                    value={ipoType}
                    onChange={(e) => setIpoType(e.target.value)}
                  >
                    <option value="Mainboard">Mainboard (NSE / BSE)</option>
                    <option value="SME">SME Board (NSE Emerge / BSE SME)</option>
                  </select>
                </div>

                <div>
                  <label className="input-label">Offering Status</label>
                  <select
                    className="input-field"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="open">Open for Bidding</option>
                    <option value="upcoming">Upcoming Pipeline</option>
                    <option value="closed">Closed / Allotment Pending</option>
                    <option value="listed">Listed on Stock Exchanges</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: Price Band & Retail Lot Economics */}
            <div style={{
              background: 'rgba(4, 47, 46, 0.02)',
              border: '1px solid var(--panel-border)',
              borderRadius: '20px',
              padding: '20px'
            }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 800, color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} />
                2. Price Band &amp; Retail Lot Economics
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label className="input-label">Price Floor (₹)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={priceMin}
                    onChange={(e) => setPriceMin(Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <label className="input-label">Price Cap (₹)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <label className="input-label">Lot Size (Shares)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={lotSize}
                    onChange={(e) => setLotSize(Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <label className="input-label">Min Retail Investment</label>
                  <input
                    type="text"
                    className="input-field"
                    value={`₹ ${minRetailInvestment.toLocaleString('en-IN')}`}
                    readOnly
                    style={{ background: 'rgba(4, 47, 46, 0.05)', fontWeight: 800, color: 'var(--primary)' }}
                  />
                </div>

                <div>
                  <label className="input-label">Grey Market Premium (GMP)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. +₹185 (41%)"
                    value={gainEst}
                    onChange={(e) => setGainEst(e.target.value)}
                  />
                </div>

                <div>
                  <label className="input-label">Issue Size (₹ Cr)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. ₹2,830 Cr"
                    value={issueSize}
                    onChange={(e) => setIssueSize(e.target.value)}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Modal Footer Controls Bar */}
          <div style={{
            padding: '16px 28px',
            background: 'var(--panel-bg)',
            borderTop: '1px solid var(--panel-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
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
              {ipoToEdit ? <Save size={16} /> : <Zap size={16} />}
              <span>{isSubmitting ? 'Publishing...' : ipoToEdit ? 'Save Changes' : 'Publish IPO'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
