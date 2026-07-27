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

export function generate2FAEmailTemplate(otpCode, userEmail) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IPO KING - 2FA Security Code</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F1F5F9; margin: 0; padding: 20px; color: #0F172A; }
        .email-card { max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); }
        .email-header { background: linear-gradient(135deg, #0F172A, #1E293B); padding: 24px; text-align: center; color: #FFFFFF; }
        .brand-title { font-size: 22px; font-weight: 800; letter-spacing: 1px; margin: 0; }
        .brand-sub { font-size: 11px; color: #94A3B8; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .email-body { padding: 32px 28px; }
        .greeting { font-size: 18px; font-weight: 700; color: #0F172A; margin-bottom: 12px; }
        .text { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
        .otp-box { background: #F8FAFC; border: 2px solid #2563EB; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
        .otp-label { font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 1px; text-transform: uppercase; }
        .otp-code { font-size: 38px; font-weight: 800; color: #2563EB; letter-spacing: 8px; margin: 8px 0; font-family: monospace; }
        .otp-expiry { font-size: 12px; color: #64748B; }
        .notice-box { background: #FEF3C7; border-left: 4px solid #D97706; padding: 14px; border-radius: 6px; font-size: 12px; color: #92400E; margin-bottom: 24px; line-height: 1.5; }
        .email-footer { background: #F8FAFC; padding: 18px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
    </style>
</head>
<body>
    <div class="email-card">
        <div class="email-header">
            <h1 class="brand-title">IPO KING</h1>
            <div class="brand-sub">Enterprise Security Verification</div>
        </div>
        <div class="email-body">
            <div class="greeting">Admin Login Verification</div>
            <p class="text">You requested access to the <strong>IPO KING Admin Management Portal</strong> for <code>${userEmail}</code>. Use the secure 6-digit One-Time Password (OTP) below to complete your login:</p>
            
            <div class="otp-box">
                <div class="otp-label">Verification Security Code</div>
                <div class="otp-code">${otpCode}</div>
                <div class="otp-expiry">⏱️ Valid for 10 minutes</div>
            </div>

            <div class="notice-box">
                <strong>Security Notice:</strong> Do not share this OTP code with anyone. IPO KING support will never ask for your 2FA code.
            </div>

            <p class="text" style="font-size: 12px; color: #94A3B8; margin-bottom: 0;">If you did not request this code, please secure your admin credentials immediately.</p>
        </div>
        <div class="email-footer">
            &copy; ${new Date().getFullYear()} IPO KING Management System. All Rights Reserved.
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

function buildSmtpConfig() {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
  const smtpSecureStr = (process.env.SMTP_SECURE || 'false').toLowerCase();
  const smtpSecure = smtpSecureStr === 'true' || smtpPort === 465;
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = sanitizeAppPassword(process.env.SMTP_PASS || '');

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

export async function send2FAOTPEmail(toEmail, otpCode) {
  const smtpUser = process.env.SMTP_USER || '';
  const subject = `🔐 ${otpCode} is your IPO KING Security Verification Code`;
  const htmlBody = generate2FAEmailTemplate(otpCode, toEmail);

  console.log(`\n=============================================================`);
  console.log(`🔑 [2FA OTP GENERATED] for ${toEmail}: ${otpCode}`);
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
      const fromAddress = smtpConfig.auth?.user || (smtpUser || 'noreply@ipoking.com');
      const fromDisplayName = process.env.SMTP_FROM_NAME || 'IPO KING Auth';
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
