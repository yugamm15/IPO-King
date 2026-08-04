import React, { useState, useEffect } from 'react';
import {
  Layers,
  Tag,
  Building2,
  Coins,
  Calendar,
  TrendingUp,
  ExternalLink,
  PlusCircle,
  Save,
  X,
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Clock,
  FileText,
  Zap,
  Globe
} from 'lucide-react';
import { supabase } from '../services/db.js';

export default function AddIpoModal({ isOpen, onClose, onSuccess, ipoToEdit = null }) {
  const [ipoName, setIpoName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [ipoType, setIpoType] = useState('Mainboard');
  const [priceMin, setPriceMin] = useState(100);
  const [priceMax, setPriceMax] = useState(120);
  const [lotSize, setLotSize] = useState(50);
  const [issueSize, setIssueSize] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allotmentDate, setAllotmentDate] = useState('');
  const [listingDate, setListingDate] = useState('');
  const [listingPrice, setListingPrice] = useState('');
  const [status, setStatus] = useState('open');
  const [gainEst, setGainEst] = useState('+₹150/sh Est.');
  const [allotmentUrl, setAllotmentUrl] = useState('');
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
      setStartDate(ipoToEdit.start_date || '');
      setEndDate(ipoToEdit.end_date || '');
      setAllotmentDate(ipoToEdit.allotment_date || '');
      setListingDate(ipoToEdit.listing_date || '');
      setListingPrice(ipoToEdit.listing_price || '');
      setStatus(ipoToEdit.status || 'open');
      setGainEst(ipoToEdit.gain_est || '+₹150/sh Est.');
      setAllotmentUrl(ipoToEdit.allotment_url || '');
    } else {
      setIpoName('');
      setSymbol('');
      setCompanyName('');
      setIpoType('Mainboard');
      setPriceMin(100);
      setPriceMax(120);
      setLotSize(50);
      setIssueSize('');
      setStartDate('');
      setEndDate('');
      setAllotmentDate('');
      setListingDate('');
      setListingPrice('');
      setStatus('open');
      setGainEst('+₹150/sh Est.');
      setAllotmentUrl('');
    }
  }, [ipoToEdit, isOpen]);

  if (!isOpen) return null;

  const formatDateString = (dStr) => {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) {
      return dStr;
    }
  };

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

    let datesFormatted = 'Open Now';
    if (startDate && endDate) {
      datesFormatted = `${formatDateString(startDate)} - ${formatDateString(endDate)}`;
    } else if (startDate) {
      datesFormatted = `From ${formatDateString(startDate)}`;
    }

    const payload = {
      ipo_name: ipoName.trim(),
      symbol: symbol.trim() || 'NSE / BSE',
      company_name: companyName.trim() || ipoName.trim(),
      price_band_min: minPriceNum,
      price_band_max: maxPriceNum,
      lot_size: lotSizeNum,
      open_date: startDate || null,
      close_date: endDate || null,
      subscription_open_date: datesFormatted,
      listing_date: listingDate || null,
      status: status || 'open',
      gain_est: gainEst.trim() || '+₹150/sh Est.'
    };

    try {
      let resultData;
      if (ipoToEdit && ipoToEdit.id) {
        const { data, error } = await supabase.from('ipos').update(payload).eq('id', ipoToEdit.id).select();
        if (error) throw error;
        resultData = data;
      } else {
        const { data, error } = await supabase.from('ipos').insert([payload]).select();
        if (error) throw error;
        resultData = data;
      }

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
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 99999, padding: '20px' }}>
      <div
        className="modal-content glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '920px',
          width: '92vw',
          maxHeight: '90vh',
          borderRadius: '20px',
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 25px 70px rgba(15, 23, 42, 0.28)',
          border: '1px solid var(--panel-border)',
          background: 'var(--panel-bg)',
          position: 'relative'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--panel-border)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Centered Logo Box */}
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            color: '#FFFFFF',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            padding: 0,
            boxSizing: 'border-box'
          }}>
            <Layers size={22} style={{ display: 'block', margin: '0 auto' }} />
          </div>

          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {ipoToEdit ? 'Edit IPO' : 'New IPO'}
          </h2>

          {/* Absolute Top-Right Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              position: 'absolute',
              right: '16px',
              top: '16px',
              background: 'var(--table-header-bg)',
              border: '1px solid var(--panel-border)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 0,
              boxSizing: 'border-box'
            }}
          >
            <X size={16} style={{ display: 'block', margin: '0 auto' }} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px', maxHeight: 'calc(90vh - 150px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {errorMsg && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.88rem'
              }}>
                <AlertTriangle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SECTION 1: Company & Exchange Identification */}
            <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '16px', background: 'var(--table-header-bg)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} style={{ color: 'var(--primary)' }} />
                1. Company & Stock Exchange Identification
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    IPO Title / Name *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Tag size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Swiggy Ltd IPO"
                      value={ipoName}
                      onChange={(e) => setIpoName(e.target.value)}
                      style={{ width: '100%', paddingLeft: '36px', height: '40px', fontSize: '0.88rem', fontWeight: 400, borderRadius: '8px' }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Exchange Ticker / Symbol *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FileText size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. NSE: SWIGGY | BSE: 544200"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      style={{ width: '100%', paddingLeft: '36px', height: '40px', fontSize: '0.88rem', fontWeight: 400, borderRadius: '8px' }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Board Classification *
                  </label>
                  <select
                    className="input-field"
                    value={ipoType}
                    onChange={(e) => setIpoType(e.target.value)}
                    style={{ width: '100%', height: '40px', fontSize: '0.88rem', fontWeight: 500, borderRadius: '8px' }}
                    required
                  >
                    <option value="Mainboard">Mainboard IPO (SEBI)</option>
                    <option value="SME">SME Board IPO</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Registered Corporate Name *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Swiggy India Private Limited"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    style={{ width: '100%', height: '40px', fontSize: '0.88rem', fontWeight: 400, borderRadius: '8px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Current Lifecycle Status *
                  </label>
                  <select
                    className="input-field"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ width: '100%', height: '40px', fontSize: '0.88rem', fontWeight: 500, borderRadius: '8px' }}
                    required
                  >
                    <option value="open">🟢 Open (Active Bidding)</option>
                    <option value="upcoming">🔵 Upcoming Bidding</option>
                    <option value="closed">🟠 Closed / Allotment Pending</option>
                    <option value="listed">🟣 Listed on Stock Exchange</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: Pricing & Lots */}
            <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '16px', background: 'var(--table-header-bg)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coins size={18} style={{ color: 'var(--success)' }} />
                2. Price Band & Retail Capital Engine
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr', gap: '14px', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Price Min (₹) *
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="100"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    style={{ width: '100%', height: '40px', fontSize: '0.88rem', fontWeight: 400, borderRadius: '8px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Price Max (₹) *
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="120"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    style={{ width: '100%', height: '40px', fontSize: '0.88rem', fontWeight: 400, borderRadius: '8px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Lot Size (Shares) *
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="50"
                    value={lotSize}
                    onChange={(e) => setLotSize(e.target.value)}
                    style={{ width: '100%', height: '40px', fontSize: '0.88rem', fontWeight: 400, borderRadius: '8px' }}
                    required
                  />
                </div>

                <div style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 600 }}>
                    Auto Computed 1 Lot Capital
                  </span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                    ₹ {minRetailInvestment.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: Schedules */}
            <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '16px', background: 'var(--table-header-bg)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} style={{ color: 'var(--purple)' }} />
                3. Timeline Schedule
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Subscription Start *
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: '100%', height: '40px', fontSize: '0.88rem', fontWeight: 400, borderRadius: '8px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Subscription Close *
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ width: '100%', height: '40px', fontSize: '0.88rem', fontWeight: 400, borderRadius: '8px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Allotment Date
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={allotmentDate}
                    onChange={(e) => setAllotmentDate(e.target.value)}
                    style={{ width: '100%', height: '40px', fontSize: '0.88rem', fontWeight: 400, borderRadius: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Listing Date
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={listingDate}
                    onChange={(e) => setListingDate(e.target.value)}
                    style={{ width: '100%', height: '40px', fontSize: '0.88rem', fontWeight: 400, borderRadius: '8px' }}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: GMP & Allotment Checker */}
            <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '16px', background: 'var(--table-header-bg)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} style={{ color: 'var(--warning)' }} />
                4. GMP & Registrar Checker
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    GMP / Gain Estimate
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. +₹180/sh Est."
                    value={gainEst}
                    onChange={(e) => setGainEst(e.target.value)}
                    style={{ width: '100%', height: '40px', fontSize: '0.88rem', fontWeight: 400, borderRadius: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Listing Price (₹)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 565"
                    value={listingPrice}
                    onChange={(e) => setListingPrice(e.target.value)}
                    style={{ width: '100%', height: '40px', fontSize: '0.88rem', fontWeight: 400, borderRadius: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Registrar Checker URL
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. https://ris.kfintech.com/ipostatus/"
                    value={allotmentUrl}
                    onChange={(e) => setAllotmentUrl(e.target.value)}
                    style={{ width: '100%', height: '40px', fontSize: '0.88rem', fontWeight: 400, borderRadius: '8px' }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Modal Footer Controls Bar */}
          <div style={{
            padding: '16px 24px',
            background: 'var(--panel-bg)',
            borderTop: '1px solid var(--panel-border)',
            display: 'flex',
            justify: 'flex-end',
            gap: '12px'
          }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 500 }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600 }}
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
