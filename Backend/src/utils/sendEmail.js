const nodemailer = require("nodemailer");
require("dotenv").config();

// Validate email configuration
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn("WARNING: EMAIL_USER or EMAIL_PASS not set in .env file. Email functionality will not work.");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send OTP for password reset
module.exports.sendPasswordResetOtp = async (to, otp) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email configuration is missing. Please set EMAIL_USER and EMAIL_PASS in your .env file.");
  }

  try {
    await transporter.verify();
    
    await transporter.sendMail({
      from: `"AgroConnect" <${process.env.EMAIL_USER}>`,
      to,
      subject: `${otp} is your AgroConnect password reset code`,
      text: `Your AgroConnect password reset code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
          <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #22c55e; font-size: 24px; margin: 0;">🌿 AgroConnect</h1>
              <p style="color: #6b7280; margin: 4px 0 0; font-size: 14px;">Fresh from the farm to your door</p>
            </div>

            <h2 style="color: #111827; font-size: 20px; margin: 0 0 8px;">Reset your password</h2>
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">
              Use the code below to reset your password. This code expires in <strong>5 minutes</strong>.
            </p>

            <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Your reset code</p>
              <div style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #111827;">${otp}</div>
            </div>

            <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
              If you didn't request a password reset, you can safely ignore this email. Your password will not change.
            </p>
          </div>
        </div>
      `
    });
    console.log("Password reset OTP email sent successfully to:", to);
  } catch (err) {
    console.error("Failed to send password reset OTP email:", err);
    if (err.code === "EAUTH") {
      throw new Error("Email authentication failed. Please check your EMAIL_USER and EMAIL_PASS in .env file.");
    } else if (err.code === "ECONNECTION" || err.code === "ETIMEDOUT") {
      throw new Error("Unable to connect to email server. Please check your internet connection.");
    } else {
      throw new Error(`Failed to send email: ${err.message}`);
    }
  }
};

// Send OTP for registration verification
module.exports.sendRegistrationOtp = async (to, otp) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email configuration is missing.");
  }

  try {
    await transporter.verify();
    
    await transporter.sendMail({
      from: `"AgroConnect" <${process.env.EMAIL_USER}>`,
      to,
      subject: `${otp} is your AgroConnect verification code`,
      text: `Your AgroConnect verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
          <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #22c55e; font-size: 24px; margin: 0;">🌿 AgroConnect</h1>
              <p style="color: #6b7280; margin: 4px 0 0; font-size: 14px;">Fresh from the farm to your door</p>
            </div>
            
            <h2 style="color: #111827; font-size: 20px; margin: 0 0 8px;">Verify your email address</h2>
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">
              Use the code below to complete your registration. This code expires in <strong>5 minutes</strong>.
            </p>
            
            <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Your verification code</p>
              <div style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #111827;">${otp}</div>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
              If you didn't create an AgroConnect account, you can safely ignore this email.
            </p>
          </div>
        </div>
      `
    });
    console.log("Registration OTP email sent successfully to:", to);
  } catch (err) {
    console.error("Failed to send registration OTP email:", err);
    if (err.code === "EAUTH") {
      throw new Error("Email authentication failed. Please check EMAIL_USER and EMAIL_PASS.");
    } else if (err.code === "ECONNECTION" || err.code === "ETIMEDOUT") {
      throw new Error("Unable to connect to email server.");
    } else {
      throw new Error(`Failed to send email: ${err.message}`);
    }
  }
};

// Legacy function for backward compatibility (password reset)
module.exports.sendOtp = async (to, otp) => {
  return await module.exports.sendPasswordResetOtp(to, otp);
};


// Send subscription notification to farmer
module.exports.sendSubscriptionNotificationToFarmer = async (farmerEmail, subscriptionData) => {
  // Check if email is configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("Email configuration missing. Skipping farmer notification.");
    return;
  }

  try {
    // Verify transporter configuration
    await transporter.verify();
    
    const {
      subscriptionId,
      customerName,
      customerEmail,
      customerPhone,
      planName,
      planType,
      deliveryAddress,
      startDate,
      timeSlot,
      deliveryFrequency,
      numberOfWeeks,
      farmerAmount
    } = subscriptionData;

    const formattedStartDate = new Date(startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const timeSlotText = {
      morning: '7:00 AM - 11:00 AM',
      afternoon: '12:00 PM - 4:00 PM',
      evening: '5:00 PM - 8:00 PM'
    }[timeSlot] || timeSlot;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: farmerEmail,
      subject: `New Subscription Order - ${subscriptionId}`,
      text: `
New Subscription Order Received!

Subscription ID: ${subscriptionId}
Plan: ${planName} (${planType})

Customer Details:
- Name: ${customerName}
- Email: ${customerEmail}
- Phone: ${customerPhone}

Delivery Information:
- Address: ${deliveryAddress}
- Start Date: ${formattedStartDate}
- Time Slot: ${timeSlotText}
- Frequency: ${deliveryFrequency}
- Duration: ${numberOfWeeks} week(s)

Your Earnings: â‚¹${farmerAmount}

Please prepare for regular deliveries starting from the specified date.

Thank you for being part of FarmFresh!
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">ðŸŽ‰ New Subscription Order!</h1>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Great news! You have received a new subscription order.
              </p>

              <!-- Subscription ID -->
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">SUBSCRIPTION ID</div>
                <div style="font-size: 18px; font-weight: bold; color: #111827;">${subscriptionId}</div>
              </div>

              <!-- Plan Details -->
              <div style="margin-bottom: 25px;">
                <h3 style="color: #111827; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #22c55e; padding-bottom: 8px;">
                  ðŸ“¦ Plan Details
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Plan:</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px; text-align: right;">${planName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Type:</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px; text-align: right;">${planType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Frequency:</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px; text-align: right;">${deliveryFrequency}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Duration:</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px; text-align: right;">${numberOfWeeks} week(s)</td>
                  </tr>
                </table>
              </div>

              <!-- Customer Details -->
              <div style="margin-bottom: 25px;">
                <h3 style="color: #111827; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #22c55e; padding-bottom: 8px;">
                  ðŸ‘¤ Customer Information
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Name:</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px; text-align: right;">${customerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px; text-align: right;">${customerEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Phone:</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px; text-align: right;">${customerPhone}</td>
                  </tr>
                </table>
              </div>

              <!-- Delivery Details -->
              <div style="margin-bottom: 25px;">
                <h3 style="color: #111827; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #22c55e; padding-bottom: 8px;">
                  ðŸšš Delivery Information
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Address:</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px; text-align: right;">${deliveryAddress}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Start Date:</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px; text-align: right;">${formattedStartDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time Slot:</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px; text-align: right;">${timeSlotText}</td>
                  </tr>
                </table>
              </div>

              <!-- Earnings -->
              <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                <div style="font-size: 14px; color: #166534; margin-bottom: 5px;">YOUR EARNINGS</div>
                <div style="font-size: 32px; font-weight: bold; color: #15803d;">â‚¹${farmerAmount}</div>
              </div>

              <!-- Action Required -->
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>âš ï¸ Action Required:</strong> Please prepare for regular deliveries starting from ${formattedStartDate}. Make sure to have fresh produce ready for the scheduled delivery time.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Thank you for being part of FarmFresh! ðŸŒ±
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px;">
                This is an automated notification. Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `
    });
    
    console.log(`âœ… Subscription notification sent to farmer: ${farmerEmail}`);
  } catch (err) {
    console.error("Failed to send subscription notification to farmer:", err);
    // Don't throw error - we don't want to fail the subscription creation if email fails
  }
};

// Send subscription confirmation to customer
module.exports.sendSubscriptionConfirmationToCustomer = async (customerEmail, subscriptionData) => {
  // Check if email is configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("Email configuration missing. Skipping customer confirmation.");
    return;
  }

  try {
    await transporter.verify();
    
    const {
      subscriptionId,
      customerName,
      planName,
      planType,
      deliveryAddress,
      startDate,
      timeSlot,
      deliveryFrequency,
      numberOfWeeks,
      totalAmount
    } = subscriptionData;

    const formattedStartDate = new Date(startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const timeSlotText = {
      morning: '7:00 AM - 11:00 AM',
      afternoon: '12:00 PM - 4:00 PM',
      evening: '5:00 PM - 8:00 PM'
    }[timeSlot] || timeSlot;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Subscription Activated - ${subscriptionId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">ðŸŽ‰ Subscription Activated!</h1>
            </div>

            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Hi ${customerName},
              </p>
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Your subscription has been successfully activated! Get ready to receive fresh, organic produce delivered to your doorstep.
              </p>

              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">SUBSCRIPTION ID</div>
                <div style="font-size: 18px; font-weight: bold; color: #111827;">${subscriptionId}</div>
              </div>

              <h3 style="color: #111827; font-size: 18px; margin-bottom: 15px;">ðŸ“¦ Your Subscription</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Plan:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${planName} (${planType})</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Delivery:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${deliveryFrequency}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Duration:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${numberOfWeeks} week(s)</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">First Delivery:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${formattedStartDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Time Slot:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${timeSlotText}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Delivery Address:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${deliveryAddress}</td>
                </tr>
              </table>

              <div style="background: #dcfce7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; color: #166534; font-size: 14px; text-align: center;">
                  <strong>âœ“ Payment Confirmed:</strong> â‚¹${totalAmount}
                </p>
              </div>

              <p style="font-size: 14px; color: #6b7280;">
                You can manage your subscription anytime from your profile page.
              </p>
            </div>

            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Thank you for choosing FarmFresh! ðŸŒ±
              </p>
            </div>
          </div>
        </div>
      `
    });
    
    console.log(`âœ… Subscription confirmation sent to customer: ${customerEmail}`);
  } catch (err) {
    console.error("Failed to send subscription confirmation to customer:", err);
  }
};

// Send subscription end invoice to customer
module.exports.sendSubscriptionInvoice = async (customerEmail, invoiceData) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email config missing. Skipping subscription invoice.');
    return;
  }

  try {
    await transporter.verify();

    const {
      subscriptionId, customerName, planName, planType,
      startDate, endDate, deliveryFrequency,
      dailySelections, discountPercentage,
      subtotal, discountAmount, totalDue,
      farmerName, farmerEmail: fEmail
    } = invoiceData;

    const fmt = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    // Build daily breakdown rows
    const dayRows = (dailySelections || [])
      .filter(d => d.products && d.products.length > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(day => {
        const dayTotal = day.products.reduce((s, p) => s + (p.quantity * p.pricePerUnit), 0);
        const productList = day.products.map(p =>
          `<tr>
            <td style="padding:6px 12px;color:#374151;font-size:13px">${p.productName}</td>
            <td style="padding:6px 12px;text-align:center;color:#374151;font-size:13px">${p.quantity} ${p.unit}</td>
            <td style="padding:6px 12px;text-align:right;color:#374151;font-size:13px">â‚¹${p.pricePerUnit}</td>
            <td style="padding:6px 12px;text-align:right;color:#374151;font-size:13px">â‚¹${(p.quantity * p.pricePerUnit).toFixed(2)}</td>
          </tr>`
        ).join('');
        return `
          <tr style="background:#f0fdf4">
            <td colspan="4" style="padding:8px 12px;font-weight:700;font-size:13px;color:#166534;border-top:1px solid #e5e7eb">
              ${fmt(day.date)}
            </td>
          </tr>
          ${productList}
          <tr style="background:#f9fafb">
            <td colspan="3" style="padding:6px 12px;text-align:right;font-size:13px;color:#6b7280">Day Total:</td>
            <td style="padding:6px 12px;text-align:right;font-weight:600;font-size:13px;color:#111827">â‚¹${dayTotal.toFixed(2)}</td>
          </tr>`;
      }).join('');

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Subscription Invoice - ${subscriptionId} | AgroConnect`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#f9fafb;padding:20px">
          <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">

            <!-- Header -->
            <div style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);padding:32px;text-align:center">
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAABRxJREFUeAHFWV9MU1cY/85t7YYSVoxYXzBFZrJlKCzhAbsHSyIL3R5WfNHEKfbFvYEsmu1ls2Z7wJgwMHuBF1RiMl6EvUizkdE9WPfAkoq47UGwri9tMaMyOmYZPfu+c3ubS7m9f7oOfsn13nvO99nf/c737xwYlIl9o51eZmfNjIMXX1s4gJPhRXP4nMbnGNDF+cOcBOHnZ0NhKAPMirBz1Ot02Hf3cs4vKmQsIMaBhdc3clfTgVDMrJIpgkRsl63qCgpfhAoAid40S9SQYN0tXy9KBcuwmBFiXOLBpQ9Dt/SEdAnW3fZ9VSmrlQL66+DSuam+UvOaBMWSSlUTjIkA2A5Esxtr7elAOF08IWlJO2xVM9tIjtBCBtGa2EKQlpUUYJtBBsn/9ibY1C91tzvPM2D9sENAf2ur7jr8IjPx5CfVmAznaKfbYWMz+OiGCqPGsQd+eP9r8dw6ETAST6M/Nij+WFjiXRIL/l/kJjr6ob7aJa5TjSeMVETOVV6EBfPWewoVBBE73dgBF974QBBTEEnOQdd3nxrqoxVryYp2eslb7z8Taqo9BE17G8FX34bPjWJMkErMwWc/j6Alr4HHdRTq9+yHeCal+/85pFcp/wYFQYyg41AGPK4jSOYY+A4ewx91bZknYsO/TUIoLvv8Nwvfw4U3/ajjgREc1wVjvYLgvrFOL6ZzN1gAWeZy8xlcPn9hbGU9A7//mYD7yUfweHkRpuIPYCWb2aQ3j+Piww4cMSaInkfc7FIOE7KFnkZxelpKIjX8y6TwqwgSM4IiQ65gBjbOWuw5xpolMI8vWz8S5OKZJDr7JxBfTZnWXcmuinuNo9qcAudeiVlILeo0YZUc4UV+yV/LB48hP2E8C/53+egZcSdnt0quTDgljGDTfd5btQ3iPvLrt5rzZOHZrlFxaervlX0vvpoE0wTBAsj3CI/z0agGpQ8qZyIplwg6JTjmNfRLwc45bnBYed0yJdzTr3fAqUMnCtWC0ktPZEBTXvFfkjGJtB3JUVE2RZCWhojc8PSJZFujcnaK6p77AyXTDZF7B6sIyZkmyCFmz2E3K5mMZFoaOZI7xDvlwXvPIjC+OK2bB0lHCbDxJ9NbEngpMODP7LABP2JX6DcSvoSVg8qaAlrG8YVpIzVBTulm5pcX4PrcHTALLoxn51EjQbUFqGoQ6L2+er+uHtVqhRwt7fnwF2AFtOEX8YZby2W9QLnh+Vj4EOW/z2dH4O67/aJbIYzj2DCmHSWyKXB8Bz2io6HORXwUNg09Dwas5U70v1T3VIPczQAfwn+vlJJV5z+qBiexn7uEFqTUQv6o+GQxyEevR++YaQy2gvGwzA2oYfU7HbaXy6Vkk2fvibtr7L1N47R0RLQJP0DJkRTp838sQiT1SFjcbEAUQ9rgDQk8eSikVFzmQVzmXi3h2ZNyZWi9a7ifqBD4zdS5kPgx1abJj5v1l0/LTdoVA/qelOPtify5TaHUpQOTac7gKuwwOPBgQnWotGlf/BfuR3f7D9eiFdtgB4Bld2ipO3RNPaZZ1uvGfDP5g8ntA4coppW3i4c1u5n1f17pwq8xTOCVAh6IhrO5tXatOf3jN53IrhTkZZ0qecSn2w+SIjptgCILKgzR5gH06ZEjmNrPHcCTB6yLQdyrdkMFQFZbz60Ftc4Di2HpEL1AFNhx1HRbUM1bjA9lc38PmiFWFkE1aFMt76lZM5c3Xm4lyctdOkcSLIrPYZ7jD58HyvszxL9qhQVUbdIgoAAAAABJRU5ErkJggg==" alt="AgroConnect" style="width:52px;height:52px;object-fit:contain;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto;border-radius:8px;background:rgba(255,255,255,0.15);padding:4px"/>
              <h1 style="color:white;margin:0;font-size:26px">AgroConnect</h1>
              <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px">Subscription Invoice</p>
            </div>

            <div style="padding:32px">
              <p style="font-size:15px;color:#374151;margin:0 0 8px">Hi <strong>${customerName}</strong>,</p>
              <p style="font-size:14px;color:#6b7280;margin:0 0 24px">
                Your subscription period has ended. Here is your detailed invoice for the products you received.
              </p>

              <!-- Invoice Meta -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
                <div style="background:#f9fafb;border-radius:8px;padding:14px">
                  <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Subscription</div>
                  <div style="font-weight:700;font-size:14px;color:#111827">${subscriptionId}</div>
                  <div style="font-size:13px;color:#6b7280;margin-top:2px">${planName} Â· ${planType}</div>
                </div>
                <div style="background:#f9fafb;border-radius:8px;padding:14px">
                  <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Period</div>
                  <div style="font-size:13px;color:#374151">${fmt(startDate)} â€“ ${fmt(endDate)}</div>
                  <div style="font-size:13px;color:#6b7280;margin-top:2px">${deliveryFrequency} delivery</div>
                </div>
              </div>

              <!-- Farmer info -->
              <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px;margin-bottom:24px;font-size:13px;color:#166534">
                <strong>From:</strong> ${farmerName}
              </div>

              <!-- Daily breakdown -->
              <h3 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 12px;border-bottom:2px solid #22c55e;padding-bottom:8px">
                Daily Product Breakdown
              </h3>

              ${dayRows.length > 0 ? `
              <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
                <thead>
                  <tr style="background:#f9fafb">
                    <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.5px">Product</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.5px">Qty</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.5px">Unit Price</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.5px">Total</th>
                  </tr>
                </thead>
                <tbody>${dayRows}</tbody>
              </table>` : `
              <div style="padding:20px;background:#f9fafb;border-radius:8px;text-align:center;color:#9ca3af;font-size:14px;margin-bottom:24px">
                No daily product selections recorded.
              </div>`}

              <!-- Totals -->
              <div style="margin-left:auto;max-width:280px">
                <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;color:#374151;border-top:1px solid #e5e7eb">
                  <span>Subtotal</span><span>â‚¹${subtotal.toFixed(2)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;color:#22c55e">
                  <span>Subscription Discount (${discountPercentage}%)</span>
                  <span>-â‚¹${discountAmount.toFixed(2)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:12px 0;font-size:18px;font-weight:700;color:#22c55e;border-top:2px solid #22c55e;margin-top:4px">
                  <span>Total Due</span><span>â‚¹${totalDue.toFixed(2)}</span>
                </div>
              </div>

              <!-- Note -->
              <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px;border-radius:0 8px 8px 0;margin-top:24px;font-size:13px;color:#92400e">
                <strong>Payment Note:</strong> Please pay â‚¹${totalDue.toFixed(2)} to your farmer upon next delivery or via the agreed payment method.
              </div>
            </div>

            <!-- Footer -->
            <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb">
              <p style="margin:0;color:#6b7280;font-size:12px">Thank you for choosing AgroConnect! Supporting local farmers. ðŸŒ±</p>
            </div>
          </div>
        </div>
      `
    });

    console.log(`âœ… Subscription invoice sent to: ${customerEmail}`);
  } catch (err) {
    console.error('Failed to send subscription invoice:', err);
  }
};
