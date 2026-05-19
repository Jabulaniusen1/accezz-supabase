import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/processOrder';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    // Auth
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, enabled, commissionType, commissionValue } = await req.json();
    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
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
        commission_type: commissionType || 'percentage',
        commission_value: Number(commissionValue) || 10,
      }, { onConflict: 'event_id' });

    if (upsertErr) {
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
