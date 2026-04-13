import nodemailer from 'nodemailer';

// Smart transporter: uses ZeptoMail if configured, falls back to Gmail
const createTransporter = () => {
  if (process.env.ZEPTOMAIL_PASSWORD) {
    return nodemailer.createTransport({
      host: 'smtp.zeptomail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ZEPTOMAIL_USER || 'emailapikey',
        pass: process.env.ZEPTOMAIL_PASSWORD,
      },
      tls: {
        minVersion: 'TLSv1.2',
      },
    });
  }

  if (process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_USER) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  console.error('[email] No email provider configured');
  throw new Error(
    'No email provider configured. Set ZEPTOMAIL_PASSWORD or GMAIL_APP_PASSWORD + GMAIL_USER environment variables.'
  );
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
 * Send an email using the configured SMTP provider (ZeptoMail or Gmail)
 */
export async function sendEmail({ to, subject, html, text, attachments }: SendEmailOptions): Promise<void> {
  const provider = process.env.ZEPTOMAIL_PASSWORD ? 'ZeptoMail' : 'Gmail';
  console.log(`[email] Using provider: ${provider}, sending to: ${to}, subject: "${subject}"`);

  try {
    const transporter = createTransporter();

    // Verify SMTP connection before sending
    await transporter.verify();
    console.log('[email] SMTP connection verified');

    // Derive sender based on active provider
    const senderEmail = process.env.ZEPTOMAIL_SENDER_EMAIL
      || (process.env.GMAIL_USER ? process.env.GMAIL_USER : 'noreply@accezzlive.com');
    const senderName = process.env.ZEPTOMAIL_SENDER_NAME || 'Accezz';

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      html,
      text: text || subject,
      attachments: attachments || [],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[email] Sent successfully. MessageId: ${info.messageId}`);
  } catch (error) {
    console.error(`[email] Failed (provider: ${provider}, to: ${to}):`, error);
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
            <a href="https://x.com/accezz_live">𝕏</a>
            <a href="https://www.instagram.com/accezzlive/">in</a>
            <a href="https://www.facebook.com/accezzlive/">fb</a>
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
  isVirtual?: boolean;
  virtualAccessLink?: string;
  virtualPlatform?: string;
  virtualMeetingId?: string;
}): string {
  const firstName = data.fullName?.split(' ')[0] || 'there';
  const ticketList = data.ticketCodes.map((code, index) => 
    `<div class="ticket-card">
      <div class="ticket-number">Ticket ${index + 1}</div>
      <div class="ticket-code">${code}</div>
    </div>`
  ).join('');

  const isVirtualEvent = Boolean(data.isVirtual);
  const formatPlatform = (value?: string) => {
    if (!value) return 'Online Session';
    return value.split(/[-_]/g).map(segment => segment.charAt(0).toUpperCase() + segment.slice(1)).join(' ');
  };
  const virtualAccessSection = isVirtualEvent
    ? `<div class="virtual-card">
        <h3>Virtual Access</h3>
        <div class="virtual-row">
          <span class="virtual-label">Platform</span>
          <span class="virtual-value">${formatPlatform(data.virtualPlatform)}</span>
        </div>
        ${data.virtualMeetingId ? `<div class="virtual-row">
            <span class="virtual-label">Meeting ID</span>
            <span class="virtual-value">${data.virtualMeetingId}</span>
          </div>` : ''}
        <div class="virtual-link">
          ${data.virtualAccessLink
            ? `<a href="${data.virtualAccessLink}" target="_blank" rel="noopener noreferrer">Join Virtual Session</a>`
            : 'Your access link has been sent to your email. Please check your inbox for instructions.'}
        </div>
      </div>`
    : '';

  const qrSection = (!isVirtualEvent && data.qrCodeUrl)
    ? `<div class="qr-section">
        <h3>Your Entry QR Code</h3>
        <div class="qr-code-container">
          <img src="${data.qrCodeUrl}" alt="Ticket QR Code" />
        </div>
        <p>Show this QR code at the event entrance for quick check-in.</p>
      </div>`
    : '';

  const importantInfoList = isVirtualEvent
    ? `
      <li>Keep this email safe – you'll need your ticket codes for reference</li>
      <li>Join the session using the virtual access details above a few minutes before start time</li>
      <li>Ensure your internet connection and audio/video setup are ready ahead of time</li>
      <li>Contact the event organizer directly for any event-specific questions</li>
      <li>Tickets are non-transferable unless stated otherwise</li>
    `
    : `
      <li>Keep this email safe – you'll need your ticket code${data.quantity > 1 ? 's' : ''} for entry</li>
      <li>Arrive early to avoid queues and ensure smooth check-in</li>
      <li>Present your QR code (digital or printed) at the entrance</li>
      <li>Contact the event organizer directly for any event-specific questions</li>
      <li>Tickets are non-transferable unless stated otherwise</li>
    `;

  const introMessage = isVirtualEvent
    ? `Great news! Your ticket purchase has been confirmed. We've included your virtual access details below for <strong>${data.eventTitle}</strong>.`
    : `Great news! Your ticket purchase has been confirmed. Get ready for an amazing experience at <strong>${data.eventTitle}</strong>!`;

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
        .virtual-card {
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          border-radius: 16px;
          border: 2px solid #cbd5f5;
          padding: 30px;
          margin: 30px 0;
        }
        .virtual-card h3 {
          font-size: 18px;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 18px;
          text-align: center;
        }
        .virtual-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .virtual-row:last-child {
          border-bottom: none;
        }
        .virtual-label {
          color: #718096;
          font-size: 14px;
          font-weight: 500;
        }
        .virtual-value {
          color: #2d3748;
          font-size: 15px;
          font-weight: 600;
        }
        .virtual-link a {
          display: inline-block;
          margin-top: 18px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #f54502 0%, #ff6b35 100%);
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 9999px;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 8px 20px rgba(245, 69, 2, 0.2);
          word-break: break-all;
        }
        .virtual-link {
          text-align: center;
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
          width: 220px;
          height: 220px;
          display: block;
          border-radius: 8px;
          object-fit: contain;
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
          .qr-code-container img {
            width: 180px;
            height: 180px;
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
            ${introMessage}
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

          ${qrSection}

          ${virtualAccessSection}

          <div class="important-info">
            <h4>Important Information</h4>
            <ul class="info-list">
              ${importantInfoList}
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

/**
 * Generate abandoned cart email HTML
 */
export function generateAbandonedCartEmailHTML(data: {
  fullName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  ticketType: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  orderId: string;
  eventSlug: string;
}): string {
  const firstName = data.fullName?.split(' ')[0] || 'there';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accezz.com';
  const completePurchaseUrl = `${baseUrl}/${data.eventSlug}?orderId=${data.orderId}`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Complete Your Purchase</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.5;
          color: #333333;
          background-color: #f5f5f5;
          padding: 20px;
        }
        .email-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
        }
        .content {
          padding: 40px 30px;
          text-align: left;
        }
        .greeting {
          font-size: 18px;
          color: #333333;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .message {
          font-size: 16px;
          color: #666666;
          margin-bottom: 20px;
          line-height: 1.6;
        }
        .cta-button {
          display: inline-block;
          padding: 16px 40px;
          background-color: #f54502;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
        }
        .logo-footer {
          margin-bottom: 15px;
        }
        .logo-footer img {
          max-width: 120px;
          height: auto;
        }
        .footer {
          background-color: #f9f9f9;
          padding: 30px;
          text-align: left;
          border-top: 1px solid #e5e5e5;
        }
        .contact-section {
          margin-bottom: 20px;
        }
        .contact-title {
          font-size: 14px;
          color: #666666;
          font-weight: 600;
          margin-bottom: 15px;
        }
        .social-links {
          display: flex;
          justify-content: flex-start;
          gap: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .social-link {
          display: inline-block;
          text-decoration: none;
          padding: 8px;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          transition: all 0.2s;
          background-color: #ffffff;
        }
        .social-link:hover {
          background-color: #f5f5f5;
          border-color: #f54502;
        }
        .social-icon {
          width: 24px;
          height: 24px;
          display: block;
          border: none;
        }
        .support-email {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #e5e5e5;
        }
        .support-email a {
          color: #f54502;
          text-decoration: none;
          font-size: 14px;
        }
        .support-email a:hover {
          text-decoration: underline;
        }
        .footer-text {
          font-size: 12px;
          color: #999999;
          margin: 10px 0 0 0;
        }
        .emoji {
          font-size: 18px;
        }
        @media only screen and (max-width: 600px) {
          body {
            padding: 10px;
          }
          .content {
            padding: 30px 20px;
            text-align: left;
          }
          .greeting {
            font-size: 16px;
          }
          .message {
            font-size: 15px;
          }
          .cta-button {
            padding: 14px 32px;
            font-size: 15px;
            display: block;
            width: 100%;
            text-align: center;
          }
          .footer {
            padding: 20px;
            text-align: left;
          }
          .social-links {
            gap: 10px;
            justify-content: flex-start;
          }
          .social-link {
            padding: 6px;
          }
          .social-icon {
            width: 20px;
            height: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="content">
          <p class="greeting">Hey ${firstName}! <span class="emoji">👋</span></p>
          
          <p class="message">
            We noticed you started grabbing your <strong>${data.eventTitle}</strong> tickets but didn't finish your order.
          </p>
          
          <p class="message">
            Everything okay?
          </p>
          
          <p class="message">
            If you ran into any issue, we're here to help — just reach out to our support team and we'll sort it out fast.
          </p>
          
          <p class="message">
            But if you're good to go, you can pick up right where you left off:
          </p>

          <a href="${completePurchaseUrl}" class="cta-button">
             Complete your purchase
          </a>
          
          <p class="message" style="margin-top: 30px;">
            Can't wait to have you with us!
          </p>
        </div>
        
        <div class="footer">
          <div class="logo-footer">
            <img src="https://kckdkipdodkfszakqwui.supabase.co/storage/v1/object/public/logo/accezz%20logo.png" alt="Accezz Logo">
          </div>
          
          <div class="contact-section">
            <p class="contact-title">Follow Us</p>
            <div class="social-links">
              <a href="https://x.com/accezzlive" class="social-link" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: #000000;">
                <img src="https://img.icons8.com/ios-filled/50/000000/twitterx.png" alt="X (Twitter)" class="social-icon" width="24" height="24" style="display: block; border: none;" />
              </a>
              <a href="https://www.instagram.com/accezzlive/" class="social-link" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: #E4405F;">
                <img src="https://img.icons8.com/ios-filled/50/E4405F/instagram-new.png" alt="Instagram" class="social-icon" width="24" height="24" style="display: block; border: none;" />
              </a>
              <a href="https://www.tiktok.com/@accezzlive?lang=en" class="social-link" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: #000000;">
                <img src="https://img.icons8.com/ios-filled/50/000000/tiktok.png" alt="TikTok" class="social-icon" width="24" height="24" style="display: block; border: none;" />
              </a>
              <a href="https://wa.me/2347018610048" class="social-link" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: #25D366;">
                <img src="https://img.icons8.com/ios-filled/50/25D366/whatsapp.png" alt="WhatsApp" class="social-icon" width="24" height="24" style="display: block; border: none;" />
              </a>
            </div>
          </div>
          
          <div class="support-email">
            <p style="font-size: 14px; color: #666666; margin-bottom: 8px;">Need help?</p>
            <a href="mailto:support@accezzlive.com">support@accezzlive.com</a>
          </div>
          
          <p class="footer-text">
            The Accezz Team
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate event reminder email HTML
 */
export function generateEventReminderEmailHTML(data: {
  fullName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  ticketCode: string;
  isVirtual?: boolean;
  virtualAccessLink?: string;
  virtualPlatform?: string;
  hoursUntilEvent: number;
}): string {
  const firstName = data.fullName?.split(' ')[0] || 'there';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accezzlive.com';
  const timeLabel = data.hoursUntilEvent <= 2
    ? `in ${data.hoursUntilEvent} hour${data.hoursUntilEvent === 1 ? '' : 's'}`
    : data.hoursUntilEvent <= 24
    ? 'tomorrow'
    : 'soon';

  const isVirtualEvent = Boolean(data.isVirtual);
  const accessSection = isVirtualEvent && data.virtualAccessLink
    ? `<div style="margin: 22px 0; padding: 18px 20px; border-radius: 14px; background: linear-gradient(135deg, rgba(59,130,246,0.08), rgba(15,118,110,0.08)); border: 1px solid rgba(59,130,246,0.15);">
        <p style="margin: 0 0 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.14em; color: #0f766e; font-weight: 600;">Virtual Access Link</p>
        <a href="${data.virtualAccessLink}" style="font-size: 15px; color: #2563eb; word-break: break-all;">${data.virtualAccessLink}</a>
      </div>`
    : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Reminder – ${data.eventTitle}</title>
    </head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;">
      <div style="padding: 32px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(15,23,42,0.12);">
          <tr>
            <td style="padding:38px 32px 28px;text-align:center;background:linear-gradient(135deg,#f97316 0%,#ef4444 100%);color:#ffffff;">
              <div style="font-size:44px;margin-bottom:14px;">⏰</div>
              <h1 style="margin:0;font-size:26px;font-weight:700;letter-spacing:0.02em;">Your Event is ${timeLabel}!</h1>
              <p style="margin:10px 0 0;font-size:15px;opacity:0.9;">${data.eventTitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px 10px;">
              <p style="margin:0 0 18px;font-size:16px;color:#111827;font-weight:600;">Hey ${firstName}!</p>
              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
                Just a friendly reminder — <strong>${data.eventTitle}</strong> is happening ${timeLabel}. Get ready for an amazing experience!
              </p>
              <div style="margin:22px 0;padding:20px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
                  <tr>
                    <td style="padding:6px 0;">
                      <span style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;">Date</span><br>
                      <span style="font-size:15px;color:#111827;font-weight:600;">${data.eventDate}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;">
                      <span style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;">Time</span><br>
                      <span style="font-size:15px;color:#111827;font-weight:600;">${data.eventTime}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;">
                      <span style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;">${isVirtualEvent ? 'Platform' : 'Venue'}</span><br>
                      <span style="font-size:15px;color:#111827;font-weight:600;">${data.venue}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;">
                      <span style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;">Ticket Code</span><br>
                      <span style="font-size:15px;color:#f97316;font-weight:700;letter-spacing:0.12em;">${data.ticketCode}</span>
                    </td>
                  </tr>
                </table>
              </div>
              ${accessSection}
              <div style="text-align:center;margin:28px 0 10px;">
                <a href="${baseUrl}/dashboard" style="display:inline-block;padding:14px 28px;border-radius:9999px;background:linear-gradient(135deg,#f97316,#ef4444);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;box-shadow:0 12px 22px rgba(249,115,22,0.28);">
                  View My Tickets
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 28px;text-align:center;background:#f8fafc;color:#94a3b8;font-size:12px;">
              © ${new Date().getFullYear()} Accezz. All rights reserved. · <a href="mailto:support@accezzlive.com" style="color:#94a3b8;">support@accezzlive.com</a>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;
}