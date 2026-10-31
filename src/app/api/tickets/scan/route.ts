import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/utils/processOrder';
import { requireAuth, safeEqual } from '@/utils/apiAuth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TicketRow = {
  id: string;
  ticket_code: string;
  event_id: string;
  attendee_name: string | null;
  attendee_email: string | null;
  price: number;
  currency: string | null;
  validation_status: string;
  is_scanned: boolean;
  scanned_at: string | null;
  created_at: string;
  ticket_types: { name: string } | null;
  orders: { buyer_full_name: string | null; buyer_phone: string | null; status: string } | null;
  events: { id: string; user_id: string; title: string; image_url: string | null; start_time: string; end_time: string | null; venue: string | null; location: string | null; address: string | null; city: string | null } | null;
};

/**
 * Load a ticket for check-in. The caller must be signed in as the event's
 * organizer (or an admin), and the QR signature must match the ticket code.
 */
async function loadTicketForScanner(user: User, ticketId: string | null, signature: string | null) {
  if (!ticketId || !UUID_RE.test(ticketId) || !signature) {
    return { error: NextResponse.json({ error: 'Invalid ticket link' }, { status: 400 }) };
  }

  const { data } = await supabaseAdmin
    .from('tickets')
    .select(`
      id, ticket_code, event_id, attendee_name, attendee_email, price, currency,
      validation_status, is_scanned, scanned_at, created_at,
      ticket_types ( name ),
      orders ( buyer_full_name, buyer_phone, status ),
      events ( id, user_id, title, image_url, start_time, end_time, venue, location, address, city )
    `)
    .eq('id', ticketId)
    .maybeSingle();

  const ticket = data as unknown as TicketRow | null;
  if (!ticket || !safeEqual(ticket.ticket_code, signature)) {
    return { error: NextResponse.json({ error: 'Ticket not found' }, { status: 404 }) };
  }

  if (ticket.events?.user_id !== user.id) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.is_admin) {
      return {
        error: NextResponse.json(
          { error: 'Only the organizer of this event can check in tickets.', reason: 'not_organizer' },
          { status: 403 }
        ),
      };
    }
  }

  return { ticket };
}

function toResponse(ticket: TicketRow) {
  return {
    id: ticket.id,
    attendeeName: ticket.attendee_name || ticket.orders?.buyer_full_name || '',
    attendeeEmail: ticket.attendee_email || '',
    buyerName: ticket.orders?.buyer_full_name || '',
    buyerPhone: ticket.orders?.buyer_phone || '',
    ticketType: ticket.ticket_types?.name || 'General',
    price: Number(ticket.price) || 0,
    currency: ticket.currency || 'NGN',
    purchaseDate: ticket.created_at,
    validationStatus: ticket.validation_status,
    isScanned: ticket.is_scanned,
    scannedAt: ticket.scanned_at,
    event: ticket.events
      ? {
          id: ticket.events.id,
          title: ticket.events.title,
          image: ticket.events.image_url || '',
          startTime: ticket.events.start_time,
          endTime: ticket.events.end_time,
          location: ticket.events.venue || ticket.events.location || ticket.events.address || ticket.events.city || '',
        }
      : null,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const result = await loadTicketForScanner(
    auth.user,
    req.nextUrl.searchParams.get('ticketId'),
    req.nextUrl.searchParams.get('signature')
  );
  if ('error' in result) return result.error;

  return NextResponse.json({ ticket: toResponse(result.ticket) });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const body = await req.json().catch(() => null) as { ticketId?: string; signature?: string } | null;
  const result = await loadTicketForScanner(auth.user, body?.ticketId ?? null, body?.signature ?? null);
  if ('error' in result) return result.error;
  const { ticket } = result;

  // Conditional update: only one scanner can ever win
  const { data: updated, error } = await supabaseAdmin
    .from('tickets')
    .update({ is_scanned: true, scanned_at: new Date().toISOString() })
    .eq('id', ticket.id)
    .eq('is_scanned', false)
    .eq('validation_status', 'valid')
    .select('scanned_at');

  if (error) {
    console.error('[tickets/scan] Update failed:', error);
    return NextResponse.json({ error: 'Could not check in ticket' }, { status: 500 });
  }

  let scanResult: 'success' | 'duplicate' | 'revoked' | 'invalid';
  if (updated && updated.length > 0) {
    scanResult = 'success';
  } else {
    const { data: current } = await supabaseAdmin
      .from('tickets')
      .select('is_scanned, validation_status')
      .eq('id', ticket.id)
      .single();
    if (current?.validation_status !== 'valid') {
      scanResult = current?.validation_status === 'invalid' ? 'invalid' : 'revoked';
    } else {
      scanResult = 'duplicate';
    }
  }

  await supabaseAdmin.from('ticket_scans').insert({
    ticket_id: ticket.id,
    scanned_by_user_id: auth.userId,
    result: scanResult,
  });

  const { data: fresh } = await supabaseAdmin
    .from('tickets')
    .select('is_scanned, scanned_at, validation_status')
    .eq('id', ticket.id)
    .single();

  return NextResponse.json(
    {
      result: scanResult,
      ticket: toResponse({ ...ticket, ...(fresh || {}) } as TicketRow),
    },
    { status: scanResult === 'success' ? 200 : 409 }
  );
}
