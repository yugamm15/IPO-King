import React, { useState } from 'react';
import {
  Banknote,
  X,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle,
  FileDown,
  ArrowDownCircle,
  Wallet
} from 'lucide-react';
import { recordCashWithdrawal } from '../services/db.js';
import { downloadCashWithdrawalReceiptPdf } from '../utils/pdfGenerator.js';

export default function CashWithdrawalModal({
  isOpen,
  onClose,
  customer,
  onSuccess
}) {
  if (!isOpen || !customer) return null;

  const currentBalance = Number(customer.balance) || 0;
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [referenceNo, setReferenceNo] = useState(`CW-${Date.now().toString().slice(-6)}`);
  const [remarks, setRemarks] = useState('Cash payout against customer balance');
  const [downloadVoucher, setDownloadVoucher] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const withdrawAmountNum = parseFloat(amount) || 0;
  const closingBalance = Math.max(0, currentBalance - withdrawAmountNum);

  const handlePresetAmount = (presetVal) => {
    if (presetVal === 'full') {
      setAmount(String(currentBalance));
    } else {
      setAmount(String(presetVal));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!withdrawAmountNum || withdrawAmountNum <= 0) {
      setErrorMsg('Please enter a valid withdrawal amount greater than 0.');
      return;
    }

    if (withdrawAmountNum > currentBalance) {
      const confirmExceed = window.confirm(
        `Withdrawal amount (₹${withdrawAmountNum.toLocaleString('en-IN')}) exceeds the current available balance (₹${currentBalance.toLocaleString('en-IN')}). Do you wish to continue and record this cash advance?`
      );
      if (!confirmExceed) return;
    }

    setIsSubmitting(true);
    try {
      const result = await recordCashWithdrawal({
        customerId: customer.id,
        amount: withdrawAmountNum,
        paymentMode,
        referenceNo,
        remarks,
        withdrawalDate: date
      });

      if (downloadVoucher) {
        try {
          downloadCashWithdrawalReceiptPdf(customer, {
            ...result.withdrawal,
            previous_balance: currentBalance,
            new_balance: result.newBalance
          });
        } catch (pdfErr) {
          console.warn('Receipt PDF generation warning:', pdfErr);
        }
      }

      setSuccessMsg(`Cash withdrawal of ₹${withdrawAmountNum.toLocaleString('en-IN')} recorded successfully!`);

      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result.newBalance, result.withdrawal);
        }
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error processing cash withdrawal:', err);
      setErrorMsg(err.message || 'Failed to process cash withdrawal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '92vw',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '20px',
          border: '1px solid var(--panel-border)'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
            color: '#ffffff',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Banknote size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                Cash Withdrawal Payout
              </h3>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                Record cash payout &amp; adjust customer balance
              </p>
            </div>
          </div>
          <button
            type="button"
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
              cursor: 'pointer',
              color: '#ffffff'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Customer Badge Bar */}
        <div
          style={{
            background: 'rgba(15, 118, 110, 0.05)',
            borderBottom: '1px solid var(--panel-border)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div>
            <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block' }}>
              {customer.full_name || customer.name}
            </strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              PAN: <code style={{ fontWeight: 700, color: 'var(--primary)' }}>{customer.pan_number || 'N/A'}</code>
              {customer.customer_no ? ` • Customer #${customer.customer_no}` : ''}
            </span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
              Available Balance
            </span>
            <strong style={{ fontSize: '16px', color: 'var(--success-text)', fontWeight: 800 }}>
              ₹ {currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {errorMsg && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '10px 14px',
                color: '#b91c1c',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '10px',
                padding: '10px 14px',
                color: '#065f46',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}
            >
              <CheckCircle size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Amount Field */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: '6px'
              }}
            >
              Withdrawal Amount (₹) <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontWeight: 800,
                  fontSize: '16px',
                  color: 'var(--text-muted)'
                }}
              >
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="1"
                className="form-control"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  paddingLeft: '32px',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#0f766e',
                  height: '46px'
                }}
                required
                autoFocus
              />
            </div>

            {/* Quick Preset Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              {[1000, 5000, 10000, 25000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetAmount(preset)}
                  style={{
                    border: '1px solid var(--panel-border)',
                    background: 'var(--panel-bg)',
                    borderRadius: '8px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: 'var(--text-main)'
                  }}
                >
                  +₹{preset.toLocaleString('en-IN')}
                </button>
              ))}
              {currentBalance > 0 && (
                <button
                  type="button"
                  onClick={() => handlePresetAmount('full')}
                  style={{
                    border: '1px solid #0f766e',
                    background: 'rgba(15, 118, 110, 0.08)',
                    borderRadius: '8px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    color: '#0f766e'
                  }}
                >
                  Full Balance (₹{currentBalance.toLocaleString('en-IN')})
                </button>
              )}
            </div>
          </div>

          {/* Balance Preview Card */}
          {withdrawAmountNum > 0 && (
            <div
              style={{
                background: 'rgba(15, 118, 110, 0.04)',
                border: '1px dashed #0f766e',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                textAlign: 'center'
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Opening</span>
                <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                  ₹ {currentBalance.toLocaleString('en-IN')}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#b91c1c', display: 'block' }}>Cash Payout</span>
                <strong style={{ fontSize: '13px', color: '#b91c1c' }}>
                  - ₹ {withdrawAmountNum.toLocaleString('en-IN')}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--success-text)', display: 'block' }}>Closing</span>
                <strong style={{ fontSize: '13px', color: 'var(--success-text)', fontWeight: 800 }}>
                  ₹ {closingBalance.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          )}

          {/* Date & Payment Mode */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  marginBottom: '5px'
                }}
              >
                Withdrawal Date
              </label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ fontSize: '12.5px' }}
                required
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  marginBottom: '5px'
                }}
              >
                Payment Mode
              </label>
              <select
                className="form-control"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                style={{ fontSize: '12.5px' }}
              >
                <option value="Cash">Cash (Counter Payout)</option>
                <option value="Bank Transfer">Bank Transfer / NEFT</option>
                <option value="UPI">UPI Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Reference & Remarks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  marginBottom: '5px'
                }}
              >
                Receipt / Voucher Ref
              </label>
              <input
                type="text"
                className="form-control"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                style={{ fontSize: '12.5px', fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  marginBottom: '5px'
                }}
              >
                Remarks / Purpose
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. IPO profit withdrawal"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                style={{ fontSize: '12.5px' }}
              />
            </div>
          </div>

          {/* PDF Download Checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12.5px',
              color: 'var(--text-main)',
              cursor: 'pointer',
              marginBottom: '20px',
              userSelect: 'none'
            }}
          >
            <input
              type="checkbox"
              checked={downloadVoucher}
              onChange={(e) => setDownloadVoucher(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#0f766e' }}
            />
            <FileDown size={15} style={{ color: '#0f766e' }} />
            <span>Generate &amp; download official Cash Payment Voucher PDF</span>
          </label>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || withdrawAmountNum <= 0}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                background: '#0f766e',
                borderColor: '#0f766e',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Banknote size={16} />
              {isSubmitting ? 'Recording Payout...' : `Confirm Payout (₹${withdrawAmountNum.toLocaleString('en-IN')})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
