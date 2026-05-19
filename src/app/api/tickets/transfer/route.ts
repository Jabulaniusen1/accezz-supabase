import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/utils/processOrder';

export async function POST(req: NextRequest) {
  try {
    // Auth — require Bearer token
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
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

    const { ticketId, recipientEmail } = await req.json() as { ticketId?: string; recipientEmail?: string };
    if (!ticketId || !recipientEmail) {
      return NextResponse.json({ error: 'ticketId and recipientEmail are required' }, { status: 400 });
    }

    const normalizedEmail = recipientEmail.toLowerCase().trim();
    if (normalizedEmail === user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'You cannot transfer a ticket to yourself' }, { status: 400 });
    }

    // Fetch the ticket
    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from('tickets')
      .select('id, owner_user_id, attendee_email, attendee_name, validation_status, is_scanned, order_id')
      .eq('id', ticketId)
      .single();

    if (ticketErr || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Verify ownership — either via owner_user_id or original order
    let isOwner = ticket.owner_user_id === user.id;
    if (!isOwner) {
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('buyer_user_id')
        .eq('id', ticket.order_id)
        .single();
      isOwner = order?.buyer_user_id === user.id;
    }

    if (!isOwner) {
      return NextResponse.json({ error: 'You do not own this ticket' }, { status: 403 });
    }

    // Ticket must be valid and not yet used
    if (ticket.validation_status !== 'valid') {
      return NextResponse.json({ error: 'Only valid tickets can be transferred' }, { status: 400 });
    }
    if (ticket.is_scanned) {
      return NextResponse.json({ error: 'This ticket has already been used and cannot be transferred' }, { status: 400 });
    }

    // Look up recipient via the RPC function (queries auth.users securely)
    const { data: recipientRows, error: lookupErr } = await supabaseAdmin
      .rpc('get_user_info_by_email', { p_email: normalizedEmail });

    if (lookupErr) {
      return NextResponse.json({ error: 'Failed to look up recipient' }, { status: 500 });
    }

    const recipient = Array.isArray(recipientRows) ? recipientRows[0] : recipientRows;
    if (!recipient) {
      return NextResponse.json({ error: 'No Accezz account found with that email address' }, { status: 404 });
    }

    const recipientName = (recipient.full_name as string | null) || normalizedEmail.split('@')[0];

    // Transfer: update ticket ownership and attendee details
    const { error: updateErr } = await supabaseAdmin
      .from('tickets')
      .update({
        owner_user_id: recipient.user_id,
        attendee_name: recipientName,
        attendee_email: normalizedEmail,
      })
      .eq('id', ticketId);

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to transfer ticket' }, { status: 500 });
    }

    // Record transfer history
    await supabaseAdmin.from('ticket_transfers').insert({
      ticket_id: ticketId,
      from_user_id: user.id,
      to_user_id: recipient.user_id,
      from_email: user.email!,
      to_email: normalizedEmail,
    });

    return NextResponse.json({ ok: true, recipientName });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
