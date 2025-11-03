import nodemailer from 'nodemailer';

// Google SMTP Configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
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
    // Validate environment variables
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      throw new Error('Gmail SMTP credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.GMAIL_SENDER_NAME || 'Accezz'}" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || subject, // Fallback to subject if no text provided
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
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: #ffffff;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo img {
          max-width: 150px;
          height: auto;
        }
        h2 {
          color: #f54502;
          font-size: 24px;
          margin-bottom: 20px;
          text-align: center;
        }
        p {
          margin-bottom: 16px;
          font-size: 16px;
          color: #555;
        }
        .button {
          display: inline-block;
          padding: 14px 32px;
          background-color: #f54502;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          text-align: center;
          margin: 20px 0;
          transition: background-color 0.3s;
        }
        .button:hover {
          background-color: #d63a02;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 14px;
          color: #999;
          text-align: center;
        }
        .footer p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <img src="https://kckdkipdodkfszakqwui.supabase.co/storage/v1/object/public/logo/accezzlogoc%20(2).webp" alt="Accezz Logo" width="150" height="auto">
        </div>
        <h2>Welcome to Accezz, ${firstName}!</h2>
        <p>Thank you for joining Accezz! We're thrilled to have you on board.</p>
        <p>You're now part of a community that makes event management and ticket sales simple and seamless.</p>
        <p>Here's what you can do with Accezz:</p>
        <ul style="color: #555; font-size: 16px; line-height: 1.8;">
          <li>Create and manage events effortlessly</li>
          <li>Sell tickets online with secure payment processing</li>
          <li>Track your event analytics and attendees</li>
          <li>Send email marketing campaigns to your attendees</li>
        </ul>
        
        <div class="button-container">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://accezz.com'}/dashboard" class="button">Go to Dashboard</a>
        </div>
        
        <p style="font-size: 14px; color: #777;">
          If you have any questions or need help getting started, feel free to reach out to us.
        </p>
        
        <div class="footer">
          <p>Best regards,</p>
          <p>The Accezz Team</p>
          <p style="margin-top: 20px;">This is an automated email. Please do not reply directly to this message.</p>
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
    `<li style="margin: 10px 0; padding: 10px; background-color: #f9f9f9; border-radius: 6px;">
      <strong>Ticket ${index + 1}:</strong> ${code}
    </li>`
  ).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Tickets - ${data.eventTitle}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: #ffffff;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo img {
          max-width: 150px;
          height: auto;
        }
        h2 {
          color: #f54502;
          font-size: 24px;
          margin-bottom: 20px;
          text-align: center;
        }
        .event-details {
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .event-details h3 {
          color: #333;
          margin-top: 0;
          margin-bottom: 15px;
        }
        .event-details p {
          margin: 8px 0;
          color: #555;
        }
        .ticket-codes {
          background-color: #fff;
          padding: 20px;
          border: 2px solid #f54502;
          border-radius: 8px;
          margin: 20px 0;
        }
        .ticket-codes h3 {
          color: #f54502;
          margin-top: 0;
        }
        .ticket-codes ul {
          list-style: none;
          padding: 0;
        }
        .qr-code {
          text-align: center;
          margin: 20px 0;
        }
        .qr-code img {
          max-width: 200px;
          border: 2px solid #f54502;
          border-radius: 8px;
          padding: 10px;
          background: white;
        }
        p {
          margin-bottom: 16px;
          font-size: 16px;
          color: #555;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 14px;
          color: #999;
          text-align: center;
        }
        .footer p {
          margin: 5px 0;
        }
        .info-box {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info-box p {
          margin: 5px 0;
          font-size: 14px;
          color: #856404;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <img src="https://kckdkipdodkfszakqwui.supabase.co/storage/v1/object/public/logo/accezzlogoc%20(2).webp" alt="Accezz Logo" width="150" height="auto">
        </div>
        <h2>Your Tickets Are Here! 🎉</h2>
        <p>Hi ${firstName},</p>
        <p>Thank you for your purchase! Your tickets for <strong>${data.eventTitle}</strong> are confirmed.</p>
        
        <div class="event-details">
          <h3>Event Details</h3>
          <p><strong>Event:</strong> ${data.eventTitle}</p>
          <p><strong>Date:</strong> ${data.eventDate}</p>
          <p><strong>Time:</strong> ${data.eventTime}</p>
          <p><strong>Venue:</strong> ${data.venue}</p>
          <p><strong>Ticket Type:</strong> ${data.ticketType}</p>
          <p><strong>Quantity:</strong> ${data.quantity}</p>
          <p><strong>Total Amount:</strong> ${data.currency} ${data.totalAmount.toLocaleString()}</p>
          <p><strong>Order ID:</strong> ${data.orderId}</p>
        </div>

        <div class="ticket-codes">
          <h3>Your Ticket Code${data.quantity > 1 ? 's' : ''}</h3>
          <ul>
            ${ticketList}
          </ul>
        </div>

        ${data.qrCodeUrl ? `
        <div class="qr-code">
          <p><strong>Scan this QR code at the event:</strong></p>
          <img src="${data.qrCodeUrl}" alt="QR Code" />
        </div>
        ` : ''}

        <div class="info-box">
          <p><strong>Important:</strong></p>
          <p>• Please keep this email safe - you'll need your ticket code${data.quantity > 1 ? 's' : ''} for entry</p>
          <p>• Present your QR code at the event entrance</p>
          <p>• If you have any questions, contact the event organizer</p>
        </div>
        
        <p style="font-size: 14px; color: #777;">
          We're excited to see you at the event!
        </p>
        
        <div class="footer">
          <p>Best regards,</p>
          <p>The Accezz Team</p>
          <p style="margin-top: 20px;">This is an automated email. Please do not reply directly to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

