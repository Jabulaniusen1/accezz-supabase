import nodemailer from 'nodemailer';

// Google SMTP Configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

interface Attachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Attachment[];
}

/**
 * Send an email using Google SMTP
 */
export async function sendEmail({ to, subject, html, text, attachments }: SendEmailOptions): Promise<void> {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      throw new Error('Gmail SMTP credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.GMAIL_SENDER_NAME || 'Accezz'}" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || subject,
      attachments: attachments || [],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Generate welcome email HTML
 */
export function generateWelcomeEmailHTML(fullName: string): string {
  const firstName = fullName?.split(' ')[0] || 'there';
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Accezz</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
        }
        .email-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .header {
          background: linear-gradient(135deg, #f54502 0%, #ff6b35 100%);
          padding: 40px 40px 60px;
          text-align: center;
          position: relative;
        }
        .header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          background: #ffffff;
          border-radius: 50% 50% 0 0 / 100% 100% 0 0;
        }
        .logo {
          margin-bottom: 20px;
        }
        .logo img {
          max-width: 140px;
          height: auto;
          filter: brightness(0) invert(1);
        }
        .header h1 {
          color: #ffffff;
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          position: relative;
          z-index: 1;
        }
        .content {
          padding: 40px 40px 20px;
        }
        .greeting {
          font-size: 20px;
          color: #1a1a1a;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .message {
          font-size: 16px;
          color: #4a5568;
          margin-bottom: 16px;
          line-height: 1.8;
        }
        .features {
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          border-radius: 12px;
          padding: 30px;
          margin: 30px 0;
        }
        .features h3 {
          color: #2d3748;
          font-size: 18px;
          margin-bottom: 20px;
          text-align: center;
        }
        .feature-grid {
          display: grid;
          gap: 16px;
        }
        .feature-item {
          display: flex;
          align-items: start;
          padding: 16px;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s;
        }
        .feature-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #f54502 0%, #ff6b35 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 16px;
          flex-shrink: 0;
        }
        .feature-icon::before {
          content: '✓';
          color: #ffffff;
          font-size: 20px;
          font-weight: bold;
        }
        .feature-text {
          color: #4a5568;
          font-size: 15px;
          line-height: 1.6;
        }
        .cta-container {
          text-align: center;
          margin: 40px 0;
        }
        .cta-button {
          display: inline-block;
          padding: 16px 48px;
          background: linear-gradient(135deg, #f54502 0%, #ff6b35 100%);
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 50px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 10px 30px rgba(245, 69, 2, 0.3);
          transition: all 0.3s ease;
        }
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(245, 69, 2, 0.4);
        }
        .help-section {
          background: #fff8f3;
          border-left: 4px solid #f54502;
          padding: 20px;
          border-radius: 8px;
          margin: 30px 0;
        }
        .help-section p {
          color: #4a5568;
          font-size: 14px;
          margin: 0;
        }
        .footer {
          background: #f7fafc;
          padding: 30px 40px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
        }
        .footer-signature {
          font-size: 15px;
          color: #2d3748;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .footer-team {
          font-size: 15px;
          color: #718096;
          margin-bottom: 20px;
        }
        .footer-note {
          font-size: 13px;
          color: #a0aec0;
          margin: 0;
        }
        .social-links {
          margin: 20px 0;
        }
        .social-links a {
          display: inline-block;
          width: 36px;
          height: 36px;
          background: #e2e8f0;
          border-radius: 50%;
          margin: 0 6px;
          line-height: 36px;
          color: #4a5568;
          text-decoration: none;
          transition: all 0.3s ease;
        }
        .social-links a:hover {
          background: #f54502;
          color: #ffffff;
          transform: translateY(-2px);
        }
        @media only screen and (max-width: 600px) {
          body {
            padding: 20px 10px;
          }
          .content {
            padding: 30px 20px 15px;
          }
          .header {
            padding: 30px 20px 50px;
          }
          .header h1 {
            font-size: 24px;
          }
          .features {
            padding: 20px;
          }
          .cta-button {
            padding: 14px 36px;
            font-size: 15px;
          }
          .footer {
            padding: 25px 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <div class="logo">
            <img src="https://kckdkipdodkfszakqwui.supabase.co/storage/v1/object/public/logo/accezz%20logo.png" alt="Accezz Logo">
          </div>
          <h1>Welcome to Accezz!</h1>
        </div>
        
        <div class="content">
          <p class="greeting">Hi ${firstName}! 👋</p>
          
          <p class="message">
            We're absolutely thrilled to have you join the Accezz community! You've just taken the first step towards effortless event management.
          </p>
          
          <p class="message">
            Whether you're planning intimate gatherings or large-scale events, Accezz is here to make every aspect seamless and enjoyable.
          </p>
          
          <div class="features">
            <h3>What You Can Do with Accezz</h3>
            <div class="feature-grid">
              <div class="feature-item">
                <div class="feature-icon"></div>
                <div class="feature-text">
                  <strong>Create & Manage Events</strong><br>
                  Set up stunning event pages in minutes with our intuitive builder
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon"></div>
                <div class="feature-text">
                  <strong>Sell Tickets Securely</strong><br>
                  Accept payments with confidence using our secure payment processing
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon"></div>
                <div class="feature-text">
                  <strong>Track Analytics</strong><br>
                  Get real-time insights into ticket sales and attendee engagement
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon"></div>
                <div class="feature-text">
                  <strong>Email Marketing</strong><br>
                  Keep attendees engaged with targeted email campaigns
                </div>
              </div>
            </div>
          </div>
          
          <div class="cta-container">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://accezz.com'}/dashboard" class="cta-button">
              Get Started Now
            </a>
          </div>
          
          <div class="help-section">
            <p>
              <strong>Need help getting started?</strong><br>
              Our support team is here for you. Feel free to reach out anytime – we're always happy to help!
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p class="footer-signature">Best regards,</p>
          <p class="footer-team">The Accezz Team</p>
          <div class="social-links">
            <a href="#">𝕏</a>
            <a href="#">in</a>
            <a href="#">f</a>
          </div>
          <p class="footer-note">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate ticket email HTML
 */
export function generateTicketEmailHTML(data: {
  fullName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  ticketType: string;
  quantity: number;
  ticketCodes: string[];
  totalAmount: number;
  currency: string;
  orderId: string;
  qrCodeUrl?: string;
}): string {
  const firstName = data.fullName?.split(' ')[0] || 'there';
  const ticketList = data.ticketCodes.map((code, index) => 
    `<div class="ticket-card">
      <div class="ticket-number">Ticket ${index + 1}</div>
      <div class="ticket-code">${code}</div>
    </div>`
  ).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Tickets - ${data.eventTitle}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
        }
        .email-wrapper {
          max-width: 650px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .header {
          background: linear-gradient(135deg, #f54502 0%, #ff6b35 100%);
          padding: 40px 40px 60px;
          text-align: center;
          position: relative;
        }
        .header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          background: #ffffff;
          border-radius: 50% 50% 0 0 / 100% 100% 0 0;
        }
        .logo {
          margin-bottom: 20px;
        }
        .logo img {
          max-width: 140px;
          height: auto;
          filter: brightness(0) invert(1);
        }
        .header h1 {
          color: #ffffff;
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          position: relative;
          z-index: 1;
        }
        .success-icon {
          width: 80px;
          height: 80px;
          background: #ffffff;
          border-radius: 50%;
          margin: 20px auto 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          position: relative;
          z-index: 1;
        }
        .content {
          padding: 40px 40px 20px;
        }
        .greeting {
          font-size: 20px;
          color: #1a1a1a;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .message {
          font-size: 16px;
          color: #4a5568;
          margin-bottom: 16px;
          line-height: 1.8;
        }
        .event-card {
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          border-radius: 16px;
          padding: 30px;
          margin: 30px 0;
          border: 2px solid #e2e8f0;
        }
        .event-title {
          font-size: 22px;
          color: #2d3748;
          font-weight: 700;
          margin-bottom: 24px;
          text-align: center;
          padding-bottom: 16px;
          border-bottom: 2px solid #cbd5e0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          color: #718096;
          font-size: 14px;
          font-weight: 500;
        }
        .detail-value {
          color: #2d3748;
          font-size: 15px;
          font-weight: 600;
          text-align: right;
        }
        .tickets-section {
          margin: 30px 0;
        }
        .tickets-header {
          font-size: 20px;
          color: #2d3748;
          font-weight: 700;
          margin-bottom: 20px;
          text-align: center;
        }
        .ticket-card {
          background: #ffffff;
          border: 2px dashed #f54502;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
          text-align: center;
          transition: all 0.3s ease;
        }
        .ticket-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(245, 69, 2, 0.15);
        }
        .ticket-number {
          font-size: 13px;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .ticket-code {
          font-size: 24px;
          color: #f54502;
          font-weight: 700;
          font-family: 'Courier New', monospace;
          letter-spacing: 2px;
          padding: 12px;
          background: #fff8f3;
          border-radius: 8px;
        }
        .qr-section {
          background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%);
          border-radius: 16px;
          padding: 30px;
          text-align: center;
          margin: 30px 0;
          border: 2px solid #e2e8f0;
        }
        .qr-section h3 {
          color: #2d3748;
          font-size: 18px;
          margin-bottom: 20px;
        }
        .qr-code-container {
          background: #ffffff;
          padding: 20px;
          border-radius: 12px;
          display: inline-block;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .qr-code-container img {
          max-width: 220px;
          display: block;
          border-radius: 8px;
        }
        .important-info {
          background: linear-gradient(135deg, #fef5e7 0%, #fdebd0 100%);
          border-left: 4px solid #f39c12;
          border-radius: 8px;
          padding: 24px;
          margin: 30px 0;
        }
        .important-info h4 {
          color: #875a28;
          font-size: 16px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .important-info h4::before {
          content: '⚠️';
          font-size: 20px;
        }
        .info-list {
          list-style: none;
          padding: 0;
        }
        .info-list li {
          color: #7d6b3f;
          font-size: 14px;
          padding: 8px 0;
          padding-left: 24px;
          position: relative;
        }
        .info-list li::before {
          content: '•';
          position: absolute;
          left: 8px;
          color: #f39c12;
          font-weight: bold;
        }
        .summary-box {
          background: linear-gradient(135deg, #f54502 0%, #ff6b35 100%);
          color: #ffffff;
          border-radius: 12px;
          padding: 24px;
          margin: 30px 0;
          text-align: center;
        }
        .summary-box .amount {
          font-size: 36px;
          font-weight: 700;
          margin: 12px 0;
        }
        .summary-box .label {
          font-size: 14px;
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .footer {
          background: #f7fafc;
          padding: 30px 40px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
        }
        .footer-signature {
          font-size: 15px;
          color: #2d3748;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .footer-team {
          font-size: 15px;
          color: #718096;
          margin-bottom: 20px;
        }
        .footer-note {
          font-size: 13px;
          color: #a0aec0;
          margin: 0;
        }
        .divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #e2e8f0, transparent);
          margin: 30px 0;
        }
        @media only screen and (max-width: 600px) {
          body {
            padding: 20px 10px;
          }
          .content {
            padding: 30px 20px 15px;
          }
          .header {
            padding: 30px 20px 50px;
          }
          .header h1 {
            font-size: 24px;
          }
          .event-card, .qr-section, .important-info {
            padding: 20px;
          }
          .ticket-code {
            font-size: 18px;
          }
          .summary-box .amount {
            font-size: 28px;
          }
          .footer {
            padding: 25px 20px;
          }
          .detail-row {
            flex-direction: column;
            gap: 4px;
          }
          .detail-value {
            text-align: left;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <div class="logo">
            <img src="https://kckdkipdodkfszakqwui.supabase.co/storage/v1/object/public/logo/accezz%20logo.png" alt="Accezz Logo">
          </div>
          <h1>Ticket Confirmation</h1>
          <div class="success-icon">🎉</div>
        </div>
        
        <div class="content">
          <p class="greeting">Hi ${firstName}!</p>
          
          <p class="message">
            Great news! Your ticket purchase has been confirmed. Get ready for an amazing experience at <strong>${data.eventTitle}</strong>!
          </p>
          
          <div class="event-card">
            <div class="event-title">${data.eventTitle}</div>
            <div class="detail-row">
              <span class="detail-label">📅 Date</span>
              <span class="detail-value">${data.eventDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🕐 Time</span>
              <span class="detail-value">${data.eventTime}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📍 Venue</span>
              <span class="detail-value">${data.venue}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🎫 Ticket Type</span>
              <span class="detail-value">${data.ticketType}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🔢 Quantity</span>
              <span class="detail-value">${data.quantity}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🆔 Order ID</span>
              <span class="detail-value">${data.orderId}</span>
            </div>
          </div>

          <div class="summary-box">
            <div class="label">Total Amount Paid</div>
            <div class="amount">${data.currency} ${data.totalAmount.toLocaleString()}</div>
          </div>

          <div class="tickets-section">
            <div class="tickets-header">Your Ticket Code${data.quantity > 1 ? 's' : ''}</div>
            ${ticketList}
          </div>

          ${data.qrCodeUrl ? `
          <div class="qr-section">
            <h3>Your Entry QR Code</h3>
            <p class="message" style="margin-bottom: 20px;">Show this QR code at the event entrance for quick check-in</p>
            <div class="qr-code-container">
              <img src="${data.qrCodeUrl}" alt="Event Entry QR Code" />
            </div>
          </div>
          ` : ''}

          <div class="important-info">
            <h4>Important Information</h4>
            <ul class="info-list">
              <li>Keep this email safe – you'll need your ticket code${data.quantity > 1 ? 's' : ''} for entry</li>
              <li>Arrive early to avoid queues and ensure smooth check-in</li>
              <li>Present your QR code (digital or printed) at the entrance</li>
              <li>Contact the event organizer directly for any event-specific questions</li>
              <li>Tickets are non-transferable unless stated otherwise</li>
            </ul>
          </div>
          
          <div class="divider"></div>
          
          <p class="message" style="text-align: center; font-weight: 600; color: #2d3748;">
            We can't wait to see you there! Have an incredible time! 🎊
          </p>
        </div>
        
        <div class="footer">
          <p class="footer-signature">Best regards,</p>
          <p class="footer-team">The Accezz Team</p>
          <p class="footer-note">
            This is an automated confirmation email. Please do not reply to this message.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}