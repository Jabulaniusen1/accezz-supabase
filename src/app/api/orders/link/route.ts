import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/processOrder';
import { requireAuth } from '@/utils/apiAuth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Attach a guest order (and its tickets) to the signed-in account.
 * Only works when the account email matches the email used at checkout.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { user } = auth;

  const body = await req.json().catch(() => null) as { orderId?: string } | null;
  const orderId = body?.orderId || '';
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ error: 'Invalid order' }, { status: 400 });
  }

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, buyer_user_id, buyer_email')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (order.buyer_user_id) {
    return NextResponse.json({ linked: order.buyer_user_id === user.id });
  }
  if (!user.email || order.buyer_email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'This order was placed with a different email address' },
      { status: 403 }
    );
  }

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ buyer_user_id: user.id })
    .eq('id', orderId)
    .is('buyer_user_id', null);
  if (error) {
    console.error('[orders/link] Failed to link order:', error);
    return NextResponse.json({ error: 'Could not link order' }, { status: 500 });
  }

  await supabaseAdmin
    .from('tickets')
    .update({ owner_user_id: user.id })
    .eq('order_id', orderId)
    .is('owner_user_id', null);

  return NextResponse.json({ linked: true });
}
