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

app.use(cors({
  origin: true,
  credentials: true
}));

// Production Security Headers Middleware (CSP, HSTS, X-Frame, MIME, Referrer)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.resend.com https://api.resend.com http://localhost:5000; frame-ancestors 'none';");
  next();
});

// JSON Payload Size Limit (500kb to mitigate DoS / buffer overflow vectors)
app.use(express.json({ limit: '500kb' }));

app.set('trust proxy', true);

// ==============================================================================
// RATE LIMITING & BRUTE FORCE PROTECTION STATE
// ==============================================================================
const MAX_OTP_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15-minute temporary lockout
const OTP_REQUEST_COOLDOWN_MS = 60 * 1000;  // 60-second cooldown between OTP requests for the same email
const MAX_OTP_REQUESTS_PER_WINDOW = 5;      // Max 5 OTP requests per 10 minutes per email
const OTP_REQUEST_WINDOW_MS = 10 * 60 * 1000;
const MAX_IP_VERIFICATIONS_PER_WINDOW = 25; // Max 25 verification calls per 10 minutes per IP
const VERIFY_WINDOW_MS = 10 * 60 * 1000;
const GLOBAL_API_RATE_LIMIT = 120;          // Max 120 requests per minute per IP
const GLOBAL_WINDOW_MS = 60 * 1000;

const otpStore = new Map();         // email -> { hashedOtpCode, hashedDecoyOtpCode, expiresAt, attempts, role }
const lockoutStore = new Map();     // identifier -> { lockedUntil, reason, lockedAt }
const otpRequestStore = new Map();  // email -> [ timestamps ]
const ipRequestStore = new Map();   // ip -> [ timestamps ]
const ipVerifyStore = new Map();    // ip -> [ timestamps ]
const globalApiStore = new Map();   // ip -> [ timestamps ]
const lastOtpTimeStore = new Map(); // email -> timestamp

function getClientIp(req) {
  const forwarded = req?.headers ? req.headers['x-forwarded-for'] : null;
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req?.ip || req?.socket?.remoteAddress || '127.0.0.1';
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '***';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const masked = name.length > 2 ? `${name[0]}***${name.slice(-1)}` : `${name[0]}***`;
  return `${masked}@${parts[1]}`;
}

function isLockedOut(identifier) {
  if (!identifier) return null;
  const key = String(identifier).toLowerCase().trim();
  const record = lockoutStore.get(key);
  if (!record) return null;

  const now = Date.now();
  if (now < record.lockedUntil) {
    const remainingMs = record.lockedUntil - now;
    const remainingMins = Math.ceil(remainingMs / (60 * 1000));
    const remainingSecs = Math.ceil(remainingMs / 1000);
    return {
      isLocked: true,
      remainingMs,
      remainingMins,
      remainingSecs,
      reason: record.reason
    };
  }

  lockoutStore.delete(key);
  return null;
}

function applyLockout(identifier, reason = 'Too many failed verification attempts') {
  if (!identifier) return;
  const key = String(identifier).toLowerCase().trim();
  const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  lockoutStore.set(key, { lockedUntil, reason, lockedAt: Date.now() });
  console.warn(`[SECURITY LOCKOUT] 🚫 Locked out: ${key} for 15 mins. Reason: ${reason}`);
}

function clearLockout(identifier) {
  if (!identifier) return;
  const key = String(identifier).toLowerCase().trim();
  lockoutStore.delete(key);
}

function checkSlidingRateLimit(store, key, maxLimit, windowMs) {
  const now = Date.now();
  const history = (store.get(key) || []).filter(ts => now - ts < windowMs);
  if (history.length >= maxLimit) {
    const oldest = history[0];
    const retryAfterSecs = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    store.set(key, history);
    return { allowed: false, retryAfterSecs };
  }
  history.push(now);
  store.set(key, history);
  return { allowed: true };
}

function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const strA = a.trim();
  const strB = b.trim();
  if (strA.length !== strB.length || strA.length === 0) return false;
  const bufA = Buffer.from(strA);
  const bufB = Buffer.from(strB);
  try {
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (_) {
    return false;
  }
}

// General API Rate Limiting Middleware
app.use('/api', (req, res, next) => {
  const ip = getClientIp(req);
  const check = checkSlidingRateLimit(globalApiStore, ip, GLOBAL_API_RATE_LIMIT, GLOBAL_WINDOW_MS);
  if (!check.allowed) {
    return res.status(429).json({
      status: 'error',
      message: `Too many requests from this IP. Please wait ${check.retryAfterSecs} seconds.`
    });
  }
  next();
});

// Periodic cleanup of expired stores (runs every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of lockoutStore.entries()) {
    if (now >= v.lockedUntil) lockoutStore.delete(k);
  }
  for (const [k, arr] of otpRequestStore.entries()) {
    const filtered = arr.filter(ts => now - ts < OTP_REQUEST_WINDOW_MS);
    if (filtered.length === 0) otpRequestStore.delete(k);
    else otpRequestStore.set(k, filtered);
  }
  for (const [k, arr] of ipRequestStore.entries()) {
    const filtered = arr.filter(ts => now - ts < OTP_REQUEST_WINDOW_MS);
    if (filtered.length === 0) ipRequestStore.delete(k);
    else ipRequestStore.set(k, filtered);
  }
  for (const [k, arr] of ipVerifyStore.entries()) {
    const filtered = arr.filter(ts => now - ts < VERIFY_WINDOW_MS);
    if (filtered.length === 0) ipVerifyStore.delete(k);
    else ipVerifyStore.set(k, filtered);
  }
  for (const [k, arr] of globalApiStore.entries()) {
    const filtered = arr.filter(ts => now - ts < GLOBAL_WINDOW_MS);
    if (filtered.length === 0) globalApiStore.delete(k);
    else globalApiStore.set(k, filtered);
  }
  for (const [k, v] of otpStore.entries()) {
    if (now > v.expiresAt) otpStore.delete(k);
  }
}, 5 * 60 * 1000).unref();

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
const supabaseKey = getEnvValue('SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY') || 'sb_publishable_-tWiLxohizYZLb3Ckz5t1w_TU1iIYGZ';
const supabase = createClient(supabaseUrl, supabaseKey);

function hashOtpCode(otpCode, email) {
  const secret = getJwtSecret();
  return crypto.createHmac('sha256', secret).update(`${String(email).toLowerCase().trim()}:${String(otpCode).trim()}`).digest('hex');
}

async function saveOtp(email, realOtpCode, decoyOtpCode, expiresAt, role = 'admin') {
  const normalizedEmail = String(email).toLowerCase().trim();
  const hashedReal = hashOtpCode(realOtpCode, normalizedEmail);
  const hashedDecoy = hashOtpCode(decoyOtpCode, normalizedEmail);

  otpStore.set(normalizedEmail, {
    hashedOtpCode: hashedReal,
    hashedDecoyOtpCode: hashedDecoy,
    expiresAt,
    attempts: 0,
    role
  });

  try {
    const { error } = await supabase.from('otp_verifications').upsert({
      email: normalizedEmail,
      real_otp: hashedReal,
      decoy_otp: hashedDecoy,
      expires_at: expiresAt,
      attempts: 0,
      role: role,
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' });

    if (!error) {
      console.log(`[DB OTP] ✅ Stored salted OTP hash in Supabase for ${maskEmail(normalizedEmail)} (Max attempts: ${MAX_OTP_ATTEMPTS})`);
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
        hashedOtpCode: data.real_otp,
        hashedDecoyOtpCode: data.decoy_otp,
        expiresAt: Number(data.expires_at),
        attempts: Number(data.attempts) || 0,
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
  const nextAttempts = (Number(currentAttempts) || 0) + 1;

  const stored = otpStore.get(normalizedEmail);
  if (stored) stored.attempts = nextAttempts;

  try {
    await supabase
      .from('otp_verifications')
      .update({ attempts: nextAttempts, updated_at: new Date().toISOString() })
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

let _runtimeEphemeralSecret = null;

function getJwtSecret() {
  const secret = getEnvValue('JWT_SECRET');
  if (secret && secret.trim().length >= 16) return secret.trim();

  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    if (!_runtimeEphemeralSecret) {
      _runtimeEphemeralSecret = crypto.randomBytes(32).toString('hex');
      console.warn('[SECURITY WARNING] JWT_SECRET is not configured in production environment! Using an ephemeral 256-bit crypto secret. Configure JWT_SECRET in environment variables to persist sessions across server restarts.');
    }
    return _runtimeEphemeralSecret;
  }

  // Development environment fallback with unique crypto seed
  if (!_runtimeEphemeralSecret) {
    _runtimeEphemeralSecret = crypto.randomBytes(32).toString('hex');
  }
  return _runtimeEphemeralSecret;
}

function createAuthToken(email, role = 'admin') {
  const secret = getJwtSecret();
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
  const email = getEnvValue('AUTH_ADMIN_EMAIL', 'LOGIN_EMAIL');
  const password = getEnvValue('AUTH_ADMIN_PASSWORD', 'LOGIN_PASSWORD');

  if (email && password) {
    return { email: email.trim(), password: String(password).trim() };
  }

  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    console.error('[CRITICAL SECURITY NOTICE] AUTH_ADMIN_EMAIL or AUTH_ADMIN_PASSWORD is not set in production environment variables! Admin login is restricted until credentials are set.');
    return {
      email: email ? email.trim() : null,
      password: null
    };
  }

  // Local development fallback only
  console.warn('[DEV NOTICE] Using development admin credentials. Ensure AUTH_ADMIN_EMAIL and AUTH_ADMIN_PASSWORD are set before production deployment.');
  return {
    email: email || 'yugamkothari886@gmail.com',
    password: password || 'IpoKing@22'
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
  const secret = getJwtSecret();
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

function extractCookie(req, name) {
  const header = req.headers?.cookie || '';
  const match = header.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function setRefreshTokenCookie(res, refreshToken) {
  try {
    const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
    const cookieParts = [
      `ipoking_refresh_token=${encodeURIComponent(refreshToken)}`,
      'HttpOnly',
      'Path=/api',
      'SameSite=Strict',
      `Max-Age=${7 * 24 * 60 * 60}`
    ];
    if (isProd) {
      cookieParts.push('Secure');
    }
    res.setHeader('Set-Cookie', cookieParts.join('; '));
  } catch (_) {}
}

function clearRefreshTokenCookie(res) {
  try {
    res.setHeader('Set-Cookie', 'ipoking_refresh_token=; HttpOnly; Path=/api; SameSite=Strict; Max-Age=0');
  } catch (_) {}
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
    getJwtSecret()
  );

  return { accessToken, refreshToken };
}

async function requestOtpHandler(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return fail(res, 'Email and password are required.', 400);
  }

  const loginEmail = String(email).trim().toLowerCase();
  const clientIp = getClientIp(req);

  // 1. Check if email or IP is currently locked out
  const emailLockout = isLockedOut(loginEmail);
  if (emailLockout) {
    return fail(res, `Account is temporarily locked due to excessive failed attempts. Please wait ${emailLockout.remainingMins} minute(s) before requesting a new code.`, 429);
  }

  const ipLockout = isLockedOut(clientIp);
  if (ipLockout) {
    return fail(res, `Your IP address is temporarily locked due to security policy. Please wait ${ipLockout.remainingMins} minute(s) before trying again.`, 429);
  }

  // 2. Enforce 60-second cooldown between consecutive OTP requests for the same email
  const lastRequestedAt = lastOtpTimeStore.get(loginEmail);
  const now = Date.now();
  if (lastRequestedAt && now - lastRequestedAt < OTP_REQUEST_COOLDOWN_MS) {
    const waitSecs = Math.max(1, Math.ceil((OTP_REQUEST_COOLDOWN_MS - (now - lastRequestedAt)) / 1000));
    return fail(res, `Please wait ${waitSecs} second${waitSecs === 1 ? '' : 's'} before requesting a new OTP code.`, 429);
  }

  // 3. Sliding-window rate limiting (Max 5 requests per 10 mins per email, Max 15 per IP)
  const emailRate = checkSlidingRateLimit(otpRequestStore, loginEmail, MAX_OTP_REQUESTS_PER_WINDOW, OTP_REQUEST_WINDOW_MS);
  if (!emailRate.allowed) {
    return fail(res, `Too many OTP requests for this email. Please wait ${Math.ceil(emailRate.retryAfterSecs / 60)} minute(s) before requesting another code.`, 429);
  }

  const ipRate = checkSlidingRateLimit(ipRequestStore, clientIp, 15, OTP_REQUEST_WINDOW_MS);
  if (!ipRate.allowed) {
    return fail(res, `Too many OTP requests from this IP address. Please wait ${Math.ceil(ipRate.retryAfterSecs / 60)} minute(s) before trying again.`, 429);
  }

  let authenticatedUser = null;

  // 4. Supabase Auth credential verification
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: String(password)
    });

    if (!authError && authData && authData.user) {
      authenticatedUser = {
        id: authData.user.id,
        email: authData.user.email,
        full_name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || 'IPO KING User',
        role: authData.user.user_metadata?.role || 'admin'
      };
    }
  } catch (err) {
    console.warn('[Supabase Auth] signInWithPassword error:', err.message);
  }

  // 5. Fallback admin bootstrap credentials
  if (!authenticatedUser) {
    const creds = getLoginCredentials();
    if (creds.email && creds.password && loginEmail === creds.email.toLowerCase() && String(password) === creds.password) {
      authenticatedUser = {
        email: creds.email,
        role: 'admin',
        full_name: getAdminName()
      };
    }
  }

  if (!authenticatedUser) {
    return fail(res, 'Invalid email or password. Please check your credentials.', 401);
  }

  // Record timestamp of valid OTP request for cooldown
  lastOtpTimeStore.set(loginEmail, Date.now());

  const realOtpCode = generateOtpCode();
  const decoyOtpCode = generateDecoyOtpCode(realOtpCode);
  const expiresAt = Date.now() + 10 * 60 * 1000;

  // Save fresh OTP with attempts = 0
  await saveOtp(loginEmail, realOtpCode, decoyOtpCode, expiresAt, authenticatedUser.role || 'admin');

  console.log(`[API /request-otp] Generated & dispatching 2FA OTP for: ${maskEmail(loginEmail)}`);

  let emailResult;
  try {
    emailResult = await send2FAOTPEmail(loginEmail, realOtpCode, {
      userName: authenticatedUser.full_name || getAdminName(),
      decoyOtpCode
    });
  } catch (err) {
    console.error(`[API /request-otp] send2FAOTPEmail error: ${err.message}`);
    emailResult = {
      success: false,
      note: `Exception in email sender for: ${maskEmail(loginEmail)}`
    };
  }

  // Pure security response: NEVER leak OTP or preview URLs in client response
  return ok(res, {
    message: emailResult.success
      ? 'Security 2FA OTP code sent to your registered email.'
      : 'Security OTP dispatched. Please check your inbox.',
    email: loginEmail,
    email_sent: !!emailResult.success,
    delivery_method: emailResult.method || null,
    otp_sent: true
  });
}

async function verifyOtpHandler(req, res) {
  const { email, otp, otp_code } = req.body || {};
  if (!email || (!otp && !otp_code)) {
    return fail(res, 'Email and OTP are required.', 400);
  }

  const key = String(email).trim().toLowerCase();
  const clientIp = getClientIp(req);

  // 1. Check if email or IP is currently locked out
  const emailLockout = isLockedOut(key);
  if (emailLockout) {
    return fail(res, `Account is temporarily locked due to excessive failed attempts. Please wait ${emailLockout.remainingMins} minute(s) before trying again.`, 429);
  }

  const ipLockout = isLockedOut(clientIp);
  if (ipLockout) {
    return fail(res, `Your IP address is temporarily locked due to security policy. Please wait ${ipLockout.remainingMins} minute(s) before trying again.`, 429);
  }

  // 2. IP rate limiting on verification endpoint (Max 25 verification calls per 10 mins)
  const ipRate = checkSlidingRateLimit(ipVerifyStore, clientIp, MAX_IP_VERIFICATIONS_PER_WINDOW, VERIFY_WINDOW_MS);
  if (!ipRate.allowed) {
    return fail(res, `Too many verification requests from this IP address. Please wait ${Math.ceil(ipRate.retryAfterSecs / 60)} minute(s).`, 429);
  }

  // 3. Retrieve stored OTP
  const stored = await getOtp(key);
  if (!stored) {
    return fail(res, 'No active OTP found for this email. Please request a new code.', 400);
  }

  // 4. CRITICAL BRUTE FORCE CHECK: If stored attempts already reached or exceeded MAX_OTP_ATTEMPTS (5)
  if ((Number(stored.attempts) || 0) >= MAX_OTP_ATTEMPTS) {
    await deleteOtp(key);
    applyLockout(key, 'Exceeded maximum 5 OTP verification attempts');
    applyLockout(clientIp, 'Exceeded maximum 5 OTP verification attempts');
    return fail(res, 'Maximum OTP verification attempts (5) exceeded. This OTP code has been permanently invalidated and your account is locked for 15 minutes.', 429);
  }

  // 5. Expiration check
  if (Date.now() > stored.expiresAt) {
    await deleteOtp(key);
    return fail(res, 'OTP code has expired (10-minute limit). Please request a new code.', 400);
  }

  const providedOtp = String(otp || otp_code).trim();
  const candidateHash = hashOtpCode(providedOtp, key);
  const isMatch = constantTimeCompare(candidateHash, String(stored.hashedOtpCode || ''));

  if (!isMatch) {
    const currentAttempts = Number(stored.attempts) || 0;
    const nextAttempts = currentAttempts + 1;
    await updateOtpAttempts(key, currentAttempts);

    if (nextAttempts >= MAX_OTP_ATTEMPTS) {
      // 5th attempt failed! Invalidate the OTP immediately and lock out
      await deleteOtp(key);
      applyLockout(key, 'Failed 5 consecutive OTP verification attempts');
      applyLockout(clientIp, 'Failed 5 consecutive OTP verification attempts');
      console.warn(`[SECURITY ALERT] 🛑 Maximum 5 OTP attempts reached for ${maskEmail(key)}. OTP wiped and account locked for 15 minutes.`);
      return fail(res, 'Maximum OTP verification attempts (5) exceeded. This code has been permanently invalidated and your account is locked for 15 minutes.', 429);
    }

    const remaining = MAX_OTP_ATTEMPTS - nextAttempts;
    return fail(res, `Invalid OTP code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before your account is locked.`, 401);
  }

  // OTP IS 100% VALID!
  // Immediately delete the OTP so it can never be re-used
  await deleteOtp(key);
  clearLockout(key);

  const tokens = issueLoginTokens(key, stored.role || 'admin');
  setRefreshTokenCookie(res, tokens.refreshToken);

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
  const tokenFromCookie = extractCookie(req, 'ipoking_refresh_token');
  const refreshToken = req.body?.refreshToken || tokenFromCookie;
  if (!refreshToken) {
    return fail(res, 'Refresh token is required.', 400);
  }

  const secret = getJwtSecret();
  const payload = verifyJwt(refreshToken, secret);
  if (!payload || payload.type !== 'refresh') {
    return fail(res, 'Invalid refresh token.', 401);
  }

  const tokens = issueLoginTokens(payload.email, payload.role || 'admin');
  setRefreshTokenCookie(res, tokens.refreshToken);

  return ok(res, {
    message: 'Token refreshed successfully',
    token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    token_type: 'Bearer',
    token_expires_in: 86400
  });
}

function logoutHandler(req, res) {
  clearRefreshTokenCookie(res);
  return ok(res, {
    message: 'Logged out successfully'
  });
}

app.post(['/api/auth/request-otp', '/api/v1/auth/send-otp', '/api/auth/send-otp', '/api/auth/login-request-otp'], requestOtpHandler);

app.post(['/api/auth/verify-otp', '/api/v1/auth/verify-otp'], verifyOtpHandler);

app.post(['/api/auth/refresh-token', '/api/v1/auth/refresh-token'], refreshTokenHandler);

app.post(['/api/auth/logout', '/api/v1/auth/logout'], logoutHandler);

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return fail(res, 'Email and password are required.', 400);
  }

  const loginEmail = String(email).trim().toLowerCase();
  const creds = getLoginCredentials();
  if (!creds.email || !creds.password) {
    return fail(res, 'Authentication service is not configured. Please set admin credentials in server environment.', 500);
  }

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
  const authUser = requireAuth(req, res);
  if (!authUser) return;

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

app.post('/api/v1/applications/create', async (req, res) => {
  const authUser = requireAuth(req, res);
  if (!authUser) return;

  const { customer_id, ipo_id, category, quantity, bid_amount, allotment_status } = req.body || {};

  // Backend Validation 1: Required Parameters
  if (!customer_id) return fail(res, 'Validation Error: customer_id is required.', 400);
  if (!ipo_id) return fail(res, 'Validation Error: ipo_id is required.', 400);

  // Backend Validation 2: Data Range & Sanity
  const qty = parseInt(quantity, 10) || 1;
  const bidAmt = parseFloat(bid_amount) || 15000;
  if (qty <= 0) return fail(res, 'Validation Error: quantity must be greater than 0.', 400);
  if (bidAmt < 0) return fail(res, 'Validation Error: bid_amount cannot be negative.', 400);

  try {
    // Backend Validation 3: Duplicate Application Check (Server-Side)
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('customer_id', customer_id)
      .eq('ipo_id', ipo_id)
      .maybeSingle();

    if (existing) {
      return fail(res, 'This customer has already applied for this IPO offering!', 400);
    }

    const payload = {
      customer_id,
      ipo_id,
      application_number: 'APP-' + Math.floor(100000 + Math.random() * 900000),
      category: category || 'RETAIL',
      quantity: qty,
      bid_amount: bidAmt,
      allotment_status: allotment_status || 'Pending'
    };

    const { data, error } = await supabase
      .from('applications')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return fail(res, 'Database Constraint: This customer has already applied for this IPO offering!', 400);
      }
      return fail(res, error.message || 'Failed to create application bid.', 500);
    }

    return ok(res, { message: 'Application bid created successfully.', data });
  } catch (err) {
    console.error('[API Server] create application error:', err);
    return fail(res, err.message || 'Server error creating application.', 500);
  }
});

const DEFAULT_SERVER_BANKS = [
  { id: 1, bank_name: 'HDFC Bank', ifsc_prefix: 'HDFC' },
  { id: 2, bank_name: 'State Bank of India (SBI)', ifsc_prefix: 'SBIN' },
  { id: 3, bank_name: 'ICICI Bank', ifsc_prefix: 'ICIC' },
  { id: 4, bank_name: 'Axis Bank', ifsc_prefix: 'UTIB' },
  { id: 5, bank_name: 'Kotak Mahindra Bank', ifsc_prefix: 'KKBK' },
  { id: 6, bank_name: 'Punjab National Bank (PNB)', ifsc_prefix: 'PUNB' },
  { id: 7, bank_name: 'Bank of Baroda', ifsc_prefix: 'BARB' },
  { id: 8, bank_name: 'Canara Bank', ifsc_prefix: 'CNRB' },
  { id: 9, bank_name: 'Union Bank of India', ifsc_prefix: 'UBIN' },
  { id: 10, bank_name: 'IndusInd Bank', ifsc_prefix: 'INDB' },
  { id: 11, bank_name: 'IDFC FIRST Bank', ifsc_prefix: 'IDFB' },
  { id: 12, bank_name: 'Yes Bank', ifsc_prefix: 'YESB' },
  { id: 13, bank_name: 'Federal Bank', ifsc_prefix: 'FDRL' },
  { id: 14, bank_name: 'Bank of India (BOI)', ifsc_prefix: 'BKID' },
  { id: 15, bank_name: 'Central Bank of India', ifsc_prefix: 'CBIN' },
  { id: 16, bank_name: 'Indian Bank', ifsc_prefix: 'IDIB' },
  { id: 17, bank_name: 'AU Small Finance Bank', ifsc_prefix: 'AUBL' },
  { id: 18, bank_name: 'Bandhan Bank', ifsc_prefix: 'BDBL' }
];

app.get('/api/v1/banks', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .order('bank_name', { ascending: true });

    if (!error && data && data.length > 0) {
      return ok(res, { banks: data });
    }
    return ok(res, { banks: DEFAULT_SERVER_BANKS });
  } catch (err) {
    return ok(res, { banks: DEFAULT_SERVER_BANKS });
  }
});

app.post('/api/v1/banks', async (req, res) => {
  const authUser = requireAuth(req, res);
  if (!authUser) return;

  try {
    const { bank_name, ifsc_prefix } = req.body || {};
    if (!bank_name || !String(bank_name).trim()) {
      return fail(res, 'Bank name is required.', 400);
    }
    const cleanName = String(bank_name).trim();
    const cleanIfsc = String(ifsc_prefix || '').trim().toUpperCase() || null;

    const { data, error } = await supabase
      .from('banks')
      .insert([{ bank_name: cleanName, ifsc_prefix: cleanIfsc, is_active: true }])
      .select('*')
      .maybeSingle();

    if (error) {
      return ok(res, {
        message: 'Bank registered in catalog.',
        bank: { id: Date.now(), bank_name: cleanName, ifsc_prefix: cleanIfsc, is_active: true }
      });
    }

    return ok(res, { message: 'Bank created successfully.', bank: data });
  } catch (err) {
    return fail(res, err.message || 'Error creating bank.', 500);
  }
});

app.delete('/api/v1/banks/:id', async (req, res) => {
  const authUser = requireAuth(req, res);
  if (!authUser) return;

  try {
    const { id } = req.params;
    if (id) {
      await supabase.from('banks').delete().eq('id', id);
    }
    return ok(res, { message: 'Bank deleted successfully.' });
  } catch (err) {
    return fail(res, err.message || 'Error deleting bank.', 500);
  }
});

app.get('/api', (req, res) => {
  res.json({
    status: 'online',
    name: 'IPO KING API Gateway',
    endpoints: [
      'GET    /api/v1/health',
      'POST   /api/v1/auth/send-otp',
      'POST   /api/v1/auth/verify-otp',
      'GET    /api/v1/ipos/live',
      'POST   /api/v1/applications/create',
      'POST   /api/v1/allotments/calculate-profit',
      'GET    /api/v1/banks',
      'POST   /api/v1/banks',
      'DELETE /api/v1/banks/:id'
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
