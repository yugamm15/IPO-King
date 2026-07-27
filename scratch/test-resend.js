import axios from 'axios';

async function testResend() {
  try {
    // Free Resend API Call via HTTPS (Port 443 - Never blocked by ISP)
    const response = await axios.post('https://api.resend.com/emails', {
      from: 'IPO KING Auth <onboarding@resend.dev>',
      to: ['yugamkothari886@gmail.com'],
      subject: '🔐 849201 is your IPO KING Security Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f8fafc; border-radius: 12px;">
          <h2 style="color: #2563eb;">IPO KING - Admin Security Code</h2>
          <p>Your 6-digit OTP verification code for <strong>yugamkothari886@gmail.com</strong> is:</p>
          <div style="font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 6px; padding: 16px; background: #ffffff; border: 2px solid #2563eb; border-radius: 8px; text-align: center; margin: 20px 0;">
            849201
          </div>
          <p style="font-size: 12px; color: #64748b;">⏱️ Valid for 10 minutes</p>
        </div>
      `
    }, {
      headers: {
        'Authorization': `Bearer re_123456789`, // Resend API Key
        'Content-Type': 'application/json'
      }
    });

    console.log('RESEND SUCCESS:', response.data);
  } catch (err) {
    console.log('RESEND NOTICE:', err.response ? err.response.data : err.message);
  }
}

testResend();
