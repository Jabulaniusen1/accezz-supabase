/**
 * Shared order fulfilment logic (server only).
 *
 * Ticket issuance happens in the `fulfil_order` database function: it locks the
 * order, checks the amount paid, issues the tickets, updates inventory and
 * marks the order paid in one transaction. It is idempotent, so the Paystack
 * webhook and the verify endpoint can both call it safely.
 *
 * After a successful fulfilment this module runs the follow-up work: QR codes,
 * ticket emails, affiliate commission, host notification and reminders.
 */

import { createClient } from '@supabase/supabase-js';
import { sendEmail, generateTicketEmailHTML } from '@/utils/emailUtils';
import { inngest } from '@/utils/inngest';
import { storeTicketQr, getBaseUrl } from '@/utils/ticketQr';
import { withVirtualAccess } from '@/utils/virtualAccess';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Event times are shown in the organizer's market timezone, not the server's (UTC).
const DISPLAY_TIMEZONE = process.env.EVENT_TIMEZONE || 'Africa/Lagos';

export type PaymentProvider = 'paystack' | 'free' | 'admin';

export interface PaymentDetails {
  provider: PaymentProvider;
  reference?: string | null;
  /** Amount actually paid, in major units (e.g. naira). Required for paystack. */
  amountPaid?: number | null;
  currency?: string | null;
}

export type FulfilStatus =
  | 'fulfilled'
  | 'already_fulfilled'
  | 'not_found'
  | 'invalid_status'
  | 'ticket_type_missing'
  | 'not_free'
  | 'sold_out'
  | 'amount_mismatch';

export interface FulfilResult {
  status: FulfilStatus;
  ticket_ids?: string[];
  quantity?: number;
  oversold?: boolean;
  [key: string]: unknown;
}

/**
 * Issue tickets for an order and run the follow-up work.
 * Throws only on infrastructure errors (so webhooks can be retried);
 * business outcomes such as an amount mismatch are returned as a status.
 */
export async function fulfilOrder(
  orderId: string,
  payment: PaymentDetails,
  options: { sendEmails?: boolean } = {}
): Promise<FulfilResult> {
  const { data, error } = await supabaseAdmin.rpc('fulfil_order', {
    p_order_id: orderId,
    p_provider: payment.provider,
    p_reference: payment.reference ?? null,
    p_amount_paid: payment.amountPaid ?? null,
    p_currency: payment.currency ?? null,
  });

  if (error) {
    throw new Error(`fulfil_order failed for ${orderId}: ${error.message}`);
  }

  const result = data as FulfilResult;

  if (result.status === 'fulfilled' || result.status === 'already_fulfilled') {
    if (result.oversold) {
      console.warn('[processOrder] Order fulfilled beyond ticket quantity (paid orders are always honoured):', orderId);
    }
    // Runs once per order; a later webhook retry picks it up again if the
    // request that issued the tickets died before finishing
    if (await claimPostFulfilment(orderId)) {
      await runPostFulfilment(orderId, payment.provider, options.sendEmails ?? true);
      await supabaseAdmin
        .from('orders')
        .update({ post_fulfilment_done_at: new Date().toISOString() })
        .eq('id', orderId);
    }
  } else {
    console.error('[processOrder] Order not fulfilled:', orderId, result);
  }

  return result;
}

const STALE_CLAIM_MS = 10 * 60 * 1000;

/** Atomically claim the post-fulfilment work (emails, QR codes, notifications). */
async function claimPostFulfilment(orderId: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ post_fulfilment_claimed_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', 'paid')
    .is('post_fulfilment_done_at', null)
    .or(`post_fulfilment_claimed_at.is.null,post_fulfilment_claimed_at.lt.${staleBefore}`)
    .select('id');
  if (error) {
    console.error('[processOrder] Could not claim post-fulfilment work:', orderId, error);
    return false;
  }
  return Boolean(data && data.length > 0);
}

type OrderRow = {
  id: string;
  event_id: string;
  buyer_user_id: string | null;
  buyer_full_name: string | null;
  buyer_email: string;
  total_amount: number;
  currency: string | null;
  meta: Record<string, unknown> | null;
};

type EventRow = {
  id: string;
  title: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  location: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  is_virtual: boolean | null;
  virtual_details: Record<string, unknown> | null;
};

async function runPostFulfilment(orderId: string, provider: PaymentProvider, sendEmails: boolean): Promise<void> {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, event_id, buyer_user_id, buyer_full_name, buyer_email, total_amount, currency, meta')
    .eq('id', orderId)
    .single<OrderRow>();
  if (!order) return;

  if (provider === 'paystack') {
    try {
      await recordAffiliateCommission(order);
    } catch (affErr) {
      // Non-critical — never fail a paid order over affiliate bookkeeping
      console.error('[processOrder] Affiliate commission error:', affErr);
    }
  }

  try {
    await sendTicketEmails(order, sendEmails);
  } catch (emailErr) {
    console.error('[processOrder] Ticket email error:', emailErr);
  }

  if (provider !== 'admin') {
    await notifyHost(orderId);
  }

  try {
    // Deterministic id: Inngest drops duplicate events, so reminders are scheduled once
    await inngest.send({ id: `order-paid-${orderId}`, name: 'order/paid', data: { orderId } });
  } catch (triggerErr) {
    console.error('[processOrder] Failed to schedule reminders:', triggerErr);
  }
}

async function recordAffiliateCommission(order: OrderRow): Promise<void> {
  const affiliateCode = typeof order.meta?.affiliateCode === 'string' ? order.meta.affiliateCode : null;
  if (!affiliateCode) return;

  const { data: affiliate } = await supabaseAdmin
    .from('affiliates')
    .select('id, user_id')
    .eq('affiliate_code', affiliateCode)
    .eq('event_id', order.event_id)
    .maybeSingle();
  if (!affiliate || affiliate.user_id === order.buyer_user_id) return;

  // Guest checkout through your own link is still self-referral
  const { data: affiliateUser } = await supabaseAdmin.auth.admin.getUserById(affiliate.user_id);
  const affiliateEmail = affiliateUser?.user?.email?.toLowerCase();
  if (affiliateEmail && affiliateEmail === order.buyer_email.toLowerCase()) return;

  const { data: settings } = await supabaseAdmin
    .from('affiliate_settings')
    .select('enabled, commission_type, commission_value')
    .eq('event_id', order.event_id)
    .maybeSingle();
  if (!settings?.enabled) return;

  const orderAmount = Number(order.total_amount) || 0;
  const value = Number(settings.commission_value);
  if (!Number.isFinite(value) || value <= 0 || orderAmount <= 0) return;

  const raw = settings.commission_type === 'percentage'
    ? (orderAmount * Math.min(value, 100)) / 100
    : Math.min(value, orderAmount);
  const commission = Math.round(raw * 100) / 100;
  if (commission <= 0) return;

  // unique(order_id): a second run inserts nothing and must not bump the stats
  const { data: inserted, error } = await supabaseAdmin
    .from('affiliate_commissions')
    .upsert(
      {
        affiliate_id: affiliate.id,
        user_id: affiliate.user_id,
        order_id: order.id,
        event_id: order.event_id,
        amount: commission,
        currency: order.currency || 'NGN',
        status: 'pending',
      },
      { onConflict: 'order_id', ignoreDuplicates: true }
    )
    .select('id');
  if (error) throw error;

  if (inserted && inserted.length > 0) {
    await supabaseAdmin.rpc('increment_affiliate_stats', {
      p_affiliate_id: affiliate.id,
      p_commission: commission,
    });
  }
}

function describeEvent(event: EventRow) {
  const isVirtual = Boolean(event.is_virtual);
  const virtualDetails = event.virtual_details || null;
  const meetingUrl = typeof virtualDetails?.meetingUrl === 'string' ? virtualDetails.meetingUrl.trim() : '';
  const meetingId = typeof virtualDetails?.meetingId === 'string' ? virtualDetails.meetingId.trim() : '';
  const platform = typeof virtualDetails?.platform === 'string' ? virtualDetails.platform : undefined;

  let virtualAccessLink: string | undefined;
  if (meetingUrl) {
    virtualAccessLink = meetingUrl;
  } else if (platform === 'zoom' && meetingId) {
    virtualAccessLink = `https://zoom.us/j/${meetingId}`;
  }

  const formatPlatform = (v?: string) =>
    v ? v.split(/[-_]/g).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') : 'Online Event';

  const physicalVenue = [event.venue, event.location, event.address, event.city, event.country]
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .join(', ');

  const startDate = event.start_time ? new Date(event.start_time) : null;
  const endDate = event.end_time ? new Date(event.end_time) : null;

  const eventDate = startDate
    ? startDate.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: DISPLAY_TIMEZONE,
      })
    : 'TBD';
  const fmt = (d: Date | null) =>
    d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: DISPLAY_TIMEZONE }) : null;
  const startFmt = fmt(startDate);
  const endFmt = fmt(endDate);

  return {
    isVirtual,
    virtualAccessLink,
    virtualPlatform: platform,
    virtualMeetingId: meetingId || undefined,
    venue: isVirtual ? `${formatPlatform(platform)} (Online)` : physicalVenue || 'TBD',
    eventDate,
    eventTime: startFmt && endFmt ? `${startFmt} - ${endFmt}` : startFmt || endFmt || 'TBD',
  };
}

/**
 * Re-render the QR code and email specific tickets of an order to their
 * current attendee (used after a ticket transfer).
 */
export async function resendTicketEmails(orderId: string, ticketIds: string[]): Promise<void> {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, event_id, buyer_user_id, buyer_full_name, buyer_email, total_amount, currency, meta')
    .eq('id', orderId)
    .single<OrderRow>();
  if (!order) return;
  await sendTicketEmails(order, true, ticketIds);
}

async function sendTicketEmails(order: OrderRow, sendEmails: boolean, onlyTicketIds?: string[]): Promise<void> {
  let ticketQuery = supabaseAdmin
    .from('tickets')
    .select('id, ticket_code, attendee_name, attendee_email, price, ticket_types(name)')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });
  if (onlyTicketIds) ticketQuery = ticketQuery.in('id', onlyTicketIds);

  const [{ data: event }, { data: tickets }] = await Promise.all([
    supabaseAdmin
      .from('events')
      .select('id, title, start_time, end_time, venue, location, address, city, country, is_virtual, virtual_details')
      .eq('id', order.event_id)
      .single<EventRow>(),
    ticketQuery,
  ]);
  if (!event || !tickets || tickets.length === 0) return;

  if (event.is_virtual) {
    event.virtual_details = await withVirtualAccess(supabaseAdmin, event.id, event.virtual_details);
  }
  const details = describeEvent(event);

  await Promise.all(
    tickets.map(async (ticket) => {
      try {
        const qrCodeUrl = await storeTicketQr(supabaseAdmin, ticket.id, ticket.ticket_code);
        if (!sendEmails) return;
        const ticketTypeName = (ticket.ticket_types as unknown as { name?: string } | null)?.name || 'General';

        const html = generateTicketEmailHTML({
          fullName: ticket.attendee_name || order.buyer_full_name || 'Attendee',
          eventTitle: event.title || 'Event',
          eventDate: details.eventDate,
          eventTime: details.eventTime,
          venue: details.venue,
          ticketType: ticketTypeName,
          quantity: 1,
          ticketCodes: [ticket.ticket_code],
          totalAmount: Number(ticket.price) || 0,
          currency: order.currency || 'NGN',
          orderId: order.id,
          qrCodeUrl: details.isVirtual ? undefined : qrCodeUrl,
          isVirtual: details.isVirtual,
          virtualAccessLink: details.virtualAccessLink,
          virtualPlatform: details.virtualPlatform,
          virtualMeetingId: details.virtualMeetingId,
        });

        await sendEmail({
          to: ticket.attendee_email || order.buyer_email,
          subject: `Your Tickets for ${event.title || 'the event'}`,
          html,
        });
      } catch (emailErr) {
        console.error(`[processOrder] Failed to send ticket email for ticket ${ticket.id}:`, emailErr);
      }
    })
  );
}

async function notifyHost(orderId: string): Promise<void> {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    console.warn('[processOrder] INTERNAL_API_SECRET not set — skipping host notification');
    return;
  }
  try {
    await fetch(`${getBaseUrl()}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({ type: 'ticket_purchase', orderId }),
    });
  } catch (notifyErr) {
    console.error('[processOrder] Failed to send host notification:', notifyErr);
  }
}
