import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, fulfilOrder } from '@/utils/processOrder';
import { getOptionalUser } from '@/utils/apiAuth';
import { inngest } from '@/utils/inngest';

// Free orders issue tickets and send emails in this request
export const maxDuration = 60;

const MAX_TICKETS_PER_ORDER = 20;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GENDERS = new Set(['male', 'female', 'other', 'prefer-not-to-say']);

type AttendeeInput = { name?: unknown; email?: unknown; gender?: unknown };

function cleanText(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanGender(value: unknown): string | null {
  const g = cleanText(value, 32).toLowerCase();
  return GENDERS.has(g) ? g : null;
}

/**
 * Create an order. The server looks up the ticket type, checks availability
 * and computes the price; nothing about the amount is taken from the browser.
 * Free orders are fulfilled immediately.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const eventId = cleanText(body.eventId, 64);
    const ticketTypeId = cleanText(body.ticketTypeId, 64);
    const ticketTypeName = cleanText(body.ticketTypeName);
    const quantity = Number(body.quantity);
    const email = cleanText(body.email, 254).toLowerCase();
    const fullName = cleanText(body.fullName);
    const phone = cleanText(body.phone, 40);
    const affiliateCode = cleanText(body.affiliateCode, 64) || null;

    if (!UUID_RE.test(eventId)) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_TICKETS_PER_ORDER) {
      return NextResponse.json({ error: `You can buy between 1 and ${MAX_TICKETS_PER_ORDER} tickets per order` }, { status: 400 });
    }
    if (!fullName || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter your full name and a valid email address' }, { status: 400 });
    }

    const rawAttendees = Array.isArray(body.attendees) ? (body.attendees as AttendeeInput[]) : [];
    const attendees = rawAttendees.slice(0, quantity - 1).map((a) => ({
      name: cleanText(a?.name),
      email: cleanText(a?.email, 254).toLowerCase(),
      gender: cleanGender(a?.gender),
    }));
    if (attendees.some((a) => !a.name || !EMAIL_RE.test(a.email))) {
      return NextResponse.json({ error: 'Please enter a name and valid email for every ticket holder' }, { status: 400 });
    }

    // Event must be published and not over
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, status, start_time, end_time')
      .eq('id', eventId)
      .maybeSingle();
    if (!event || event.status !== 'published') {
      return NextResponse.json({ error: 'This event is not available' }, { status: 404 });
    }
    // Same rule as isEventPast() in eventUtils: without an end time, sales stay
    // open for 24 hours after the start (door sales while the event runs)
    const endsAt = event.end_time
      ? new Date(event.end_time).getTime()
      : new Date(event.start_time).getTime() + 24 * 60 * 60 * 1000;
    if (Number.isFinite(endsAt) && endsAt < Date.now()) {
      return NextResponse.json({ error: 'This event has already ended' }, { status: 400 });
    }

    // Ticket type must belong to the event
    let typeQuery = supabaseAdmin
      .from('ticket_types')
      .select('id, name, price, quantity, sold')
      .eq('event_id', eventId);
    typeQuery = UUID_RE.test(ticketTypeId) ? typeQuery.eq('id', ticketTypeId) : typeQuery.eq('name', ticketTypeName);
    const { data: ticketType } = await typeQuery.maybeSingle();
    if (!ticketType) {
      return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });
    }

    const available = Number(ticketType.quantity) - Number(ticketType.sold);
    if (available < quantity) {
      return NextResponse.json(
        { error: available > 0 ? `Only ${available} ticket(s) left` : 'This ticket type is sold out' },
        { status: 409 }
      );
    }

    const unitPrice = Number(ticketType.price) || 0;
    const totalAmount = Math.round(unitPrice * quantity * 100) / 100;
    const buyer = await getOptionalUser(req);

    // Only keep an affiliate code that is valid for this event and not the buyer's own
    let validAffiliateCode: string | null = null;
    if (affiliateCode && totalAmount > 0) {
      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('user_id')
        .eq('affiliate_code', affiliateCode)
        .eq('event_id', eventId)
        .maybeSingle();
      if (affiliate && affiliate.user_id !== buyer?.id) {
        validAffiliateCode = affiliateCode;
      }
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        event_id: eventId,
        buyer_user_id: buyer?.id || null,
        buyer_full_name: fullName,
        buyer_email: email,
        buyer_phone: phone || null,
        currency: 'NGN',
        total_amount: totalAmount,
        status: 'pending',
        meta: {
          ticketTypeId: ticketType.id,
          ticketTypeName: ticketType.name,
          quantity,
          unitPrice,
          attendees: attendees.length > 0 ? attendees : null,
          primaryBuyerGender: cleanGender(body.gender),
          affiliateCode: validAffiliateCode,
          pricedBy: 'server',
        },
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('[api/orders] Failed to create order:', orderError);
      return NextResponse.json({ error: 'Could not create your order. Please try again.' }, { status: 500 });
    }

    if (totalAmount === 0) {
      const result = await fulfilOrder(order.id, { provider: 'free' });
      if (result.status === 'sold_out') {
        return NextResponse.json({ error: 'Sorry, these tickets just sold out' }, { status: 409 });
      }
      if (result.status !== 'fulfilled' && result.status !== 'already_fulfilled') {
        return NextResponse.json({ error: 'Could not issue your free ticket. Please try again.' }, { status: 500 });
      }
      return NextResponse.json({ orderId: order.id, totalAmount: 0, currency: 'NGN', free: true });
    }

    try {
      // Schedules the abandoned-cart reminder
      await inngest.send({ id: `order-created-${order.id}`, name: 'order/created', data: { orderId: order.id } });
    } catch (inngestError) {
      console.error('[api/orders] Failed to schedule abandoned-cart email:', inngestError);
    }

    return NextResponse.json({ orderId: order.id, totalAmount, currency: 'NGN', free: false });
  } catch (err) {
    console.error('[api/orders] Unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
