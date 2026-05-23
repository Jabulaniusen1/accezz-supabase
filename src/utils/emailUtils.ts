import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

export async function sendEmail({ to, subject, html, text, attachments }: SendEmailOptions): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL || 'Accezz <noreply@accezzlive.com>';
  console.log(`[email] Sending via Resend to: ${to}, subject: "${subject}"`);

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text: text || subject,
    attachments: attachments?.map(a => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });

  if (error) {
    console.error(`[email] Resend failed (to: ${to}):`, error);
    throw new Error(error.message);
  }

  console.log(`[email] Sent successfully via Resend`);
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const LOGO_URL = 'https://kckdkipdodkfszakqwui.supabase.co/storage/v1/object/public/logo/accezz%20logo.png';

function emailShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
    <tr>
      <td style="padding:32px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">

          <!-- Header -->
          <tr>
            <td style="background:#f54502;padding:24px 40px;text-align:center;">
              <img src="${LOGO_URL}" alt="Accezz" width="100" style="display:block;margin:0 auto;filter:brightness(0) invert(1);">
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">
                The Accezz Team &middot;
                <a href="mailto:support@accezzlive.com" style="color:#f54502;text-decoration:none;">support@accezzlive.com</a>
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated message. Please do not reply directly to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function row(label: string, value: string, last = false): string {
  const border = last ? '' : 'border-bottom:1px solid #f3f4f6;';
  return `<tr>
    <td style="padding:10px 0;${border}font-size:13px;color:#6b7280;width:42%;vertical-align:top;">${label}</td>
    <td style="padding:10px 0;${border}font-size:14px;color:#111827;font-weight:600;text-align:right;vertical-align:top;">${value}</td>
  </tr>`;
}

function detailTable(rows: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border:1px solid #e5e7eb;border-radius:6px;margin:0 0 28px;">${rows}</table>`;
}

function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin:0 0 28px;">
  <tr>
    <td align="center">
      <a href="${href}" style="display:inline-block;padding:13px 32px;background:#f54502;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">${label}</a>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// Welcome email
// ---------------------------------------------------------------------------

export function generateWelcomeEmailHTML(fullName: string): string {
  const firstName = fullName?.split(' ')[0] || 'there';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accezzlive.com';
  const features = [
    'Create & manage events',
    'Sell tickets securely',
    'Track sales & analytics',
    'Send email campaigns',
  ];

  return emailShell('Welcome to Accezz', `
    <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Hi ${firstName},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7;">
      Welcome to Accezz! You can now create events, sell tickets, and track your sales — all in one place.
    </p>

    ${detailTable(features.map((f, i) => `
    <tr>
      <td style="padding:12px 16px;${i < features.length - 1 ? 'border-bottom:1px solid #f3f4f6;' : ''}font-size:14px;color:#374151;">
        <span style="display:inline-block;width:18px;height:18px;background:#f54502;border-radius:50%;text-align:center;line-height:18px;font-size:10px;color:#fff;font-weight:700;margin-right:10px;vertical-align:middle;">✓</span>${f}
      </td>
    </tr>`).join(''))}

    ${ctaButton('Go to Dashboard', `${baseUrl}/dashboard`)}

    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
      Questions? Contact <a href="mailto:support@accezzlive.com" style="color:#f54502;text-decoration:none;">support@accezzlive.com</a>
    </p>
  `);
}

// ---------------------------------------------------------------------------
// Ticket confirmation email
// ---------------------------------------------------------------------------

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
  const isVirtual = Boolean(data.isVirtual);

  const formatPlatform = (v?: string) =>
    v ? v.split(/[-_]/g).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') : 'Online Session';

  const ticketCodesHtml = detailTable(data.ticketCodes.map((code, i) => `
    <tr>
      <td style="padding:14px 16px;${i < data.ticketCodes.length - 1 ? 'border-bottom:1px solid #f3f4f6;' : ''}">
        <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Ticket ${i + 1}</p>
        <p style="margin:0;font-size:20px;font-weight:700;color:#f54502;font-family:'Courier New',monospace;letter-spacing:0.1em;">${code}</p>
      </td>
    </tr>`).join(''));

  const qrSection = !isVirtual && data.qrCodeUrl ? `
    <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111827;">Entry QR Code</p>
    ${detailTable(`<tr><td style="padding:20px;text-align:center;">
      <img src="${data.qrCodeUrl}" alt="QR Code" width="180" height="180" style="display:block;margin:0 auto;">
      <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">Show this at the entrance for quick check-in.</p>
    </td></tr>`)}` : '';

  const virtualSection = isVirtual ? `
    <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111827;">Virtual Access</p>
    ${detailTable([
      row('Platform', formatPlatform(data.virtualPlatform)),
      ...(data.virtualMeetingId ? [row('Meeting ID', data.virtualMeetingId)] : []),
      ...(data.virtualAccessLink ? [`<tr><td colspan="2" style="padding:14px 16px;text-align:center;">
        ${ctaButton('Join Virtual Session', data.virtualAccessLink)}
      </td></tr>`] : []),
    ].join(''))}` : '';

  const notes = isVirtual
    ? ['Join the session a few minutes early', 'Keep your ticket code for reference', 'Ensure audio and video are ready', 'Tickets are non-transferable unless stated otherwise']
    : ['Present your ticket code or QR code at the entrance', 'Arrive early to avoid queues', 'Keep this email — your ticket code is your entry', 'Tickets are non-transferable unless stated otherwise'];

  return emailShell(`Your Tickets — ${data.eventTitle}`, `
    <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Hi ${firstName},</p>
    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7;">
      Your payment is confirmed. ${isVirtual ? 'Your virtual access details are below.' : 'Enjoy the event!'}
    </p>

    <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111827;">${data.eventTitle}</p>
    ${detailTable([
      row('Date', data.eventDate),
      row('Time', data.eventTime),
      row(isVirtual ? 'Platform' : 'Venue', data.venue),
      row('Ticket type', data.ticketType),
      row('Quantity', String(data.quantity)),
      row('Amount paid', `${data.currency} ${data.totalAmount.toLocaleString()}`),
      row('Order ID', data.orderId, true),
    ].join(''))}

    <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111827;">
      Your Ticket Code${data.quantity > 1 ? 's' : ''}
    </p>
    ${ticketCodesHtml}

    ${qrSection}
    ${virtualSection}

    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background:#fefce8;border:1px solid #fde68a;border-radius:6px;margin:0 0 8px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#92400e;">Important</p>
        ${notes.map(n => `<p style="margin:0 0 6px;font-size:13px;color:#78350f;line-height:1.5;">&bull; ${n}</p>`).join('')}
      </td></tr>
    </table>
  `);
}

// ---------------------------------------------------------------------------
// Abandoned cart email
// ---------------------------------------------------------------------------

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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accezzlive.com';
  const completePurchaseUrl = `${baseUrl}/${data.eventSlug}?orderId=${data.orderId}`;

  return emailShell('Complete Your Purchase', `
    <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Hey ${firstName},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7;">
      You started an order for <strong style="color:#111827;">${data.eventTitle}</strong> but didn't complete it.
      If you ran into any issues, reply to this email — we'll help. Otherwise, pick up right where you left off:
    </p>

    ${detailTable([
      row('Event', data.eventTitle),
      row('Date', data.eventDate),
      row('Venue', data.venue),
      row('Ticket type', data.ticketType),
      row('Quantity', String(data.quantity)),
      row('Total', `${data.currency} ${data.totalAmount.toLocaleString()}`, true),
    ].join(''))}

    ${ctaButton('Complete Your Purchase', completePurchaseUrl)}

    <p style="margin:0;font-size:13px;color:#9ca3af;">Can't wait to have you with us!</p>
  `);
}

// ---------------------------------------------------------------------------
// Event reminder email
// ---------------------------------------------------------------------------

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
  const isVirtual = Boolean(data.isVirtual);
  const timeLabel =
    data.hoursUntilEvent <= 2
      ? `in ${data.hoursUntilEvent} hour${data.hoursUntilEvent === 1 ? '' : 's'}`
      : data.hoursUntilEvent <= 24
      ? 'tomorrow'
      : 'soon';

  const virtualLinkSection =
    isVirtual && data.virtualAccessLink
      ? ctaButton('Join Virtual Session', data.virtualAccessLink)
      : '';

  return emailShell(`Reminder — ${data.eventTitle}`, `
    <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Hi ${firstName},</p>
    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7;">
      Just a reminder — <strong style="color:#111827;">${data.eventTitle}</strong> is happening
      <strong style="color:#111827;">${timeLabel}</strong>. Get ready!
    </p>

    ${detailTable([
      row('Date', data.eventDate),
      row('Time', data.eventTime),
      row(isVirtual ? 'Platform' : 'Venue', data.venue),
      row('Ticket code', `<span style="color:#f54502;font-family:'Courier New',monospace;letter-spacing:0.1em;">${data.ticketCode}</span>`, true),
    ].join(''))}

    ${virtualLinkSection}

    ${ctaButton('View My Tickets', `${baseUrl}/dashboard`)}
  `);
}
