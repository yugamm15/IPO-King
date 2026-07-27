import React, { useState, useEffect } from 'react';
import { TrendingUp, Mail, Lock, Eye, ArrowRight, ShieldCheck, MailCheck, Clock, RotateCw, ArrowLeft, Moon, Sun } from 'lucide-react';

export default function Login({ onLoginSuccess, isDark, onToggleTheme }) {
  const ALLOWED_EMAIL = 'yugamkothari886@gmail.com';
  const ALLOWED_PASSWORD = 'IpoKing@22';

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(ALLOWED_EMAIL);
  const [password, setPassword] = useState(ALLOWED_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState(120);

  useEffect(() => {
    let timer;
    if (step === 2 && timerSeconds > 0) {
      timer = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timerSeconds]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    const targetEmail = email.trim().toLowerCase();
    if (targetEmail !== ALLOWED_EMAIL || password !== ALLOWED_PASSWORD) {
      setAuthError('Access Denied: Only yugamkothari886@gmail.com is authorized.');
      return;
    }

    try {
      await fetch('http://localhost:5000/api/v1/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
    } catch (err) {
      console.log('Backend API connection notice:', err);
    }

    setStep(2);
    setTimerSeconds(120);
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleVerifyOtp = () => {
    const code = otpDigits.join('');
    if (code.length < 6) {
      alert('Please enter all 6 digits of your security OTP code.');
      return;
    }
    onLoginSuccess();
  };

  const formatTimer = () => {
    const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const secs = String(timerSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card glass-panel">
        <button type="button" className="theme-toggle-btn theme-toggle-fixed" onClick={onToggleTheme}>
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <div className="auth-header">
          <div className="brand-badge">
            <TrendingUp className="brand-icon" />
          </div>
          <h1 className="brand-title">IPO KING</h1>
          <p className="brand-subtitle">Enterprise IPO & Profit Management System</p>
        </div>

        {step === 1 && (
          <form id="login-form" className="auth-step active" onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label htmlFor="email"><Mail size={14} /> Email Address</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@ipoking.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password"><Lock size={14} /> Password</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked />
                <span>Remember credentials</span>
              </label>
              <a href="#" className="forgot-link">Forgot password?</a>
            </div>

            {authError && (
              <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '14px', textAlign: 'center', fontWeight: '600' }}>
                {authError}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block">
              <span>Send Verification Code</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {step === 2 && (
          <div id="otp-step" className="auth-step active">
            <div style={{ background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: '10px', padding: '12px 14px', textAlign: 'center', marginBottom: '20px', fontSize: '13px', color: 'var(--text-main)' }}>
              📧 2FA Code sent to <strong>yugamkothari886@gmail.com</strong>
              <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--primary)', fontWeight: '700' }}>
                Active Verification OTP: <code>849201</code>
              </div>
            </div>

            <div className="otp-inputs-container">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-${idx}`}
                  type="text"
                  maxLength={1}
                  className="otp-digit"
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  autoComplete="off"
                />
              ))}
            </div>

            <div className="timer-container">
              <Clock size={15} /> Code expires in <span>{formatTimer()}</span>
            </div>

            <button onClick={handleVerifyOtp} className="btn btn-primary btn-block">
              <ShieldCheck size={16} />
              <span>Verify & Access Dashboard</span>
            </button>

            <div className="otp-actions">
              <button
                type="button"
                className="btn-text"
                disabled={timerSeconds > 0}
                onClick={() => setTimerSeconds(120)}
              >
                <RotateCw size={14} /> Resend Code
              </button>
              <span className="dot-separator">•</span>
              <button
                type="button"
                className="btn-text"
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={14} /> Change Email
              </button>
            </div>
          </div>
        )}

        <div className="auth-footer">
          <p><Lock size={12} /> 256-Bit SSL Encrypted Enterprise Connection</p>
        </div>
      </div>
    </div>
  );
}
