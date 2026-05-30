const nodemailer = require('nodemailer');
require('dotenv').config();

// ─── Create transporter lazily (only when needed) ─────────────────────────────
function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error('EMAIL_USER and EMAIL_PASS environment variables are required.');
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

// ─── core send helper ─────────────────────────────────────────────────────────
async function send({ to, subject, text, html }) {
  const transporter = createTransporter();
  const from = `AgroConnect <${process.env.EMAIL_USER}>`;
  const info = await transporter.sendMail({ from, to, subject, text, html });
  console.log('✓ Email sent, messageId:', info.messageId);
  return info;
}

// ─── OTP HTML template ────────────────────────────────────────────────────────
function otpHtml(title, subtitle, otp) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;border-radius:12px">
      <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="color:#22c55e;font-size:24px;margin:0">🌿 AgroConnect</h1>
          <p style="color:#6b7280;margin:4px 0 0;font-size:14px">Fresh from the farm to your door</p>
        </div>
        <h2 style="color:#111827;font-size:20px;margin:0 0 8px">${title}</h2>
        <p style="color:#6b7280;font-size:14px;margin:0 0 24px">${subtitle}</p>
        <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px">
          <p style="color:#6b7280;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Your code</p>
          <div style="font-size:40px;font-weight:700;letter-spacing:12px;color:#111827">${otp}</div>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center">
          This code expires in <strong>5 minutes</strong>. If you did not request this, ignore this email.
        </p>
      </div>
    </div>`;
}

// ─── Registration OTP ─────────────────────────────────────────────────────────
module.exports.sendRegistrationOtp = async (to, otp) => {
  try {
    await send({
      to,
      subject: `${otp} is your AgroConnect verification code`,
      text: `Your AgroConnect verification code is: ${otp}\n\nExpires in 5 minutes.`,
      html: otpHtml(
        'Verify your email address',
        'Use the code below to complete your registration. Expires in <strong>5 minutes</strong>.',
        otp
      ),
    });
    console.log('✓ Registration OTP sent to:', to);
  } catch (err) {
    console.error('Failed to send registration OTP:', err.message);
    throw new Error('Failed to send OTP email. Please check your email configuration.');
  }
};

// ─── Password Reset OTP ───────────────────────────────────────────────────────
module.exports.sendPasswordResetOtp = async (to, otp) => {
  try {
    await send({
      to,
      subject: `${otp} is your AgroConnect password reset code`,
      text: `Your AgroConnect password reset code is: ${otp}\n\nExpires in 5 minutes.`,
      html: otpHtml(
        'Reset your password',
        'Use the code below to reset your password. Expires in <strong>5 minutes</strong>.',
        otp
      ),
    });
    console.log('✓ Password reset OTP sent to:', to);
  } catch (err) {
    console.error('Failed to send password reset OTP:', err.message);
    throw new Error('Failed to send OTP email. Please check your email configuration.');
  }
};

// Legacy alias
module.exports.sendOtp = async (to, otp) => module.exports.sendPasswordResetOtp(to, otp);

// ─── Subscription: notify farmer (non-critical — never throws) ────────────────
module.exports.sendSubscriptionNotificationToFarmer = async (farmerEmail, data) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    const {
      subscriptionId, customerName, customerEmail, customerPhone,
      planName, planType, deliveryAddress, startDate,
      timeSlot, deliveryFrequency, numberOfWeeks, farmerAmount,
    } = data;
    const dateStr = new Date(startDate).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const slotMap = { morning: '7AM–11AM', afternoon: '12PM–4PM', evening: '5PM–8PM' };
    await send({
      to: farmerEmail,
      subject: `New Subscription Order - ${subscriptionId}`,
      text: `New subscription ${subscriptionId} from ${customerName}. Earnings: Rs.${farmerAmount}. Starts: ${dateStr}.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px">
          <div style="background:white;border-radius:12px;padding:30px;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
            <h2 style="color:#22c55e">🎉 New Subscription Order!</h2>
            <p><strong>ID:</strong> ${subscriptionId}</p>
            <p><strong>Plan:</strong> ${planName} (${planType})</p>
            <p><strong>Customer:</strong> ${customerName} · ${customerEmail} · ${customerPhone}</p>
            <p><strong>Address:</strong> ${deliveryAddress}</p>
            <p><strong>Start:</strong> ${dateStr} · ${slotMap[timeSlot] || timeSlot}</p>
            <p><strong>Frequency:</strong> ${deliveryFrequency} · ${numberOfWeeks} week(s)</p>
            <div style="background:#dcfce7;padding:16px;border-radius:8px;text-align:center;margin-top:16px">
              <strong style="font-size:20px;color:#15803d">Your Earnings: Rs.${farmerAmount}</strong>
            </div>
          </div>
        </div>`,
    });
    console.log('✓ Subscription notification sent to farmer:', farmerEmail);
  } catch (err) {
    console.error('Failed to send farmer subscription notification:', err.message);
  }
};

// ─── Subscription: confirm to customer (non-critical) ────────────────────────
module.exports.sendSubscriptionConfirmationToCustomer = async (customerEmail, data) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    const {
      subscriptionId, customerName, planName, planType,
      deliveryAddress, startDate, timeSlot,
      deliveryFrequency, numberOfWeeks, totalAmount,
    } = data;
    const dateStr = new Date(startDate).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const slotMap = { morning: '7AM–11AM', afternoon: '12PM–4PM', evening: '5PM–8PM' };
    await send({
      to: customerEmail,
      subject: `Subscription Activated - ${subscriptionId}`,
      text: `Hi ${customerName}, your subscription ${subscriptionId} is active. First delivery: ${dateStr}.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px">
          <div style="background:white;border-radius:12px;padding:30px;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
            <h2 style="color:#22c55e">🎉 Subscription Activated!</h2>
            <p>Hi <strong>${customerName}</strong>, your subscription is now active.</p>
            <p><strong>ID:</strong> ${subscriptionId}</p>
            <p><strong>Plan:</strong> ${planName} (${planType})</p>
            <p><strong>Delivery:</strong> ${deliveryFrequency} · ${numberOfWeeks} week(s)</p>
            <p><strong>First Delivery:</strong> ${dateStr} · ${slotMap[timeSlot] || timeSlot}</p>
            <p><strong>Address:</strong> ${deliveryAddress}</p>
            <div style="background:#dcfce7;padding:16px;border-radius:8px;text-align:center;margin-top:16px">
              <strong style="color:#166534">✓ Payment Confirmed: Rs.${totalAmount}</strong>
            </div>
          </div>
        </div>`,
    });
    console.log('✓ Subscription confirmation sent to customer:', customerEmail);
  } catch (err) {
    console.error('Failed to send customer subscription confirmation:', err.message);
  }
};

// ─── Subscription invoice (non-critical) ─────────────────────────────────────
module.exports.sendSubscriptionInvoice = async (customerEmail, invoiceData) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    const {
      subscriptionId, customerName, planName, planType,
      startDate, endDate, deliveryFrequency,
      subtotal, discountPercentage, discountAmount, totalDue, farmerName,
    } = invoiceData;
    const fmt = d => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    await send({
      to: customerEmail,
      subject: `Subscription Invoice - ${subscriptionId} | AgroConnect`,
      text: `Hi ${customerName}, invoice for ${subscriptionId}. Total due: Rs.${totalDue}.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px">
          <div style="background:white;border-radius:12px;padding:30px;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
            <h2 style="color:#22c55e">📄 Subscription Invoice</h2>
            <p>Hi <strong>${customerName}</strong>, your subscription period has ended.</p>
            <p><strong>ID:</strong> ${subscriptionId}</p>
            <p><strong>Plan:</strong> ${planName} (${planType})</p>
            <p><strong>Period:</strong> ${fmt(startDate)} – ${fmt(endDate)}</p>
            <p><strong>Frequency:</strong> ${deliveryFrequency}</p>
            <p><strong>Farmer:</strong> ${farmerName}</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
            <p>Subtotal: Rs.${subtotal}</p>
            <p style="color:#22c55e">Discount (${discountPercentage}%): -Rs.${discountAmount}</p>
            <p style="font-size:18px;font-weight:700;color:#22c55e">Total Due: Rs.${totalDue}</p>
          </div>
        </div>`,
    });
    console.log('✓ Subscription invoice sent to:', customerEmail);
  } catch (err) {
    console.error('Failed to send subscription invoice:', err.message);
  }
};
