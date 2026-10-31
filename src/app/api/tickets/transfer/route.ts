import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, resendTicketEmails } from '@/utils/processOrder';
import { requireAuth } from '@/utils/apiAuth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const { ticketId, recipientEmail } = await req.json().catch(() => ({})) as { ticketId?: string; recipientEmail?: string };
    if (!ticketId || !recipientEmail) {
      return NextResponse.json({ error: 'ticketId and recipientEmail are required' }, { status: 400 });
    }

    const normalizedEmail = recipientEmail.toLowerCase().trim();
    if (!EMAIL_RE.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }
    if (normalizedEmail === user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'You cannot transfer a ticket to yourself' }, { status: 400 });
    }

    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('id, owner_user_id, validation_status, is_scanned, order_id, orders ( buyer_user_id )')
      .eq('id', ticketId)
      .maybeSingle();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // The current holder is owner_user_id; the original buyer only counts
    // while the ticket has never been assigned to anyone.
    const buyerUserId = (ticket.orders as unknown as { buyer_user_id: string | null } | null)?.buyer_user_id ?? null;
    const currentOwner = ticket.owner_user_id ?? buyerUserId;
    if (currentOwner !== user.id) {
      return NextResponse.json({ error: 'You do not own this ticket' }, { status: 403 });
    }

    if (ticket.validation_status !== 'valid') {
      return NextResponse.json({ error: 'Only valid tickets can be transferred' }, { status: 400 });
    }
    if (ticket.is_scanned) {
      return NextResponse.json({ error: 'This ticket has already been used and cannot be transferred' }, { status: 400 });
    }

    const { data: recipientRows, error: lookupErr } = await supabaseAdmin
      .rpc('get_user_info_by_email', { p_email: normalizedEmail });
    if (lookupErr) {
      console.error('[tickets/transfer] Recipient lookup failed:', lookupErr);
      return NextResponse.json({ error: 'Failed to look up recipient' }, { status: 500 });
    }

    const recipient = Array.isArray(recipientRows) ? recipientRows[0] : recipientRows;
    if (!recipient) {
      return NextResponse.json({ error: 'No Accezz account found with that email address' }, { status: 404 });
    }
    const recipientName = (recipient.full_name as string | null) || normalizedEmail.split('@')[0];

    // New code: the previous holder's QR stops working
    const { data: newCode, error: codeErr } = await supabaseAdmin.rpc('generate_short_ticket_code');
    if (codeErr || !newCode) {
      console.error('[tickets/transfer] Could not generate ticket code:', codeErr);
      return NextResponse.json({ error: 'Failed to transfer ticket' }, { status: 500 });
    }

    // Conditional update: fails if the ticket changed hands, was scanned or
    // revoked since we read it
    let update = supabaseAdmin
      .from('tickets')
      .update({
        owner_user_id: recipient.user_id,
        attendee_name: recipientName,
        attendee_email: normalizedEmail,
        ticket_code: newCode as string,
        qr_code_url: '',
      })
      .eq('id', ticketId)
      .eq('is_scanned', false)
      .eq('validation_status', 'valid');
    update = ticket.owner_user_id ? update.eq('owner_user_id', user.id) : update.is('owner_user_id', null);

    const { data: updated, error: updateErr } = await update.select('id');
    if (updateErr) {
      console.error('[tickets/transfer] Update failed:', updateErr);
      return NextResponse.json({ error: 'Failed to transfer ticket' }, { status: 500 });
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'This ticket changed while you were transferring it. Please refresh and try again.' }, { status: 409 });
    }

    const { error: historyErr } = await supabaseAdmin.from('ticket_transfers').insert({
      ticket_id: ticketId,
      from_user_id: user.id,
      to_user_id: recipient.user_id,
      from_email: user.email || '',
      to_email: normalizedEmail,
    });
    if (historyErr) {
      console.error('[tickets/transfer] Failed to record transfer history:', historyErr);
    }

    // New QR + email to the recipient
    try {
      await resendTicketEmails(ticket.order_id, [ticketId]);
    } catch (emailErr) {
      console.error('[tickets/transfer] Failed to email recipient:', emailErr);
    }

    return NextResponse.json({ ok: true, recipientName });
  } catch (err) {
    console.error('[tickets/transfer] Unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
