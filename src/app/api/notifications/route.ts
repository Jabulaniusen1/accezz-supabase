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
}) {
  const locationName = params.locationName || 'your location';
  const dateText = params.eventDate
    ? `scheduled for ${new Date(params.eventDate).toLocaleDateString()}`
    : 'with no date specified';

  const requesterGreeting = params.requesterName ? `Hi ${params.requesterName.split(' ')[0]},` : 'Hi there,';
  const requesterHtml = `
    <p>${requesterGreeting}</p>
    <p>Thanks for your booking request for <strong>${locationName}</strong> ${dateText}.</p>
    <p>The venue manager has received your request and will get back to you shortly.</p>
  `;
  await safeSendEmail(
    params.requesterEmail,
    'We received your booking request',
    requesterHtml,
    `${requesterGreeting} Thanks for your booking request for ${locationName} ${dateText}.`
  );

  const owner = await getUserContact(params.ownerUserId);
  if (owner.email) {
    const ownerGreeting = owner.fullName ? `Hi ${owner.fullName.split(' ')[0]},` : 'Hello,';
    const ownerHtml = `
      <p>${ownerGreeting}</p>
      <p>You have a new booking request for <strong>${locationName}</strong> ${dateText}.</p>
      <p>Visit your dashboard to review and respond.</p>
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
    <p>${greeting}</p>
    <p>Your withdrawal request for <strong>${formattedAmount}</strong> has been approved.</p>
    <p>The funds will be on their way shortly. Thanks for using Accezz!</p>
  `;
  await safeSendEmail(
    contact.email,
    'Your withdrawal has been approved',
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

  const isAuthorized =
    context.user.id === order.buyer_user_id ||
    context.user.id === event.user_id ||
    context.isAdmin;

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (order.status !== 'paid') {
    return NextResponse.json({ error: 'Order not paid' }, { status: 400 });
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

  const isAuthorized =
    (booking.requester_user_id && context.user.id === booking.requester_user_id) ||
    context.user.id === location.user_id ||
    context.isAdmin;

  if (!isAuthorized) {
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
    const { user, isAdmin } = await getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { type?: NotificationType['type']; [key: string]: unknown } | null;
    const type = body?.type;

    if (!type) {
      return NextResponse.json({ error: 'Missing notification type' }, { status: 400 });
    }

    const context: HandlerContext = {
      request,
      user,
      isAdmin,
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

