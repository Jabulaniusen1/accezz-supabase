import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { generateTicketCode } from '@/utils/processOrder';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function getAdminClient(request: NextRequest) {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const cookieStore = await cookies();
  const authHeader = request.headers.get('authorization');
  let accessToken: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    accessToken = authHeader.replace('Bearer ', '');
  } else {
    for (const name of ['sb-access-token', 'supabase-auth-token']) {
      const cookie = cookieStore.get(name);
      if (cookie) { accessToken = cookie.value; break; }
    }
  }

  if (!accessToken) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_admin) return null;

  return supabaseAdmin;
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const supabaseAdmin = await getAdminClient(request);
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { eventId, ticketTypeId, attendeeName, attendeeEmail, gender, sendEmail } = await request.json();

    if (!eventId || !ticketTypeId || !attendeeName || !attendeeEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch event and ticket type in parallel
    const [{ data: event, error: evErr }, { data: ticketType, error: ttErr }] = await Promise.all([
      supabaseAdmin.from('events')
        .select('id, title, start_time, end_time, venue, location, address, city, country, currency, is_virtual, virtual_details, user_id')
        .eq('id', eventId)
        .single(),
      supabaseAdmin.from('ticket_types')
        .select('id, name, price, quantity, sold')
        .eq('id', ticketTypeId)
        .eq('event_id', eventId)
        .single(),
    ]);

    if (evErr || !event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    if (ttErr || !ticketType) return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });

    const currency = event.currency || 'NGN';

    // Create a paid order (admin-generated, complimentary)
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        event_id: eventId,
        buyer_full_name: attendeeName,
        buyer_email: attendeeEmail,
        currency,
        total_amount: 0,
        status: 'paid',
        payment_provider: 'admin',
        payment_reference: `ADMIN-${Date.now()}`,
        meta: {
          ticketTypeName: ticketType.name,
          quantity: 1,
          attendees: [],
          primaryBuyerGender: gender || null,
          adminGenerated: true,
        },
      })
      .select('id')
      .single();

    if (orderErr || !order) {
      console.error('[generate-ticket] Order creation failed:', orderErr);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // Insert ticket
    const ticketCode = generateTicketCode();
    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from('tickets')
      .insert({
        order_id: order.id,
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        ticket_code: ticketCode,
        qr_code_url: '',
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        gender: gender || null,
        price: Number(ticketType.price) || 0,
        currency,
        validation_status: 'valid',
      })
      .select('id')
      .single();

    if (ticketErr || !ticket) {
      console.error('[generate-ticket] Ticket creation failed:', ticketErr);
      // Rollback order
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }

    // Increment sold count
    await supabaseAdmin
      .from('ticket_types')
      .update({ sold: Number(ticketType.sold || 0) + 1 })
      .eq('id', ticketTypeId);

    // Send ticket email if requested
    if (sendEmail) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

        const startDate = event.start_time ? new Date(event.start_time) : null;
        const endDate = event.end_time ? new Date(event.end_time) : null;
        const eventDate = startDate
          ? startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          : 'TBD';
        const fmt = (d: Date | null) =>
          d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
        const startFmt = fmt(startDate);
        const endFmt = fmt(endDate);
        const eventTime = startFmt && endFmt ? `${startFmt} - ${endFmt}` : startFmt || 'TBD';

        const isVirtual = Boolean(event.is_virtual);
        const virtualDetails = (event.virtual_details as Record<string, unknown> | null) || null;
        const rawMeetingUrl = typeof virtualDetails?.meetingUrl === 'string' ? virtualDetails.meetingUrl.trim() : '';
        const rawMeetingId = typeof virtualDetails?.meetingId === 'string' ? virtualDetails.meetingId.trim() : '';
        const virtualPlatform = typeof virtualDetails?.platform === 'string' ? virtualDetails.platform : undefined;

        let virtualAccessLink: string | undefined;
        if (rawMeetingUrl) virtualAccessLink = rawMeetingUrl;
        else if (virtualPlatform === 'zoom' && rawMeetingId) virtualAccessLink = `https://zoom.us/j/${rawMeetingId}`;

        const venueParts = [event.venue, event.location, event.address, event.city, event.country]
          .filter((p) => typeof p === 'string' && p.trim().length > 0);
        const venue = isVirtual
          ? `${virtualPlatform || 'Online'} (Online)`
          : venueParts.join(', ') || 'TBD';

        // Generate QR code URL
        const validateUrl = `${baseUrl}/validate-ticket?ticketId=${ticket.id}&signature=${ticketCode}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(validateUrl)}`;

        // Update ticket with QR URL
        await supabaseAdmin.from('tickets').update({ qr_code_url: qrCodeUrl }).eq('id', ticket.id);

        await fetch(`${baseUrl}/api/emails/ticket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
          },
          body: JSON.stringify({
            email: attendeeEmail,
            fullName: attendeeName,
            eventTitle: event.title,
            eventDate,
            eventTime,
            venue,
            ticketType: ticketType.name,
            quantity: 1,
            ticketCodes: [ticketCode],
            totalAmount: 0,
            currency,
            orderId: order.id,
            qrCodeUrl,
            ticketId: ticket.id,
            primaryTicketCode: ticketCode,
            isVirtual,
            virtualAccessLink,
            virtualPlatform,
            virtualMeetingId: rawMeetingId || undefined,
          }),
        });
      } catch (emailErr) {
        console.error('[generate-ticket] Email error (non-fatal):', emailErr);
      }
    }

    return NextResponse.json({ success: true, ticketCode, ticketId: ticket.id, orderId: order.id });
  } catch (err) {
    console.error('[generate-ticket] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
