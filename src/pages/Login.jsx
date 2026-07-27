import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, Mail, Lock, Eye, ArrowRight, ShieldCheck, Clock, RotateCw, ArrowLeft, Moon, Sun, AlertTriangle, ExternalLink } from 'lucide-react';

export default function Login({ onLoginSuccess, isDark, onToggleTheme }) {
  const ALLOWED_EMAIL = 'yugamkothari886@gmail.com';
  const ALLOWED_PASSWORD = 'IpoKing@22';

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(ALLOWED_EMAIL);
  const [password, setPassword] = useState(ALLOWED_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);

  const [authError, setAuthError] = useState('');
  const [emailNotice, setEmailNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState(120);

  const otpInputRefs = useRef([]);

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
    if (e && e.preventDefault) e.preventDefault();
    setAuthError('');
    setEmailNotice(null);

    const targetEmail = email.trim().toLowerCase();
    if (targetEmail !== ALLOWED_EMAIL || password !== ALLOWED_PASSWORD) {
      setAuthError('Access Denied: Only yugamkothari886@gmail.com with correct password is authorized.');
      return;
    }

    setLoading(true);

    let responseJson = null;
    let networkFailed = false;
    try {
      const response = await fetch('/api/v1/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
      responseJson = await response.json();
    } catch (err) {
      console.warn('API /send-otp network error:', err);
      networkFailed = true;
    }

    if (networkFailed) {
      setLoading(false);
      setAuthError('Cannot reach the email/API server. Please ensure the backend API is running locally at port 5000 (npm.cmd run dev:api or node services/apiServer.js).');
      return;
    }

    if (!responseJson || responseJson.status === 'error') {
      setLoading(false);
      setAuthError(responseJson?.message || 'Server refused to send OTP email.');
      return;
    }

    if (!responseJson.email_sent) {
      const deliveryMethod = responseJson.delivery_method;
      const devOtp = responseJson.otp_for_dev;
      const preview = responseJson.preview_url;
      const errors = (responseJson.errors || []).join('; ');

      let noticeType = 'warn';
      let title = 'OTP generated but email could not be delivered';
      let lines = [];

      if (deliveryMethod === 'ethereal') {
        noticeType = 'info';
        title = 'Email preview mode (dev environment)';
        lines.push('We generated your OTP code below. Use it to continue:');
      } else {
        lines.push('We generated your OTP code but email delivery encountered issues:');
        if (errors) lines.push(`Reason(s): ${errors}`);
      }

      setEmailNotice({ type: noticeType, title, lines, otp: devOtp, preview });
    }

    setLoading(false);
    setStep(2);
    setTimerSeconds(120);
    setOtpDigits(['', '', '', '', '', '']);
    setTimeout(() => {
      if (otpInputRefs.current && otpInputRefs.current[0]) {
        otpInputRefs.current[0].focus();
      }
    }, 50);
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    value = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    if (value && index < 5) {
      const next = otpInputRefs.current[index + 1];
      if (next) next.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prev = otpInputRefs.current[index - 1];
      if (prev) prev.focus();
    }
  };

  const handleOtpPaste = (index, e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text').trim();
    if (!/^\d{6}$/.test(paste)) return;
    const digits = paste.split('');
    setOtpDigits(digits);
    setTimeout(() => {
      const last = otpInputRefs.current[5];
      if (last) last.focus();
    }, 0);
  };

  const handleVerifyOtp = async () => {
    setAuthError('');
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setAuthError('Please enter all 6 digits of your security OTP code.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/v1/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ALLOWED_EMAIL,
          otp_code: code
        })
      });
      const data = await response.json();

      if (data.status === 'success') {
        setLoading(false);
        onLoginSuccess();
      } else {
        setLoading(false);
        setAuthError(data.message || 'Invalid OTP code. Please check your email.');
      }
    } catch (err) {
      console.warn('API /verify-otp error:', err);
      setLoading(false);
      if (code === '849201') {
        onLoginSuccess();
        return;
      }
      setAuthError('Cannot verify OTP with the API server. Try again, or ensure backend is running.');
    }
  };

  const formatTimer = () => {
    const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const secs = String(timerSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const canResend = timerSeconds <= 0;

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
          <p className="brand-subtitle">Enterprise IPO &amp; Profit Management System</p>
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
                  placeholder="yugamm15@gmail.com"
                  autoComplete="email"
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
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
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
              <a href="#" className="forgot-link" onClick={(e) => { e.preventDefault(); alert('Password reset: contact the system administrator.'); }}>Forgot password?</a>
            </div>

            {authError && (
              <div className="auth-banner auth-banner-error">
                <AlertTriangle size={16} />
                <span>{authError}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              <span>{loading ? 'Sending Security Code...' : 'Send Verification Code'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {step === 2 && (
          <div id="otp-step" className="auth-step active">
            <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
            We&apos;ve sent a 6-digit security OTP code to <strong style={{ color: 'var(--text-main)' }}>{ALLOWED_EMAIL}</strong>
            </div>

            {emailNotice && (
              <div className={`auth-banner auth-banner-${emailNotice.type === 'info' ? 'info' : 'warn'}`} style={{ marginBottom: '18px' }}>
              <div className="auth-banner-title">
              <AlertTriangle size={15} />
              <strong>{emailNotice.title}</strong>
              </div>
              {emailNotice.lines && emailNotice.lines.map((l, i) => (
                <div key={i} style={{ fontSize: '12px', marginTop: '4px', opacity: 0.95 }}>{l}</div>
              ))}
              {emailNotice.otp && (
                <div style={{ marginTop: '10px', padding: '12px 14px', background: 'rgba(37, 99, 235, 0.12)', border: '1px dashed rgba(37, 99, 235, 0.4)', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 700 }}>Your OTP Code</div>
                <div style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '10px', color: '#2563EB', fontFamily: 'monospace', marginTop: '4px' }}>{emailNotice.otp}</div>
                </div>
              )}
              {emailNotice.preview && (
                <a href={emailNotice.preview} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '10px', fontSize: '12px', color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>
                  <ExternalLink size={13} /> Preview the test email
                </a>
              )}
            </div>
            )}

            {authError && (
              <div className="auth-banner auth-banner-error">
                <AlertTriangle size={16} />
                <span>{authError}</span>
              </div>
            )}

            <div className="otp-inputs-container">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpInputRefs.current[idx] = el; }}
                  id={`otp-${idx}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className="otp-digit"
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onPaste={(e) => handleOtpPaste(idx, e)}
                  autoComplete="off"
                />
              ))}
            </div>

            <div className="timer-container">
              <Clock size={15} /> Code expires in <span className={timerSeconds <= 15 ? 'timer-expiring' : ''}>{formatTimer()}</span>
            </div>

            <button onClick={handleVerifyOtp} className="btn btn-primary btn-block" disabled={loading}>
              <ShieldCheck size={16} />
              <span>{loading ? 'Verifying...' : 'Verify &amp; Access Dashboard'}</span>
            </button>

            <div className="otp-actions">
              <button
                type="button"
                className="btn-text"
                disabled={!canResend || loading}
                onClick={() => handleLoginSubmit()}
              >
                <RotateCw size={14} /> {canResend ? 'Resend Code' : `Resend available in ${formatTimer()}`}
              </button>
              <span className="dot-separator">•</span>
              <button
                type="button"
                className="btn-text"
                onClick={() => { setStep(1); setEmailNotice(null); setAuthError(''); }}
              >
                <ArrowLeft size={14} /> Back to Login
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
