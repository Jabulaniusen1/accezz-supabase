import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/processOrder';
import { getOptionalUser } from '@/utils/apiAuth';
import { withVirtualAccess } from '@/utils/virtualAccess';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Invoice / order status for the success and invoice pages.
 *
 * The order id (a random UUID only shared with the buyer through their
 * checkout redirect and emails) acts as the access key, so guest buyers can
 * see their order without an account. Tickets transferred to another account
 * are hidden unless the signed-in viewer is their new owner.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select(`
      id, buyer_user_id, buyer_full_name, buyer_email, buyer_phone, total_amount, service_fee,
      processing_fee, amount_due, currency,
      status, payment_reference, created_at, meta,
      events (
        id, slug, title, image_url, start_time, end_time, venue, address, city, country,
        is_virtual, virtual_details
      )
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const viewer = await getOptionalUser(req);

  const { data: tickets } = await supabaseAdmin
    .from('tickets')
    .select('id, ticket_code, qr_code_url, attendee_name, attendee_email, price, currency, validation_status, is_scanned, owner_user_id, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  // A signed-in transfer recipient (not the buyer) only sees their own
  // tickets and none of the buyer's contact details
  const isRecipientView = Boolean(
    viewer
    && viewer.id !== order.buyer_user_id
    && (tickets || []).some((t) => t.owner_user_id === viewer.id)
  );

  const visibleTickets = (tickets || []).filter((t) =>
    isRecipientView
      ? t.owner_user_id === viewer!.id
      : !t.owner_user_id
        || t.owner_user_id === order.buyer_user_id
        || (viewer && t.owner_user_id === viewer.id)
  );
  const transferredCount = isRecipientView ? 0 : (tickets || []).length - visibleTickets.length;

  const event = order.events as unknown as Record<string, unknown> | null;
  const meta = (order.meta as Record<string, unknown> | null) || {};
  const isPaid = order.status === 'paid';
  if (event && isPaid && event.is_virtual) {
    event.virtual_details = await withVirtualAccess(
      supabaseAdmin,
      String(event.id),
      event.virtual_details as Record<string, unknown> | null
    );
  }

  return NextResponse.json({
    order: {
      id: order.id,
      buyer_full_name: isRecipientView ? (viewer?.user_metadata?.full_name ?? null) : order.buyer_full_name,
      buyer_email: isRecipientView ? (viewer?.email ?? '') : order.buyer_email,
      buyer_phone: isRecipientView ? null : order.buyer_phone,
      // total_amount = tickets; amount_due = tickets + service charge + processing fee.
      // A transfer recipient only sees the value of their own tickets.
      total_amount: isRecipientView
        ? visibleTickets.reduce((sum, t) => sum + (Number(t.price) || 0), 0)
        : order.total_amount,
      service_fee: isRecipientView ? 0 : order.service_fee,
      processing_fee: isRecipientView ? 0 : order.processing_fee,
      amount_due: isRecipientView
        ? visibleTickets.reduce((sum, t) => sum + (Number(t.price) || 0), 0)
        : order.amount_due,
      currency: order.currency,
      status: order.status,
      payment_reference: isRecipientView ? null : order.payment_reference,
      created_at: order.created_at,
      meta: {
        ticketTypeId: meta.ticketTypeId ?? null,
        ticketTypeName: meta.ticketTypeName ?? null,
        quantity: meta.quantity ?? null,
        attendees: isRecipientView ? null : meta.attendees ?? null,
        // Lets the buyer resume a pending order at checkout
        primaryBuyerGender: isRecipientView ? null : meta.primaryBuyerGender ?? null,
      },
    },
    // Meeting links are only for paid orders
    event: event ? { ...event, virtual_details: isPaid ? event.virtual_details : null } : null,
    tickets: visibleTickets.map((t) => ({
      id: t.id,
      ticket_code: t.ticket_code,
      qr_code_url: t.qr_code_url,
      attendee_name: t.attendee_name,
      attendee_email: t.attendee_email,
      price: t.price,
      currency: t.currency,
      validation_status: t.validation_status,
      is_scanned: t.is_scanned,
      created_at: t.created_at,
    })),
    transferredCount,
    isRecipientView,
  });
}
