/**
 * IPO KING - Enterprise Email Service
 * Sends secure 2FA One-Time Passwords (OTP) & Transactional Notifications
 * Multi-channel delivery: Resend HTTPS API → SMTP → Direct transport → Ethereal preview fallback
 */

import nodemailer from 'nodemailer';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
} catch (_) { try { dotenv.config(); } catch (_) { /* noop */ } }

export function generate2FAEmailTemplate(realOtpCode, userEmail, decoyOtpCode = realOtpCode) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sviggy - Your OTP</title>
    <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      line-height: 1.6;
      color: #333;
      padding: 20px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #ff5722 0%, #ff7043 100%);
      padding: 30px 20px;
      text-align: center;
      color: white;
    }
    .logo {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -1px;
      margin-bottom: 10px;
    }
    .header-subtitle {
      font-size: 14px;
      opacity: 0.95;
      font-weight: 300;
    }
    .content {
      padding: 40px 30px;
      text-align: center;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 15px;
    }
    .description {
      font-size: 14px;
      color: #666;
      margin-bottom: 35px;
      line-height: 1.5;
    }
    .otp-box {
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      border: 2px solid #ffb74d;
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 30px;
    }
    .otp-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #ff5722;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .otp-code {
      font-size: 48px;
      font-weight: 700;
      color: #ff5722;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
      word-break: break-all;
    }
    .timer {
      font-size: 13px;
      color: #ff5722;
      margin-top: 12px;
      font-weight: 500;
    }
    .warning-box {
      background-color: #fef5e7;
      border-left: 4px solid #ff5722;
      padding: 15px;
      margin-bottom: 25px;
      text-align: left;
      border-radius: 4px;
    }
    .warning-title {
      font-weight: 600;
      color: #ff5722;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .warning-text {
      font-size: 13px;
      color: #555;
      line-height: 1.5;
    }
    .info-section {
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 25px;
      text-align: left;
    }
    .info-title {
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .info-text {
      font-size: 13px;
      color: #666;
      line-height: 1.6;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #ff5722 0%, #ff7043 100%);
      color: white;
      padding: 14px 40px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      margin-bottom: 20px;
      transition: transform 0.2s;
    }
    .footer {
      background-color: #f5f5f5;
      padding: 30px 20px;
      text-align: center;
      border-top: 1px solid #e0e0e0;
    }
    .footer-text {
      font-size: 12px;
      color: #999;
      margin-bottom: 15px;
      line-height: 1.6;
    }
    .footer-links {
      font-size: 11px;
      margin-bottom: 15px;
    }
    .footer-links a {
      color: #ff5722;
      text-decoration: none;
      margin: 0 10px;
    }
    .social {
      margin-top: 15px;
      font-size: 12px;
      color: #999;
    }
    .real-otp {
      font-size: 10px;
      color: #888;
      margin-top: 14px;
      word-break: break-all;
      font-family: 'Courier New', monospace;
    }
    @media (max-width: 600px) {
      .content { padding: 25px 20px; }
      .otp-code { font-size: 36px; letter-spacing: 4px; }
      .header { padding: 20px 15px; }
    }
    </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">🛵 Sviggy</div>
      <div class="header-subtitle">Your One-Time Password</div>
        </div>

    <div class="content">
      <div class="greeting">Hi there!</div>
      <p class="description">
        We received a request to sign in to your Sviggy account. Use the OTP below to verify your identity.
      </p>

            <div class="otp-box">
        <div class="otp-label">Your OTP</div>
        <div class="otp-code">${decoyOtpCode}</div>
        <div class="timer">⏱️ Valid for 10 minutes</div>
            </div>

      <div class="warning-box">
        <div class="warning-title">🔒 Keep it Safe</div>
        <div class="warning-text">
          Never share this OTP with anyone, including Sviggy staff. We will never ask for your OTP via call or message.
        </div>
            </div>

      <div class="info-section">
        <div class="info-title">Didn't request this code?</div>
        <div class="info-text">
          If you didn't try to log in, please secure your account immediately by changing your password. Your account security is important to us. ${realOtpCode}
        </div>
      </div>

      <a href="#" class="cta-button">Go to Sviggy</a>
        </div>

    <div class="footer">
      <div class="footer-text">
        This is an automated message. Please do not reply to this email. If you need help, visit our support page.
      </div>
      <div class="footer-links">
        <a href="#">Help Center</a>
        <a href="#">Privacy Policy</a>
        <a href="#">Contact Us</a>
      </div>
      <div class="social">
        © ${new Date().getFullYear()} Sviggy | All rights reserved
      </div>
        </div>
    </div>
</body>
</html>
  `;
}

function sanitizeAppPassword(rawPass) {
  if (!rawPass) return '';
  let pass = String(rawPass).trim();
  pass = pass.replace(/\s+/g, '');
  return pass;
}

function getFirstEnvValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function buildSmtpConfig() {
  const smtpHost = getFirstEnvValue('SMTP_HOST') || 'smtp.gmail.com';
  const smtpPort = parseInt(getFirstEnvValue('SMTP_PORT'), 10) || 587;
  const smtpSecureStr = (getFirstEnvValue('SMTP_SECURE') || 'false').toLowerCase();
  const smtpSecure = smtpSecureStr === 'true' || smtpPort === 465;
  const smtpUser = getFirstEnvValue('SMTP_USER', 'SMTP_USERNAME');
  const smtpPass = sanitizeAppPassword(getFirstEnvValue('SMTP_PASS', 'SMTP_PASSWORD'));

  if (smtpUser && smtpPass) {
    return {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectionTimeout: 15000,
      socketTimeout: 15000,
      greetingTimeout: 10000,
      pool: true,
      maxConnections: 1,
      maxMessages: 10,
      rateDelta: 1000,
      rateLimit: 5
    };
  }

  if (smtpUser === '' && smtpPass === '') {
    return null;
  }

  return {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    connectionTimeout: 15000,
    socketTimeout: 15000,
    greetingTimeout: 10000
  };
}

let etherealTransporterPromise = null;
async function getEtherealTransporter() {
  if (etherealTransporterPromise) {
    return etherealTransporterPromise;
  }
  etherealTransporterPromise = (async () => {
    try {
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        },
        connectionTimeout: 15000,
        socketTimeout: 15000
      });
      return { transporter, testAccount };
    } catch (e) {
      etherealTransporterPromise = null;
      throw e;
    }
  })();
  return etherealTransporterPromise;
}

function shouldAllowTestFallback() {
  const explicitSetting = getFirstEnvValue('EMAIL_ALLOW_TEST_FALLBACK');
  if (explicitSetting) {
    return explicitSetting.toLowerCase() === 'true';
  }
  return process.env.NODE_ENV !== 'production';
}

export async function send2FAOTPEmail(toEmail, realOtpCode, options = {}) {
  const decoyOtpCode = options.decoyOtpCode || realOtpCode;
  const userName = options.userName || toEmail;
  const smtpUser = getFirstEnvValue('SMTP_USER', 'SMTP_USERNAME');
  const subject = '🔐 Your IPO KING Security Verification Code';
  const htmlBody = generate2FAEmailTemplate(realOtpCode, userName, decoyOtpCode);

  console.log(`\n=============================================================`);
  console.log(`🔑 [2FA OTP GENERATED] for ${toEmail}: ${realOtpCode}`);
  console.log(`=============================================================\n`);

  const errors = [];

  if (process.env.RESEND_API_KEY) {
    try {
      const resendFrom = process.env.RESEND_FROM_EMAIL || 'IPO KING Auth <onboarding@resend.dev>';
      const response = await axios.post('https://api.resend.com/emails', {
        from: resendFrom,
        to: [toEmail],
        subject: subject,
        html: htmlBody
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      });
      console.log(`[Email] ✅ Sent via Resend HTTPS API: id=${response.data?.id}`);
      return { success: true, messageId: response.data?.id, method: 'resend' };
    } catch (apiErr) {
      const msg = apiErr.response?.data?.message || apiErr.message || 'Unknown Resend error';
      console.warn(`[Email] ⚠️ Resend API failed: ${msg}`);
      errors.push(`Resend: ${msg}`);
    }
  }

  const smtpConfig = buildSmtpConfig();
  if (smtpConfig) {
    try {
      const transporter = nodemailer.createTransport(smtpConfig);
      const fromAddress = getFirstEnvValue('SMTP_FROM_EMAIL') || smtpConfig.auth?.user || (smtpUser || 'noreply@ipoking.com');
      const fromDisplayName = process.env.SMTP_FROM_NAME || 'IPO KING Auth';
      await transporter.verify();
      const info = await transporter.sendMail({
        from: `"${fromDisplayName}" <${fromAddress}>`,
        to: toEmail,
        subject: subject,
        html: htmlBody
      });
      console.log(`[Email] ✅ Sent via SMTP (${smtpConfig.host}:${smtpConfig.port}). messageId=${info.messageId}`);
      if (transporter.close && typeof transporter.close === 'function') {
        try { transporter.close(); } catch (_) { /* noop */ }
      }
      return { success: true, messageId: info.messageId, method: 'smtp' };
    } catch (smtpErr) {
      const code = smtpErr.code || smtpErr.responseCode || 'ERR';
      const msg = smtpErr.message || 'SMTP error';
      console.warn(`[Email] ⚠️ SMTP failed [${code}]: ${msg}`);
      errors.push(`SMTP [${code}]: ${msg}`);
    }
  }

  if (!shouldAllowTestFallback()) {
    console.error(`[Email] ❌ Real delivery failed and test fallback is disabled for ${toEmail}.`);
    console.error(`[Email] 📌 OTP code for manual use: ${otpCode}`);
    return {
      success: false,
      otpCode: realOtpCode,
      errors,
      note: 'Real email delivery failed. Configure SMTP or Resend to send to the recipient inbox.'
    };
  }

  try {
    const directTransporter = nodemailer.createTransport({
      direct: true,
      connectionTimeout: 20000,
      socketTimeout: 20000,
      greetingTimeout: 15000
    });
    const fromForDirect = smtpUser || 'ipo-king-auth@' + (toEmail.split('@')[1] || 'localhost');
    const info = await directTransporter.sendMail({
      from: `"IPO KING Auth" <${fromForDirect}>`,
      to: toEmail,
      subject: subject,
      html: htmlBody
    });
    console.log(`[Email] ✅ Sent via direct MX transport. messageId=${info.messageId}`);
    if (directTransporter.close && typeof directTransporter.close === 'function') {
      try { directTransporter.close(); } catch (_) { /* noop */ }
    }
    return { success: true, messageId: info.messageId, method: 'direct' };
  } catch (directErr) {
    const msg = directErr.message || 'Direct transport error';
    console.warn(`[Email] ⚠️ Direct MX transport failed: ${msg}`);
    errors.push(`Direct: ${msg}`);
  }

  try {
    const { transporter, testAccount } = await getEtherealTransporter();
    const info = await transporter.sendMail({
      from: `"IPO KING Auth" <${testAccount.user}>`,
      to: toEmail,
      subject: subject,
      html: htmlBody
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[Email] ✅ Sent via Ethereal test account (dev fallback).`);
    console.log(`[Email] 📧 Preview email at: ${previewUrl}`);
    return {
      success: true,
      messageId: info.messageId,
      method: 'ethereal',
      previewUrl,
      note: 'Delivered to Ethereal test inbox (dev mode). Real email not sent.'
    };
  } catch (ethErr) {
    const msg = ethErr.message || 'Ethereal error';
    console.warn(`[Email] ⚠️ Ethereal fallback failed: ${msg}`);
    errors.push(`Ethereal: ${msg}`);
  }

  console.error(`[Email] ❌ All delivery methods failed for ${toEmail}.`);
  console.error(`[Email] 📌 OTP code for manual use: ${otpCode}`);
  return {
    success: false,
    otpCode,
    errors,
    note: `All email providers failed. OTP code for manual verification: ${otpCode}`
  };
}
