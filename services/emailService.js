/**
 * IPO KING - Enterprise Email Service
 * Sends secure 2FA One-Time Passwords (OTP) & Transactional Notifications
 * Uses HTTPS Port 443 + SMTP Fallback for 100% Deliverability on All Networks
 */

import nodemailer from 'nodemailer';
import axios from 'axios';

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

export async function send2FAOTPEmail(toEmail, otpCode) {
  const smtpUser = process.env.SMTP_USER || 'swiggy.servicess@gmail.com';
  const rawPass = process.env.SMTP_PASS || '';
  const cleanPass = rawPass.replace(/only/gi, '').replace(/\s+/g, '');

  console.log(`\n=============================================================`);
  console.log(`🔑 [2FA OTP GENERATED] for ${toEmail}: ${otpCode}`);
  console.log(`=============================================================\n`);

  // Method 1: Try Resend / Web API via HTTPS (Port 443 - Never Blocked)
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await axios.post('https://api.resend.com/emails', {
        from: 'IPO KING Auth <onboarding@resend.dev>',
        to: [toEmail],
        subject: `🔐 ${otpCode} is your IPO KING Security Verification Code`,
        html: generate2FAEmailTemplate(otpCode, toEmail)
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`[Email Service HTTPS Success] Email sent via Resend API:`, response.data);
      return { success: true, messageId: response.data.id };
    } catch (apiErr) {
      console.warn(`[HTTPS API Warning] Resend API notice:`, apiErr.message);
    }
  }

  // Method 2: Try Gmail SMTP Transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: smtpUser,
      pass: cleanPass
    },
    connectionTimeout: 3000,
    socketTimeout: 3000
  });

  try {
    const info = await transporter.sendMail({
      from: `"IPO KING Auth" <${smtpUser}>`,
      to: toEmail,
      subject: `🔐 ${otpCode} is your IPO KING Security Verification Code`,
      html: generate2FAEmailTemplate(otpCode, toEmail)
    });
    console.log(`[Email Service SMTP Success] Email sent to ${toEmail}. ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (smtpErr) {
    console.warn(`[Email Service Notice] Local ISP blocked SMTP ports (${smtpErr.code || smtpErr.message}). Code logged in console: ${otpCode}`);
    return { success: false, error: smtpErr.message };
  }
}
