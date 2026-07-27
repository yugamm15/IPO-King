import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config({ path: '.env.local' });

const smtpUser = process.env.SMTP_USER || 'swiggy.servicess@gmail.com';
const rawPass = process.env.SMTP_PASS || '';
const cleanPass = rawPass.replace(/only/gi, '').replace(/\s+/g, '');

console.log('Testing SMTP connection with Port 587:');
console.log('User:', smtpUser);
console.log('Pass length:', cleanPass.length);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: smtpUser,
    pass: cleanPass
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function main() {
  try {
    const info = await transporter.sendMail({
      from: `"IPO KING Auth" <${smtpUser}>`,
      to: 'yugamkothari886@gmail.com',
      subject: '🔐 Test 2FA OTP Code',
      text: 'Your test 2FA OTP code is 849201'
    });
    console.log('SUCCESS! Email sent:', info.messageId);
  } catch (err) {
    console.error('ERROR SENDING EMAIL:', err);
  }
}

main();
