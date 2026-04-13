/**
 * Shared order processing logic.
 *
 * Used by both the Paystack webhook (primary path) and the verify endpoint
 * (fallback path when the webhook fires late or is not yet configured).
 *
 * The function is fully idempotent — it checks whether the order is already
 * paid and whether tickets already exist before doing any work.
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, generateTicketEmailHTML } from '@/utils/emailUtils';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export async function processSuccessfulPayment(orderId: string, reference: string): Promise<void> {
  // Fetch order
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    console.error('[processOrder] Order not found:', orderId, orderError);
    return;
  }

  // Idempotency guard — already processed
  if (order.status === 'paid') {
    // Tickets may already exist; nothing more to do.
    return;
  }

  // Mark order as paid (only if still pending — race-condition guard)
  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'paid',
      payment_reference: reference,
      payment_provider: 'paystack',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', 'pending');

  if (updateError) {
    console.error('[processOrder] Failed to mark order as paid:', updateError);
    return;
  }

  // Fetch event details
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, user_id, title, start_time, end_time, venue, location, address, city, country, is_virtual, virtual_details')
    .eq('id', order.event_id)
    .single();

  if (!event) {
    console.error('[processOrder] Event not found for order:', orderId);
    return;
  }

  const meta = (order.meta as Record<string, unknown> | null) || {};
  const ticketTypeName = (meta.ticketTypeName as string) || 'General';
  const quantity = (meta.quantity as number) || 1;
  const attendees = (meta.attendees as Array<{ name: string; email: string; gender?: string }>) || [];
  const primaryBuyerGender = (meta.primaryBuyerGender as string) || null;

  // Fetch ticket type
  const { data: ticketType } = await supabaseAdmin
    .from('ticket_types')
    .select('*')
    .eq('event_id', order.event_id)
    .eq('name', ticketTypeName)
    .single();

  if (!ticketType) {
    console.error('[processOrder] Ticket type not found:', ticketTypeName);
    return;
  }

  // Idempotency guard — tickets already created
  const { data: existingTickets } = await supabaseAdmin
    .from('tickets')
    .select('id')
    .eq('order_id', orderId)
    .limit(1);

  if (existingTickets && existingTickets.length > 0) {
    return;
  }

  // Create primary ticket
  const primaryTicketCode = generateTicketCode();
  const { data: primaryTicket, error: primaryTicketError } = await supabaseAdmin
    .from('tickets')
    .insert({
      order_id: orderId,
      event_id: order.event_id,
      ticket_type_id: ticketType.id,
      ticket_code: primaryTicketCode,
      qr_code_url: '',
      attendee_name: order.buyer_full_name,
      attendee_email: order.buyer_email,
      gender: primaryBuyerGender,
      price: ticketType.price,
      currency: order.currency,
      validation_status: 'valid',
    })
    .select('id')
    .single();

  if (primaryTicketError || !primaryTicket) {
    console.error('[processOrder] Failed to create primary ticket:', primaryTicketError);
    return;
  }

  // Create additional attendee tickets
  const additionalInserts = attendees.slice(0, quantity - 1).map((attendee) => ({
    order_id: orderId,
    event_id: order.event_id,
    ticket_type_id: ticketType.id,
    ticket_code: generateTicketCode(),
    qr_code_url: '',
    attendee_name: attendee.name,
    attendee_email: attendee.email,
    gender: attendee.gender || null,
    price: ticketType.price,
    currency: order.currency,
    validation_status: 'valid',
  }));

  if (additionalInserts.length > 0) {
    await supabaseAdmin.from('tickets').insert(additionalInserts);
  }

  // Atomically increment sold count
  await supabaseAdmin.rpc('increment_ticket_sold', {
    ticket_type_id: ticketType.id,
    amount: quantity,
  });

  // ── Build email content ──────────────────────────────────────────────────
  const isVirtualEvent = Boolean(event.is_virtual);
  const virtualDetails = (event.virtual_details as Record<string, unknown> | null) || null;
  const rawMeetingUrl = typeof virtualDetails?.meetingUrl === 'string' ? virtualDetails.meetingUrl.trim() : '';
  const rawMeetingId  = typeof virtualDetails?.meetingId  === 'string' ? virtualDetails.meetingId.trim()  : '';
  const virtualPlatform = typeof virtualDetails?.platform === 'string' ? virtualDetails.platform : undefined;

  let virtualAccessLink: string | undefined;
  if (rawMeetingUrl) {
    virtualAccessLink = rawMeetingUrl;
  } else if (virtualPlatform === 'zoom' && rawMeetingId) {
    virtualAccessLink = `https://zoom.us/j/${rawMeetingId}`;
  }

  const physicalVenueParts = [event.venue, event.location, event.address, event.city, event.country]
    .filter((p) => typeof p === 'string' && p.trim().length > 0);

  const formatPlatform = (v?: string) =>
    v ? v.split(/[-_]/g).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') : 'Online Event';

  const eventVenue = isVirtualEvent
    ? `${formatPlatform(virtualPlatform)} (Online)`
    : physicalVenueParts.join(', ') || 'TBD';

  const startDate = event.start_time ? new Date(event.start_time) : null;
  const endDate   = event.end_time   ? new Date(event.end_time)   : null;

  const eventDate = startDate
    ? startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'TBD';

  const fmt = (d: Date | null) =>
    d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
  const startFmt = fmt(startDate);
  const endFmt   = fmt(endDate);
  const eventTime = startFmt && endFmt ? `${startFmt} - ${endFmt}` : startFmt || endFmt || 'TBD';

  // ── Fetch all created tickets and send emails ────────────────────────────
  const { data: allTickets } = await supabaseAdmin
    .from('tickets')
    .select('id, ticket_code, attendee_name, attendee_email')
    .eq('order_id', orderId);

  if (!allTickets || allTickets.length === 0) return;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accezzlive.com';

  for (const ticket of allTickets) {
    try {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
        `${baseUrl}/validate-ticket?ticketId=${ticket.id}&signature=${ticket.ticket_code}`
      )}`;

      // Persist QR code URL
      await supabaseAdmin.from('tickets').update({ qr_code_url: qrCodeUrl }).eq('id', ticket.id);

      const html = generateTicketEmailHTML({
        fullName: ticket.attendee_name || order.buyer_full_name || 'Attendee',
        eventTitle: event.title || 'Event',
        eventDate,
        eventTime,
        venue: eventVenue,
        ticketType: ticketType.name,
        quantity: 1,
        ticketCodes: [ticket.ticket_code],
        totalAmount: ticketType.price,
        currency: order.currency || 'NGN',
        orderId,
        qrCodeUrl: isVirtualEvent ? undefined : qrCodeUrl,
        isVirtual: isVirtualEvent,
        virtualAccessLink,
        virtualPlatform,
        virtualMeetingId: rawMeetingId || undefined,
      });

      await sendEmail({
        to: ticket.attendee_email || order.buyer_email,
        subject: `Your Tickets for ${event.title || 'the event'}`,
        html,
      });
    } catch (emailErr) {
      console.error(`[processOrder] Failed to send ticket email to ${ticket.attendee_email}:`, emailErr);
    }
  }

  // ── Notify event host (in-app + email) ───────────────────────────────────
  try {
    await fetch(`${baseUrl}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ticket_purchase', orderId }),
    });
  } catch (notifyErr) {
    console.error('[processOrder] Failed to send notification:', notifyErr);
  }

  // ── Trigger reminder scheduling (non-critical) ───────────────────────────
  try {
    const secret = process.env.INTERNAL_API_SECRET;
    if (secret) {
      await fetch(`${baseUrl}/api/inngest/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': secret,
        },
        body: JSON.stringify({ eventName: 'order/paid', data: { orderId } }),
      });
    }
  } catch (triggerErr) {
    console.error('[processOrder] Failed to trigger reminder scheduling:', triggerErr);
  }
}
