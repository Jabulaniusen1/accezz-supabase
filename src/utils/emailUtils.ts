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
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
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
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width:600px;margin:0 auto;">

    <!-- Header -->
    <tr>
      <td style="background:#f54502;padding:20px 24px;text-align:center;">
        <img src="${LOGO_URL}" alt="Accezz" width="90" style="display:block;margin:0 auto;filter:brightness(0) invert(1);">
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:32px 24px;">
        ${body}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="border-top:1px solid #e5e7eb;padding:20px 24px;text-align:center;background:#f9fafb;">
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">
          The Accezz Team &middot;
          <a href="mailto:support@accezzlive.com" style="color:#f54502;text-decoration:none;">support@accezzlive.com</a>
        </p>
        <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated message. Please do not reply directly to this email.</p>
      </td>
    </tr>

  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Icon helper — externally hosted PNG (Icons8 CDN), renders in all email clients
// ---------------------------------------------------------------------------

function icon(name: string, size = 18, color = 'f54502'): string {
  return `<img src="https://img.icons8.com/ios-filled/${size}/${color}/${name}.png" width="${size}" height="${size}" alt="" style="display:inline-block;vertical-align:middle;margin-right:8px;">`;
}

const ICONS = {
  rocket:    'rocket',
  share:     'share',
  megaphone: 'megaphone',
  link:      'link',
  check:     'checkmark',
  ticket:    'ticket',
  calendar:  'calendar',
  clock:     'clock',
  location:  'place-marker',
  bell:      'alarm',
};

function row(label: string, value: string, last = false): string {
  const border = last ? '' : 'border-bottom:1px solid #f3f4f6;';
  return `<tr>
    <td style="padding:10px 16px;${border}font-size:13px;color:#6b7280;width:42%;vertical-align:top;">${label}</td>
    <td style="padding:10px 16px;${border}font-size:14px;color:#111827;font-weight:600;text-align:right;vertical-align:top;">${value}</td>
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

// ---------------------------------------------------------------------------
// Event published / congratulations email
// ---------------------------------------------------------------------------

export function generateEventPublishedEmailHTML(data: {
  fullName: string;
  eventTitle: string;
  eventUrl: string;
  dashboardUrl: string;
  affiliateSettingsUrl: string;
  blogUrl: string;
}): string {
  const firstName = data.fullName?.split(' ')[0] || 'there';

  const step = (iconName: string, title: string, body: string, btn?: { label: string; href: string }) => `
    <tr>
      <td style="padding:20px 0;border-bottom:1px solid #f3f4f6;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
          <tr>
            <td style="width:36px;vertical-align:top;padding-top:2px;">
              <span style="display:inline-block;width:32px;height:32px;background:#fff3ee;border-radius:8px;text-align:center;line-height:36px;">
                ${icon(iconName, 18)}
              </span>
            </td>
            <td style="padding-left:14px;vertical-align:top;">
              <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#111827;">${title}</p>
              <p style="margin:0 0 12px;font-size:14px;color:#6b7280;line-height:1.7;">${body}</p>
              ${btn ? `<a href="${btn.href}" style="display:inline-block;padding:9px 20px;background:#f9fafb;border:1px solid #e5e7eb;color:#374151;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">${btn.label} →</a>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return emailShell(`Your event is live — ${data.eventTitle}`, `
    <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">
      ${icon(ICONS.rocket, 24)} You did it!
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7;">
      Hi ${firstName}, <strong style="color:#111827;">${data.eventTitle}</strong> is officially live on Accezz.
      Your event page is ready — now let's get people through the door.
    </p>

    ${ctaButton('View Your Event Page', data.eventUrl)}

    <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#111827;">What's next?</p>
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border:1px solid #e5e7eb;border-radius:6px;padding:0 20px;margin:0 0 28px;">
      ${step(ICONS.share, 'Share with friends, family & community',
        `The fastest path to ticket sales is your own network. Drop your event link in WhatsApp groups, DMs, community pages, and anywhere your people hang out. It costs nothing and it works.`,
        { label: 'Copy Your Event Link', href: data.eventUrl }
      )}
      ${step(ICONS.megaphone, 'Run Ads',
        `Want to reach beyond your circle? A small budget on Instagram, Facebook, or X can put your event in front of thousands of the right people. Even ₦5,000 can make a real difference.`,
        { label: 'Learn How to Run Ads', href: data.blogUrl }
      )}
      ${step(ICONS.link, 'Share Your Affiliate Link',
        `This one's a secret weapon. Accezz has a built-in affiliate program — you can let promoters, influencers, or friends earn a commission for every ticket they sell on your behalf. You set the rate, they drive the sales, you only pay when it works.`,
        { label: 'Set Up Affiliates', href: data.affiliateSettingsUrl }
      )}
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background:#fff8f5;border:1px solid #fde8df;border-radius:6px;margin:0 0 28px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#c2410c;">Want to learn more about growing your event?</p>
        <p style="margin:0 0 14px;font-size:13px;color:#9a3412;line-height:1.6;">
          Check out our blog for tips on promotion, pricing, and running a great event — written for Nigerian event creators.
        </p>
        <a href="${data.blogUrl}" style="display:inline-block;padding:10px 22px;background:#f54502;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">Read the Blog</a>
      </td></tr>
    </table>

    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.7;">
      You can manage your event, track ticket sales, and update details anytime from your
      <a href="${data.dashboardUrl}" style="color:#f54502;text-decoration:none;">dashboard</a>.
    </p>
  `);
}

// ---------------------------------------------------------------------------
// Event ended — organizer recap report
// ---------------------------------------------------------------------------

export function generateEventEndedReportEmailHTML(data: {
  fullName: string;
  eventTitle: string;
  eventDate: string;
  currency: string;
  totalRevenue: number;
  ticketsSold: number;
  totalCapacity: number;
  checkedIn: number;
  pageViews: number;
  noShows: number;
  ticketTypeBreakdown: { name: string; sold: number; quantity: number; revenue: number }[];
  genderBreakdown?: { label: string; count: number }[];
  topAffiliate?: { name: string; conversions: number; earned: number } | null;
  analyticsUrl: string;
  createEventUrl: string;
}): string {
  const firstName = data.fullName?.split(' ')[0] || 'there';
  const money = (n: number) => `${data.currency} ${n.toLocaleString()}`;

  const checkInRate = data.ticketsSold > 0 ? Math.round((data.checkedIn / data.ticketsSold) * 100) : 0;
  const sellThroughRate = data.totalCapacity > 0 ? Math.round((data.ticketsSold / data.totalCapacity) * 100) : null;

  const bestSeller = [...data.ticketTypeBreakdown].sort((a, b) => b.sold - a.sold)[0];

  const statCard = (label: string, value: string, color: string) => `
    <td width="50%" style="padding:6px;">
      <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;">${label}</p>
          <p style="margin:0;font-size:20px;font-weight:800;color:${color};">${value}</p>
        </td></tr>
      </table>
    </td>`;

  const statsGrid = `
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin:0 0 8px;">
      <tr>
        ${statCard('Tickets Sold', `${data.ticketsSold}${data.totalCapacity ? ` / ${data.totalCapacity}` : ''}`, '#111827')}
        ${statCard('Checked In', `${data.checkedIn} (${checkInRate}%)`, '#111827')}
      </tr>
      <tr>
        ${statCard('Page Views', String(data.pageViews), '#111827')}
        ${statCard('No-shows', String(data.noShows), '#111827')}
      </tr>
    </table>`;

  const breakdownRows = data.ticketTypeBreakdown
    .sort((a, b) => b.sold - a.sold)
    .map((t, i, arr) => {
      const pct = t.quantity > 0 ? Math.min(100, Math.round((t.sold / t.quantity) * 100)) : 0;
      const isBest = bestSeller && t.name === bestSeller.name && t.sold > 0;
      return `<tr>
        <td style="padding:12px 16px;${i < arr.length - 1 ? 'border-bottom:1px solid #f3f4f6;' : ''}font-size:13px;color:#374151;">
          ${t.name}${isBest ? ' <span style="display:inline-block;margin-left:6px;padding:2px 8px;background:#fff3ee;color:#f54502;font-size:10px;font-weight:700;border-radius:10px;text-transform:uppercase;letter-spacing:0.03em;">Top seller</span>' : ''}
          <br><span style="font-size:11px;color:#9ca3af;">${t.sold} sold${t.quantity ? ` of ${t.quantity}` : ''} &middot; ${pct}% &middot; ${money(t.revenue)}</span>
        </td>
      </tr>`;
    })
    .join('');

  const genderSection = data.genderBreakdown && data.genderBreakdown.length > 0
    ? `
    <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111827;">Who showed up</p>
    ${detailTable(data.genderBreakdown.map((g, i, arr) =>
      row(g.label, String(g.count), i === arr.length - 1)
    ).join(''))}` : '';

  const affiliateSection = data.topAffiliate
    ? `
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background:#fff8f5;border:1px solid #fde8df;border-radius:6px;margin:0 0 28px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#c2410c;">${icon(ICONS.megaphone, 16)}Affiliate MVP</p>
        <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;">
          <strong>${data.topAffiliate.name}</strong> drove ${data.topAffiliate.conversions} sale${data.topAffiliate.conversions === 1 ? '' : 's'} for you, earning ${money(data.topAffiliate.earned)} in commission. Consider sending them a thank-you.
        </p>
      </td></tr>
    </table>` : '';

  const sellThroughBanner = sellThroughRate !== null
    ? `<p style="margin:0 0 28px;font-size:14px;color:#374151;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:14px 18px;">
        ${sellThroughRate >= 90 ? '🔥' : sellThroughRate >= 50 ? '📈' : '🌱'} You sold <strong>${sellThroughRate}%</strong> of your total capacity.
      </p>`
    : '';

  return emailShell(`Your event recap — ${data.eventTitle}`, `
    <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">It's a wrap! 🎉</p>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7;">
      Hi ${firstName}, <strong style="color:#111827;">${data.eventTitle}</strong> wrapped up on ${data.eventDate}.
      Here's how it went.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background:#111827;border-radius:8px;margin:0 0 20px;">
      <tr><td style="padding:22px 24px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Total revenue</p>
        <p style="margin:0;font-size:32px;font-weight:800;color:#ffffff;">${money(data.totalRevenue)}</p>
      </td></tr>
    </table>

    ${statsGrid}
    ${sellThroughBanner}

    ${data.ticketTypeBreakdown.length > 0 ? `
    <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111827;">Ticket type breakdown</p>
    ${detailTable(breakdownRows)}` : ''}

    ${genderSection}
    ${affiliateSection}

    ${ctaButton('View Full Analytics', data.analyticsUrl)}

    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border-top:1px solid #f3f4f6;margin:0;">
      <tr><td style="padding:20px 0 0;text-align:center;">
        <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">Loved how that went? Let's do it again.</p>
        <a href="${data.createEventUrl}" style="display:inline-block;padding:10px 22px;background:#f9fafb;border:1px solid #e5e7eb;color:#374151;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">Create Your Next Event →</a>
      </td></tr>
    </table>
  `);
}
