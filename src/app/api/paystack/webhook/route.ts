import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, generateTicketEmailHTML } from '@/utils/emailUtils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function processSuccessfulPayment(orderId: string, reference: string) {
  // Check if order exists and is still pending
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    console.error('[webhook] Order not found:', orderId, orderError);
    return;
  }

  // Already processed — idempotency guard
  if (order.status === 'paid') {
    console.log('[webhook] Order already paid, skipping:', orderId);
    return;
  }

  // Mark order as paid
  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'paid',
      payment_reference: reference,
      payment_provider: 'paystack',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', 'pending'); // only update if still pending (race-condition guard)

  if (updateError) {
    console.error('[webhook] Failed to mark order as paid:', updateError);
    return;
  }

  // Fetch event details
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, user_id, title, start_time, end_time, venue, location, address, city, country, is_virtual, virtual_details')
    .eq('id', order.event_id)
    .single();

  if (!event) {
    console.error('[webhook] Event not found for order:', orderId);
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
    console.error('[webhook] Ticket type not found:', ticketTypeName);
    return;
  }

  // Check if tickets already exist for this order (idempotency)
  const { data: existingTickets } = await supabaseAdmin
    .from('tickets')
    .select('id')
    .eq('order_id', orderId)
    .limit(1);

  if (existingTickets && existingTickets.length > 0) {
    console.log('[webhook] Tickets already created for order:', orderId);
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
    console.error('[webhook] Failed to create primary ticket:', primaryTicketError);
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

  // Update ticket sold count
  await supabaseAdmin
    .from('ticket_types')
    .update({ sold: ticketType.sold + quantity })
    .eq('id', ticketType.id);

  // Format event details for email
  const isVirtualEvent = Boolean(event.is_virtual);
  const virtualDetails = (event.virtual_details as Record<string, unknown> | null) || null;
  const rawMeetingUrl = typeof virtualDetails?.meetingUrl === 'string' ? virtualDetails.meetingUrl.trim() : '';
  const rawMeetingId = typeof virtualDetails?.meetingId === 'string' ? virtualDetails.meetingId.trim() : '';
  const virtualPlatform = typeof virtualDetails?.platform === 'string' ? virtualDetails.platform : undefined;
  let virtualAccessLink: string | undefined;
  if (rawMeetingUrl) {
    virtualAccessLink = rawMeetingUrl;
  } else if (virtualPlatform === 'zoom' && rawMeetingId) {
    virtualAccessLink = `https://zoom.us/j/${rawMeetingId}`;
  }

  const physicalVenueParts = [event.venue, event.location, event.address, event.city, event.country]
    .filter((p) => typeof p === 'string' && p.trim().length > 0);
  const formatPlatform = (v?: string) => {
    if (!v) return 'Online Event';
    return v.split(/[-_]/g).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  };
  const eventVenue = isVirtualEvent
    ? `${formatPlatform(virtualPlatform)} (Online)`
    : physicalVenueParts.join(', ') || 'TBD';

  const startDate = event.start_time ? new Date(event.start_time) : null;
  const endDate = event.end_time ? new Date(event.end_time) : null;
  const eventDate = startDate
    ? startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'TBD';
  const formatTime = (d: Date | null) =>
    d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
  const startFmt = formatTime(startDate);
  const endFmt = formatTime(endDate);
  const eventTime = startFmt && endFmt ? `${startFmt} - ${endFmt}` : startFmt || endFmt || 'TBD';

  // Fetch all created tickets to send emails
  const { data: allTickets } = await supabaseAdmin
    .from('tickets')
    .select('id, ticket_code, attendee_name, attendee_email')
    .eq('order_id', orderId);

  if (!allTickets || allTickets.length === 0) return;

  // Send ticket email to each attendee
  for (const ticket of allTickets) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accezzlive.com';
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${baseUrl}/validate-ticket?ticketId=${ticket.id}&signature=${ticket.ticket_code}`)}`;

      // Update QR code URL in DB
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

      console.log(`[webhook] Ticket email sent to ${ticket.attendee_email || order.buyer_email}`);
    } catch (emailErr) {
      console.error(`[webhook] Failed to send ticket email to ${ticket.attendee_email}:`, emailErr);
    }
  }

  // Send notification to event host
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accezzlive.com';
    await fetch(`${baseUrl}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ticket_purchase', orderId }),
    });
  } catch (notifyErr) {
    console.error('[webhook] Failed to send notification:', notifyErr);
  }

  // Trigger event reminder scheduling (server-side)
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accezzlive.com';
    await fetch(`${baseUrl}/api/inngest/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'order/paid', data: { orderId } }),
    });
  } catch (triggerErr) {
    console.error('[webhook] Failed to trigger reminder scheduling:', triggerErr);
  }

  console.log(`[webhook] Successfully processed payment for order ${orderId}`);
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature') || '';
    const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

    if (signature !== expected) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: {
        status?: string;
        reference?: string;
        metadata?: { orderId?: string };
      };
    };

    // Handle successful charge
    if (event.event === 'charge.success' && event.data?.status === 'success') {
      const reference = event.data.reference || '';
      const orderId = event.data.metadata?.orderId || '';

      if (orderId) {
        // Process asynchronously so we can return 200 immediately
        processSuccessfulPayment(orderId, reference).catch((err) => {
          console.error('[webhook] processSuccessfulPayment error:', err);
        });
      }
    }

    return NextResponse.json({ received: true, event: event?.event || 'unknown' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


