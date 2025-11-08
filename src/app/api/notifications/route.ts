import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { sendEmail } from '@/utils/emailUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  console.error('[notifications API] Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseServiceKey) {
  console.error('[notifications API] Missing SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

type HandlerUser = {
  id: string;
  email?: string | null;
};

type HandlerContext = {
  request: NextRequest;
  user: HandlerUser;
  isAdmin: boolean;
};

type TicketPurchasePayload = { orderId: string };
type LocationBookingPayload = { bookingId: string };
type WithdrawalPayload = { withdrawalId: string };

type NotificationType =
  | { type: 'ticket_purchase'; data: TicketPurchasePayload }
  | { type: 'location_booking'; data: LocationBookingPayload }
  | { type: 'withdrawal_request'; data: WithdrawalPayload }
  | { type: 'withdrawal_approved'; data: WithdrawalPayload };

async function resolveAccessToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }

  const cookieStore = await cookies();
  const possibleCookies = ['sb-access-token', 'supabase-auth-token'];
  for (const cookieName of possibleCookies) {
    const cookie = cookieStore.get(cookieName);
    if (cookie?.value) {
      return cookie.value;
    }
  }

  return null;
}

async function getRequestUser(request: NextRequest): Promise<{ user: HandlerUser | null; isAdmin: boolean }> {
  if (!supabaseAdmin) {
    return { user: null, isAdmin: false };
  }

  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return { user: null, isAdmin: false };
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !user) {
    return { user: null, isAdmin: false };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle();

  const isAdmin = Boolean(profile?.is_admin);

  return { user: { id: user.id, email: user.email }, isAdmin };
}

function formatCurrency(amount: number, currency = 'NGN') {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

type UserContact = { email: string | null; fullName: string | null };

async function getUserContact(userId: string | null | undefined): Promise<UserContact> {
  if (!userId || !supabaseAdmin) {
    return { email: null, fullName: null };
  }

  try {
    const [{ data: profile }, { data: authUser }] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(userId),
    ]);

    return {
      email: authUser?.user?.email ?? null,
      fullName: profile?.full_name ?? (authUser?.user?.user_metadata?.full_name ?? null),
    };
  } catch (error) {
    console.error('[notifications API] Failed to get user contact', userId, error);
    return { email: null, fullName: null };
  }
}

async function safeSendEmail(to: string | null | undefined, subject: string, html: string, text?: string) {
  if (!to) return;
  try {
    await sendEmail({ to, subject, html, text });
  } catch (error) {
    console.error('[notifications API] Failed to send email', subject, to, error);
  }
}

async function sendTicketPurchaseEmails(params: {
  buyerEmail: string | null;
  buyerName: string | null;
  hostUserId: string | null;
  eventTitle: string | null;
  totalAmount: number;
  currency: string | null;
}) {
  const subjectForBuyer = 'Your ticket purchase is confirmed';
  const formattedAmount = formatCurrency(params.totalAmount, params.currency || 'NGN');
  const eventTitle = params.eventTitle || 'your event';
  const buyerGreeting = params.buyerName ? `Hi ${params.buyerName.split(' ')[0]},` : 'Hi there,';
  const buyerHtml = `
    <div style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f9fafb;
      padding: 32px 16px;
    ">
      <table role="presentation" cellspacing="0" cellpadding="0" style="
        max-width: 560px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
      ">
        <tr>
          <td style="padding: 40px 32px 24px; text-align: center; background: linear-gradient(135deg, #f97316, #ef4444); color: #ffffff;">
            <div style="font-size: 40px; margin-bottom: 12px;">🎉</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Ticket Confirmed!</h1>
            <p style="margin: 12px 0 0; font-size: 16px; opacity: 0.9;">You're all set for ${eventTitle}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px 32px 12px;">
            <p style="margin: 0 0 16px; font-size: 16px; color: #111827; font-weight: 600;">
              ${buyerGreeting}
            </p>
            <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">
              You're in! Your purchase for <strong>${eventTitle}</strong> has been confirmed.
            </p>
            <div style="
              margin: 24px 0;
              padding: 20px;
              border-radius: 12px;
              background: linear-gradient(135deg, rgba(249, 115, 22, 0.08), rgba(239, 68, 68, 0.08));
              border: 1px solid rgba(249, 115, 22, 0.15);
            ">
              <p style="margin: 0; font-size: 14px; color: #f97316; text-transform: uppercase; letter-spacing: 0.08em;">
                Total Paid
              </p>
              <p style="margin: 6px 0 0; font-size: 24px; font-weight: 700; color: #111827;">
                ${formattedAmount}
              </p>
            </div>
            <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">
              Your tickets are ready in your dashboard. Head over anytime to see all the details.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || ''}/dashboard" style="
                display: inline-block;
                padding: 14px 28px;
                border-radius: 9999px;
                background: linear-gradient(135deg, #f97316, #ef4444);
                color: #ffffff;
                text-decoration: none;
                font-weight: 600;
                font-size: 15px;
                box-shadow: 0 10px 20px rgba(249, 115, 22, 0.25);
              ">
                View Dashboard
              </a>
            </div>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              Need help? Reply to this email or reach out via support. We're here for you!
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 32px 32px; text-align: center; background: #f9fafb; color: #6b7280; font-size: 12px;">
            © ${new Date().getFullYear()} Accezz. All rights reserved.
          </td>
        </tr>
      </table>
    </div>
  `;

  await safeSendEmail(params.buyerEmail, subjectForBuyer, buyerHtml, `${buyerGreeting} Your ticket purchase for ${eventTitle} is confirmed.`);

  const host = await getUserContact(params.hostUserId);
  if (host.email) {
    const hostSubject = 'A ticket has been purchased';
    const hostGreeting = host.fullName ? `Hi ${host.fullName.split(' ')[0]},` : 'Hello,';
    const hostHtml = `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f8fafc;
        padding: 32px 16px;
      ">
        <table role="presentation" cellspacing="0" cellpadding="0" style="
          max-width: 520px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
        ">
          <tr>
            <td style="padding: 36px 28px; text-align: center; background: #111827; color: #f8fafc;">
              <p style="margin: 0; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #9ca3af;">
                Great Job
              </p>
              <h2 style="margin: 12px 0 8px; font-size: 22px; font-weight: 700;">
                A ticket has been purchased for ${eventTitle}
              </h2>
              <p style="margin: 0; font-size: 24px; font-weight: 600; color: #f97316;">
                ${formattedAmount}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px 12px;">
              <p style="margin: 0 0 14px; font-size: 15px; color: #1f2937; font-weight: 600;">
                ${hostGreeting}
              </p>
              <p style="margin: 0 0 12px; font-size: 14px; color: #4b5563;">
                You're doing well. Keep the momentum going!
              </p>
              <div style="margin: 24px 0; text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || ''}/dashboard" style="
                  display: inline-block;
                  padding: 14px 26px;
                  border-radius: 12px;
                  background: #f97316;
                  color: #ffffff;
                  text-decoration: none;
                  font-weight: 600;
                  font-size: 14px;
                  box-shadow: 0 8px 18px rgba(249, 115, 22, 0.18);
                ">
                  Go to Dashboard
                </a>
              </div>
              <p style="margin: 0; font-size: 13px; color: #6b7280; text-align: center;">
                Stay on top of your sales and keep delighting your attendees.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 32px 28px; text-align: center; background: #f9fafb; color: #9ca3af; font-size: 12px;">
              Powered by Accezz
            </td>
          </tr>
        </table>
      </div>
    `;
    await safeSendEmail(host.email, hostSubject, hostHtml, `${hostGreeting} A ticket was purchased for ${eventTitle}.`);
  }
}

async function sendLocationBookingEmails(params: {
  requesterEmail: string | null;
  requesterName: string | null;
  ownerUserId: string | null;
  locationName: string | null;
  eventDate: string | null;
  bookingId?: string | null;
}) {
  const locationName = params.locationName || 'your location';
  const dateFormatted = params.eventDate ? new Date(params.eventDate).toLocaleDateString() : null;
  const dateText = dateFormatted ? `scheduled for ${dateFormatted}` : 'with no date specified';
  const bookingDashboardBase = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/dashboard/`;
  const bookingLink = params.bookingId ? `${bookingDashboardBase}?id=${params.bookingId}` : bookingDashboardBase;

  const requesterGreeting = params.requesterName ? `Hi ${params.requesterName.split(' ')[0]},` : 'Hi there,';
  const requesterHtml = `
    <div style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #eef2f7;
      padding: 32px 16px;
    ">
      <table role="presentation" cellspacing="0" cellpadding="0" style="
        max-width: 560px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
        border: 1px solid rgba(15, 23, 42, 0.05);
      ">
        <tr>
          <td style="padding: 36px 28px; text-align: center; background: linear-gradient(135deg, #0f172a, #1e293b); color: #e2e8f0;">
            <div style="font-size: 32px; margin-bottom: 12px;">📅</div>
            <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.02em; color: #f8fafc;">
              Booking Request Sent
            </h1>
            <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.85; color: #cbd5f5;">
              We&apos;ll let you know once the venue responds.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px;">
            <p style="margin: 0 0 18px; font-size: 15px; color: #0f172a; font-weight: 600;">
              ${requesterGreeting}
            </p>
            <p style="margin: 0 0 16px; font-size: 15px; color: #334155; line-height: 1.6;">
              Thanks for requesting <strong>${locationName}</strong> ${dateText}. The venue manager has received your submission and will be in touch soon to confirm availability.
            </p>
            <div style="
              margin: 22px 0;
              padding: 20px;
              border-radius: 16px;
              border: 1px solid rgba(15, 23, 42, 0.08);
              background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(15, 118, 110, 0.08));
            ">
              <p style="margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.18em; color: #f97316; font-weight: 600;">
                Booking Preview
              </p>
              <p style="margin: 10px 0 0; font-size: 20px; color: #0f172a; font-weight: 600;">
                ${locationName}
              </p>
              ${dateFormatted ? `<p style="margin: 6px 0 0; font-size: 14px; color: #475569;">📅 ${dateFormatted}</p>` : ''}
            </div>
            <p style="margin: 0 0 14px; font-size: 14px; color: #64748b;">
              You can keep an eye on all your requests from your dashboard.
            </p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="${bookingLink}" style="
                display: inline-block;
                padding: 14px 26px;
                border-radius: 9999px;
                background: linear-gradient(135deg, #0f172a, #1e293b);
                color: #f8fafc;
                text-decoration: none;
                font-weight: 600;
                font-size: 14px;
                box-shadow: 0 12px 22px rgba(15, 23, 42, 0.25);
              ">
                View Your Bookings
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 18px 28px 28px; text-align: center; background: #eef2f7; color: #7b8794; font-size: 12px;">
            Need to make changes? You can update or cancel the request from your dashboard.
          </td>
        </tr>
      </table>
    </div>
  `;
  await safeSendEmail(
    params.requesterEmail,
    'Booking request received',
    requesterHtml,
    `${requesterGreeting} Thanks for your booking request for ${locationName} ${dateText}.`
  );

  const owner = await getUserContact(params.ownerUserId);
  if (owner.email) {
    const ownerGreeting = owner.fullName ? `Hi ${owner.fullName.split(' ')[0]},` : 'Hello,';
    const ownerHtml = `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #eef2f7;
        padding: 32px 16px;
      ">
        <table role="presentation" cellspacing="0" cellpadding="0" style="
          max-width: 560px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
          border: 1px solid rgba(15, 23, 42, 0.05);
        ">
          <tr>
            <td style="padding: 34px 28px; text-align: center; background: linear-gradient(135deg, #0f172a, #1e293b); color: #e2e8f0;">
              <div style="font-size: 30px; margin-bottom: 12px;">📍</div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700;">
                New Location Booking
              </h1>
              <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.7;">
                A new host is interested in your space.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #0f172a; font-weight: 600;">
                ${ownerGreeting}
              </p>
              <p style="margin: 0 0 18px; font-size: 15px; color: #334155; line-height: 1.6;">
                Someone just requested to book <strong>${locationName}</strong> ${dateText}. Review the details and respond quickly to secure the booking.
              </p>
              <div style="
                padding: 20px;
                border-radius: 16px;
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(15, 118, 110, 0.08));
                border: 1px solid rgba(15, 23, 42, 0.08);
              ">
                <p style="margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.16em; color: #0f766e; font-weight: 600;">
                  Location
                </p>
                <p style="margin: 8px 0 0; font-size: 20px; color: #0f172a; font-weight: 600;">
                  ${locationName}
                </p>
                ${dateFormatted ? `<p style="margin: 6px 0 0; font-size: 14px; color: #475569;">Requested Date: ${dateFormatted}</p>` : ''}
              </div>
              <div style="text-align: center; margin-top: 24px;">
                <a href="${bookingLink}" style="
                  display: inline-block;
                  padding: 14px 28px;
                  border-radius: 9999px;
                  background: linear-gradient(135deg, #0f172a, #1e293b);
                  color: #f8fafc;
                  text-decoration: none;
                  font-weight: 600;
                  font-size: 14px;
                  box-shadow: 0 14px 24px rgba(15, 23, 42, 0.25);
                ">
                  Review Booking
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 30px 30px; text-align: center; background: #eef2f7; color: #7b8794; font-size: 12px;">
              Respond promptly to give your guests the best experience.
            </td>
          </tr>
        </table>
      </div>
    `;
    await safeSendEmail(
      owner.email,
      'New location booking request received',
      ownerHtml,
      `${ownerGreeting} You received a booking request for ${locationName} ${dateText}.`
    );
  }
}

async function sendWithdrawalApprovedEmail(params: {
  userId: string | null;
  amount: number;
  currency: string | null;
}) {
  if (!params.userId) return;
  const contact = await getUserContact(params.userId);
  if (!contact.email) return;

  const formattedAmount = formatCurrency(params.amount, params.currency || 'NGN');
  const greeting = contact.fullName ? `Hi ${contact.fullName.split(' ')[0]},` : 'Hi there,';
  const html = `
    <div style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      padding: 32px 16px;
    ">
      <table role="presentation" cellspacing="0" cellpadding="0" style="
        max-width: 560px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
        border: 1px solid rgba(15, 23, 42, 0.06);
      ">
        <tr>
          <td style="
            padding: 38px 32px 30px;
            text-align: center;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #f97316 100%);
            color: #f8fafc;
          ">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 18px; background: rgba(248, 250, 252, 0.18); margin-bottom: 18px;">
              <span style="font-size: 32px;">💸</span>
            </div>
            <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.02em;">
              Withdrawal Successful
            </h1>
            <p style="margin: 12px 0 0; font-size: 14px; opacity: 0.8;">
              Your funds are on their way. Keep building with Accezz.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px;">
            <p style="margin: 0 0 16px; font-size: 16px; color: #111827; font-weight: 600;">
              ${greeting}
            </p>
            <p style="margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.6;">
              Great news! Your withdrawal request has been processed successfully. The payment of <strong>${formattedAmount}</strong> is now headed to your bank account.
            </p>
            <div style="
              border-radius: 16px;
              border: 1px solid rgba(249, 115, 22, 0.2);
              background: linear-gradient(135deg, rgba(249, 115, 22, 0.12), rgba(14, 165, 233, 0.08));
              padding: 22px;
              text-align: center;
            ">
              <p style="margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.18em; color: #f97316; font-weight: 600;">
                Amount Sent
              </p>
              <p style="margin: 10px 0 0; font-size: 30px; font-weight: 700; color: #0f172a;">
                ${formattedAmount}
              </p>
            </div>
            <div style="margin: 24px 0;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                What happens next:
              </p>
              <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                <li>Transfers typically arrive within 1-5 business days.</li>
                <li>You&apos;ll receive a follow-up once the status is updated.</li>
                <li>Track every payout anytime from your dashboard.</li>
              </ul>
            </div>
            <div style="text-align: center; margin-top: 28px;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || ''}/dashboard" style="
                display: inline-block;
                padding: 14px 26px;
                border-radius: 9999px;
                background: linear-gradient(135deg, #f97316, #ef4444);
                color: #ffffff;
                text-decoration: none;
                font-weight: 600;
                font-size: 14px;
                box-shadow: 0 14px 24px rgba(249, 115, 22, 0.24);
              ">
                View Dashboard
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 32px 32px; text-align: center; background: #f8fafc; color: #94a3b8; font-size: 12px;">
            Need help? Reply to this email or reach us via support.
          </td>
        </tr>
      </table>
    </div>
  `;
  await safeSendEmail(
    contact.email,
    'Withdrawal Successful',
    html,
    `${greeting} Your withdrawal request for ${formattedAmount} has been approved.`
  );
}

async function handleTicketPurchase(context: HandlerContext, payload: TicketPurchasePayload) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase client not configured' }, { status: 500 });
  }

  if (!payload.orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, status, event_id, buyer_user_id, buyer_full_name, buyer_email, total_amount, currency')
    .eq('id', payload.orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('id, user_id, title')
    .eq('id', order.event_id)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found for order' }, { status: 404 });
  }

  if (order.status !== 'paid') {
    return NextResponse.json({ error: 'Order not paid' }, { status: 400 });
  }

  // For ticket purchases, allow notification if order is paid (orderId is sufficient verification)
  // Authorization check is optional - if user is authenticated, verify they're buyer/creator/admin
  // If not authenticated, still allow notification since order status confirms validity
  const hasUser = context.user.id && context.user.id.trim() !== '';
  const isAuthorized =
    !hasUser || // No user context (unauthenticated) - allow for paid orders
    context.user.id === order.buyer_user_id ||
    context.user.id === event.user_id ||
    context.isAdmin;

  if (!isAuthorized && hasUser) {
    // Only block if user is authenticated but not authorized
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const notificationsMap = new Map<string, { user_id: string; type: string; title: string; body: string }>();

  if (event.user_id) {
    const buyerName = order.buyer_full_name || order.buyer_email || 'A guest';
    notificationsMap.set(event.user_id, {
      user_id: event.user_id,
      type: 'ticket_purchase',
      title: 'New Ticket Purchase',
      body: `${buyerName} purchased ticket(s) for ${event.title || 'your event'}.`,
    });
  }

  if (order.buyer_user_id) {
    notificationsMap.set(order.buyer_user_id, {
      user_id: order.buyer_user_id,
      type: 'ticket_purchase',
      title: 'Ticket Purchase Confirmed',
      body: `Your purchase for ${event.title || 'the event'} is confirmed.`,
    });
  }

  if (notificationsMap.size === 0) {
    return NextResponse.json({ success: true, message: 'No recipients for notification' });
  }

  const { error: insertError } = await supabaseAdmin
    .from('notifications')
    .insert(Array.from(notificationsMap.values()));

  if (insertError) {
    console.error('[notifications API] Failed to insert ticket notifications', insertError);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }

  await sendTicketPurchaseEmails({
    buyerEmail: order.buyer_email,
    buyerName: order.buyer_full_name,
    hostUserId: event.user_id,
    eventTitle: event.title,
    totalAmount: Number(order.total_amount || 0),
    currency: order.currency,
  });

  return NextResponse.json({ success: true });
}

async function handleLocationBooking(context: HandlerContext, payload: LocationBookingPayload) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase client not configured' }, { status: 500 });
  }

  if (!payload.bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
  }

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('location_bookings')
    .select('id, location_id, requester_user_id, requester_name, requester_email, event_date, status')
    .eq('id', payload.bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const { data: location, error: locationError } = await supabaseAdmin
    .from('locations')
    .select('id, user_id, name')
    .eq('id', booking.location_id)
    .single();

  if (locationError || !location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  // For location bookings, allow notification if booking exists (bookingId is sufficient verification)
  // Authorization check is optional - if user is authenticated, verify they're requester/owner/admin
  // If not authenticated, still allow notification since booking existence confirms validity
  const hasUser = context.user.id && context.user.id.trim() !== '';
  const isAuthorized =
    !hasUser || // No user context (unauthenticated) - allow for valid bookings
    (booking.requester_user_id && context.user.id === booking.requester_user_id) ||
    context.user.id === location.user_id ||
    context.isAdmin;

  if (!isAuthorized && hasUser) {
    // Only block if user is authenticated but not authorized
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const notificationsMap = new Map<string, { user_id: string; type: string; title: string; body: string }>();
  const formattedDate = booking.event_date ? new Date(booking.event_date).toLocaleDateString() : 'the selected date';
  const requesterName = booking.requester_name || booking.requester_email || 'A guest';

  if (location.user_id) {
    notificationsMap.set(location.user_id, {
      user_id: location.user_id,
      type: 'location_booking',
      title: 'New Location Booking Request',
      body: `${requesterName} requested to book ${location.name || 'your location'} for ${formattedDate}.`,
    });
  }

  if (booking.requester_user_id) {
    notificationsMap.set(booking.requester_user_id, {
      user_id: booking.requester_user_id,
      type: 'location_booking',
      title: 'Booking Request Submitted',
      body: `Your request to book ${location.name || 'the location'} for ${formattedDate} has been received.`,
    });
  }

  if (notificationsMap.size === 0) {
    return NextResponse.json({ success: true, message: 'No recipients for notification' });
  }

  const { error: insertError } = await supabaseAdmin
    .from('notifications')
    .insert(Array.from(notificationsMap.values()));

  if (insertError) {
    console.error('[notifications API] Failed to insert booking notifications', insertError);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }

  await sendLocationBookingEmails({
    requesterEmail: booking.requester_email ?? null,
    requesterName: booking.requester_name ?? null,
    ownerUserId: location.user_id,
    locationName: location.name,
    eventDate: booking.event_date,
  });

  return NextResponse.json({ success: true });
}

async function handleWithdrawalRequest(context: HandlerContext, payload: WithdrawalPayload) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase client not configured' }, { status: 500 });
  }

  if (!payload.withdrawalId) {
    return NextResponse.json({ error: 'Missing withdrawalId' }, { status: 400 });
  }

  const { data: withdrawal, error: withdrawalError } = await supabaseAdmin
    .from('withdrawal_requests')
    .select('id, user_id, amount, currency, status')
    .eq('id', payload.withdrawalId)
    .single();

  if (withdrawalError || !withdrawal) {
    return NextResponse.json({ error: 'Withdrawal request not found' }, { status: 404 });
  }

  const isAuthorized =
    context.user.id === withdrawal.user_id ||
    context.isAdmin;

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!withdrawal.user_id) {
    return NextResponse.json({ success: true, message: 'Withdrawal has no user' });
  }

  const amount = Number(withdrawal.amount || 0);
  const formattedAmount = formatCurrency(amount, withdrawal.currency || 'NGN');

  const { error: insertError } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: withdrawal.user_id,
      type: 'withdrawal_request',
      title: 'Withdrawal Request Submitted',
      body: `We received your withdrawal request for ${formattedAmount}.`,
    });

  if (insertError) {
    console.error('[notifications API] Failed to insert withdrawal request notification', insertError);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

async function handleWithdrawalApproved(context: HandlerContext, payload: WithdrawalPayload) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase client not configured' }, { status: 500 });
  }

  if (!context.isAdmin) {
    return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
  }

  if (!payload.withdrawalId) {
    return NextResponse.json({ error: 'Missing withdrawalId' }, { status: 400 });
  }

  const { data: withdrawal, error: withdrawalError } = await supabaseAdmin
    .from('withdrawal_requests')
    .select('id, user_id, amount, currency, status')
    .eq('id', payload.withdrawalId)
    .single();

  if (withdrawalError || !withdrawal) {
    return NextResponse.json({ error: 'Withdrawal request not found' }, { status: 404 });
  }

  if (withdrawal.status !== 'approved') {
    return NextResponse.json({ error: 'Withdrawal is not approved' }, { status: 400 });
  }

  if (!withdrawal.user_id) {
    return NextResponse.json({ success: true, message: 'Withdrawal has no user' });
  }

  const amount = Number(withdrawal.amount || 0);
  const formattedAmount = formatCurrency(amount, withdrawal.currency || 'NGN');

  const { error: insertError } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: withdrawal.user_id,
      type: 'withdrawal_approved',
      title: 'Withdrawal Approved',
      body: `Your withdrawal of ${formattedAmount} has been approved.`,
    });

  if (insertError) {
    console.error('[notifications API] Failed to insert withdrawal approved notification', insertError);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }

  await sendWithdrawalApprovedEmail({
    userId: withdrawal.user_id,
    amount: Number(withdrawal.amount || 0),
    currency: withdrawal.currency,
  });

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase service role not configured' }, { status: 500 });
  }

  try {
    const body = (await request.json()) as { type?: NotificationType['type']; [key: string]: unknown } | null;
    const type = body?.type;

    if (!type) {
      return NextResponse.json({ error: 'Missing notification type' }, { status: 400 });
    }

    // For ticket purchases and location bookings, allow unauthenticated requests
    // (orderId/bookingId verification is sufficient)
    // For other notification types, require authentication
    const { user, isAdmin } = await getRequestUser(request);
    
    if (!user && type !== 'ticket_purchase' && type !== 'location_booking') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const context: HandlerContext = {
      request,
      user: user || { id: '' }, // Provide empty user for unauthenticated ticket purchases/location bookings
      isAdmin: isAdmin || false,
    };

    switch (type) {
      case 'ticket_purchase':
        return handleTicketPurchase(context, { orderId: String(body?.orderId || '') });
      case 'location_booking':
        return handleLocationBooking(context, { bookingId: String(body?.bookingId || '') });
      case 'withdrawal_request':
        return handleWithdrawalRequest(context, { withdrawalId: String(body?.withdrawalId || '') });
      case 'withdrawal_approved':
        return handleWithdrawalApproved(context, { withdrawalId: String(body?.withdrawalId || '') });
      default:
        return NextResponse.json({ error: 'Unsupported notification type' }, { status: 400 });
    }
  } catch (error) {
    console.error('[notifications API] Unhandled error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

