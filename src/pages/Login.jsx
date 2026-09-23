import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Clock,
  RotateCw,
  ArrowLeft,
  Moon,
  Sun,
  AlertTriangle
} from 'lucide-react';
import MarketCircuitBackground from '../components/MarketCircuitBackground';

export default function Login({ onLoginSuccess, isDark, onToggleTheme }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken') || '');
  const [verifiedEmail, setVerifiedEmail] = useState('');

  const [authError, setAuthError] = useState('');
  const [emailNotice, setEmailNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState(120);

  const otpInputRefs = useRef([]);

  const postJson = async (endpoints, body) => {
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await response.json();
        return { endpoint, response, data };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('All endpoints failed');
  };

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
    setLoading(true);

    let responseJson = null;
    try {
      const result = await postJson(['/api/auth/request-otp', '/api/v1/auth/send-otp'], {
        email: targetEmail,
        password
      });
      responseJson = result.data;
    } catch (err) {
      console.warn('API request-otp network error:', err);
      setLoading(false);
      setAuthError('Cannot reach auth API server. Ensure local backend is active on port 5000.');
      return;
    }

    const otpRequestSucceeded =
      responseJson?.status === 'success' ||
      responseJson?.email_sent === true ||
      responseJson?.otp_sent === true ||
      /sent successfully/i.test(responseJson?.message || '');

    if (!responseJson || (!otpRequestSucceeded && responseJson?.status === 'error')) {
      setLoading(false);
      setAuthError(responseJson?.message || 'Server refused login credentials.');
      return;
    }

    const loginEmail = responseJson.email || targetEmail;
    setVerifiedEmail(loginEmail);

    const deliveryMethod = responseJson.delivery_method;
    const devOtp = responseJson.otp_for_dev;
    const preview = responseJson.preview_url;

    setStep(2);
    setTimerSeconds(120);
    setOtpDigits(['', '', '', '', '', '']);

    if (!responseJson.email_sent || deliveryMethod === 'ethereal') {
      const errors = (responseJson.errors || []).join('; ');
      let noticeType = 'warn';
      let title = 'OTP generated';
      let lines = [];

      if (deliveryMethod === 'ethereal') {
        noticeType = 'info';
        title = 'Email preview mode (Dev Environment)';
        lines.push('Your OTP code was generated below:');
      } else {
        lines.push('Generated OTP code (fallback):');
        if (errors) lines.push(`Details: ${errors}`);
      }

      if (!devOtp && deliveryMethod !== 'ethereal') {
        setLoading(false);
        setAuthError(responseJson.message || 'Unable to deliver the OTP email.');
        return;
      }

      setEmailNotice({ type: noticeType, title, lines, otp: devOtp, preview });
    }

    setLoading(false);
    setTimeout(() => {
      if (otpInputRefs.current && otpInputRefs.current[0]) {
        otpInputRefs.current[0].focus();
      }
    }, 50);
  };

  const handleResendOtp = async () => {
    setStep(2);
    setAuthError('');
    setEmailNotice(null);
    setOtpDigits(['', '', '', '', '', '']);
    await handleLoginSubmit();
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
      const result = await postJson(['/api/auth/verify-otp', '/api/v1/auth/verify-otp'], {
        email: verifiedEmail || email.trim().toLowerCase(),
        otp: code
      });
      const data = result.data;

      if (data.status === 'success') {
        setLoading(false);
        const accessToken = data.data?.tokens?.accessToken || data.token || '';
        const refreshToken = data.data?.tokens?.refreshToken || data.refresh_token || '';
        const loginUser = data.data?.user || { email: verifiedEmail || email.trim().toLowerCase() };
        if (accessToken) {
          setAuthToken(accessToken);
        }
        onLoginSuccess({
          token: accessToken,
          refreshToken,
          user: loginUser,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000
        });
      } else {
        setLoading(false);
        setAuthError(data.message || 'Invalid OTP code. Please check your email.');
      }
    } catch (err) {
      console.warn('API /verify-otp error:', err);
      setLoading(false);
      setAuthError('Cannot verify OTP with server. Please try again.');
    }
  };

  const formatTimer = () => {
    const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const secs = String(timerSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const canResend = timerSeconds <= 0;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-main)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Share Market Upper & Lower Circuit Dynamic Chart Background */}
      <MarketCircuitBackground isDark={isDark} />

      {/* Theme Toggle Button in corner */}
      {onToggleTheme && (
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle Theme"
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            zIndex: 30,
            background: isDark ? 'rgba(4, 43, 40, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            border: '1px solid var(--panel-border)',
            color: 'var(--text-main)',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(4, 47, 46, 0.08)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease'
          }}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color="var(--primary)" />}
        </button>
      )}

      {/* Login Card */}
      <div style={{
        maxWidth: '460px',
        width: '100%',
        background: isDark ? 'rgba(4, 43, 40, 0.92)' : 'rgba(255, 255, 255, 0.92)',
        border: '1px solid var(--panel-border)',
        borderRadius: '32px',
        boxShadow: isDark
          ? '0 24px 64px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(20, 184, 166, 0.15)'
          : '0 24px 64px rgba(4, 47, 46, 0.10), 0 0 0 1px rgba(255, 255, 255, 0.6)',
        padding: '36px 32px',
        position: 'relative',
        zIndex: 10,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/final_logo.png"
            alt="IPO KING Logo"
            style={{
              height: '190px',
              maxHeight: '210px',
              width: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              margin: '0 auto',
              display: 'block',
              filter: 'drop-shadow(0 6px 16px rgba(0, 0, 0, 0.07))'
            }}
          />
        </div>

        {/* Error / Alert Notice */}
        {authError && (
          <div style={{
            background: 'var(--danger-light)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            color: 'var(--danger-text)',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{authError}</span>
          </div>
        )}

        {emailNotice && (
          <div style={{
            background: 'rgba(13, 148, 136, 0.08)',
            border: '1px solid rgba(13, 148, 136, 0.2)',
            color: 'var(--text-main)',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '12.5px',
            marginBottom: '20px'
          }}>
            <strong>{emailNotice.title}</strong>
            {emailNotice.otp && (
              <div style={{ marginTop: '6px', fontSize: '15px', fontWeight: 800, color: 'var(--brand-accent)' }}>
                OTP: {emailNotice.otp}
              </div>
            )}
          </div>
        )}

        {/* Step 1: Email + Password */}
        {step === 1 && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} /> Email Address
              </label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="abc@gmail.com"
                autoComplete="email"
                style={{ height: '44px' }}
              />
            </div>

            <div>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} /> Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  style={{ height: '44px', paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer'
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                height: '46px',
                width: '100%',
                fontSize: '15px',
                marginTop: '8px',
                gap: '8px'
              }}
            >
              {loading ? (
                <span>Sending Security OTP...</span>
              ) : (
                <>
                  <span>Sign In with OTP</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: 6-Digit OTP */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span className="badge badge-teal" style={{ marginBottom: '8px' }}>
                <ShieldCheck size={13} /> 2-Step Verification
              </span>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                Enter the 6-digit security code sent to <strong>{verifiedEmail || email}</strong>
              </p>
            </div>

            {/* OTP Input Grid */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onPaste={(e) => handleOtpPaste(idx, e)}
                  style={{
                    width: '46px',
                    height: '52px',
                    textAlign: 'center',
                    fontSize: '22px',
                    fontWeight: 800,
                    borderRadius: '12px',
                    border: '1.5px solid var(--input-border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', height: '46px', fontSize: '15px', marginBottom: '14px' }}
            >
              {loading ? 'Verifying OTP...' : 'Verify & Enter Dashboard'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ background: 'none', border: 'none', color: 'var(--brand-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
              >
                <ArrowLeft size={13} /> Change Email
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={!canResend}
                style={{
                  background: 'none',
                  border: 'none',
                  color: canResend ? 'var(--primary)' : 'var(--text-dim)',
                  cursor: canResend ? 'pointer' : 'not-allowed',
                  fontWeight: 600
                }}
              >
                {canResend ? 'Resend Code' : `Resend in ${formatTimer()}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
