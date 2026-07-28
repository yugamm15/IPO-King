import React, { useState } from 'react';
import { Layers, PlusCircle, X, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/db.js';

export default function AddIpoModal({ isOpen, onClose, onSuccess }) {
  const [ipoName, setIpoName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [priceMin, setPriceMin] = useState(100);
  const [priceMax, setPriceMax] = useState(120);
  const [lotSize, setLotSize] = useState(50);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('open');
  const [gainEst, setGainEst] = useState('+₹150/sh Est.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const formatDateString = (dStr) => {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch (_) {
      return dStr;
    }
  };

  const handleStartDateChange = (e) => {
    const val = e.target.value;
    setStartDate(val);
    if (endDate && val && val > endDate) {
      setEndDate('');
    }
  };

  const handleEndDateChange = (e) => {
    const val = e.target.value;
    if (startDate && val && val < startDate) {
      return;
    }
    setEndDate(val);
  };

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

    const newIpo = {
      ipo_name: ipoName.trim(),
      symbol: symbol.trim() || 'NSE / BSE',
      price_band_min: Number(priceMin) || 0,
      price_band_max: Number(priceMax) || 0,
      lot_size: Number(lotSize) || 0,
      subscription_open_date: datesFormatted,
      status,
      gain_est: gainEst.trim() || '+₹150/sh Est.'
    };

    try {
      const { data, error } = await supabase.from('ipos').insert([newIpo]).select();
      if (error) {
        if (error.message && error.message.includes('schema cache')) {
          throw new Error('Table "ipos" not found in Supabase. Please run the SQL schema script in your Supabase SQL Editor to create the table.');
        }
        throw error;
      }

      // Reset form
      setIpoName('');
      setSymbol('');
      setPriceMin(100);
      setPriceMax(120);
      setLotSize(50);
      setStartDate('');
      setEndDate('');
      setStatus('open');
      setGainEst('+₹150/sh Est.');

      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err) {
      console.error('Error adding IPO:', err);
      setErrorMsg(err.message || 'Failed to save IPO to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="email-modal-card glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="email-modal-header">
          <div className="email-meta">
            <Layers size={20} className="brand-icon" />
            <div>
              <h3>Add New IPO to Database</h3>
              <p>Create & publish new IPO listing to live market catalog</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {errorMsg && (
            <div className="auth-banner auth-banner-error" style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Database Error</strong>
                <p style={{ margin: '4px 0 0', fontSize: '12px' }}>{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>IPO Name *</label>
            <input
              type="text"
              placeholder="e.g. Swiggy Private Ltd"
              value={ipoName}
              onChange={(e) => setIpoName(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Symbol / Exchange</label>
              <input
                type="text"
                placeholder="e.g. NSE: SWIGGY"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
              >
                <option value="open">Open Now</option>
                <option value="upcoming">Upcoming</option>
                <option value="listed">Listed</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Price Min (₹)</label>
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
              />
            </div>

            <div className="form-group">
              <label>Price Max (₹)</label>
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
              />
            </div>

            <div className="form-group">
              <label>Lot Size (Shares)</label>
              <input
                type="number"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Subscription Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
              />
            </div>

            <div className="form-group">
              <label>Subscription End Date</label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={handleEndDateChange}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Estimated Profit / Gain (GMP)</label>
            <input
              type="text"
              placeholder="e.g. +₹180/sh Est. or +50% Gain"
              value={gainEst}
              onChange={(e) => setGainEst(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Expected grey market premium / listing profit preview shown to investors.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <PlusCircle size={16} /> {isSubmitting ? 'Saving...' : 'Add IPO to Database'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
