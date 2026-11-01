import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, fulfilOrder } from '@/utils/processOrder';
import { requireAuth } from '@/utils/apiAuth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Admin-only: issue a complimentary ticket. Goes through fulfil_order like a
 * normal purchase, so inventory and QR codes stay consistent.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('user_id', auth.userId)
    .maybeSingle();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { eventId, ticketTypeId, attendeeName, attendeeEmail, gender, sendEmail } = await request.json();

    if (!eventId || !ticketTypeId || !attendeeName || !attendeeEmail || !EMAIL_RE.test(String(attendeeEmail))) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: ticketType } = await supabaseAdmin
      .from('ticket_types')
      .select('id, name')
      .eq('id', ticketTypeId)
      .eq('event_id', eventId)
      .maybeSingle();
    if (!ticketType) return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });

    const { data: event } = await supabaseAdmin
      .from('events')
      .select('currency')
      .eq('id', eventId)
      .maybeSingle();
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        event_id: eventId,
        buyer_full_name: String(attendeeName).trim(),
        buyer_email: String(attendeeEmail).trim().toLowerCase(),
        currency: event.currency || 'NGN',
        total_amount: 0,
        status: 'pending',
        meta: {
          ticketTypeId: ticketType.id,
          ticketTypeName: ticketType.name,
          quantity: 1,
          unitPrice: 0, // complimentary: doesn't count towards organizer revenue
          primaryBuyerGender: gender || null,
          adminGenerated: true,
          issuedBy: auth.userId,
          pricedBy: 'server',
        },
      })
      .select('id')
      .single();

    if (orderErr || !order) {
      console.error('[generate-ticket] Order creation failed:', orderErr);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    const result = await fulfilOrder(
      order.id,
      { provider: 'admin', reference: `ADMIN-${order.id}` },
      { sendEmails: Boolean(sendEmail) }
    );
    if (result.status !== 'fulfilled') {
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }

    const ticketId = result.ticket_ids?.[0];
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('id, ticket_code')
      .eq('id', ticketId)
      .single();

    return NextResponse.json({ success: true, ticketCode: ticket?.ticket_code, ticketId, orderId: order.id });
  } catch (err) {
    console.error('[generate-ticket] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
