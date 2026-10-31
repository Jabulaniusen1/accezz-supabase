import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/processOrder';
import { requireAuth } from '@/utils/apiAuth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const { eventId, enabled, commissionType, commissionValue } = await req.json();
    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    const type = commissionType ?? 'percentage';
    const value = commissionValue === undefined || commissionValue === null || commissionValue === ''
      ? 10
      : Number(commissionValue);
    if (type !== 'percentage' && type !== 'fixed') {
      return NextResponse.json({ error: 'Commission type must be percentage or fixed' }, { status: 400 });
    }
    if (!Number.isFinite(value) || value < 0 || (type === 'percentage' && value > 100)) {
      return NextResponse.json(
        { error: type === 'percentage' ? 'Commission must be between 0 and 100%' : 'Commission must be 0 or more' },
        { status: 400 }
      );
    }

    // Verify the user owns this event
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, user_id')
      .eq('id', eventId)
      .single();

    if (!event || event.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this event' }, { status: 403 });
    }

    // Upsert affiliate settings
    const { error: upsertErr } = await supabaseAdmin
      .from('affiliate_settings')
      .upsert({
        event_id: eventId,
        enabled: Boolean(enabled),
        commission_type: type,
        commission_value: value,
      }, { onConflict: 'event_id' });

    if (upsertErr) {
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[affiliates/update-settings] Unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
