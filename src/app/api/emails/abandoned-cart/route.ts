import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, generateAbandonedCartEmailHTML } from '@/utils/emailUtils';
import { supabase } from '@/utils/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      fullName,
      eventTitle,
      eventDate,
      eventTime,
      venue,
      ticketType,
      quantity,
      totalAmount,
      currency,
      orderId,
      eventSlug,
    } = body;

    if (!email || !fullName || !eventTitle || !orderId || !eventSlug) {
      return NextResponse.json(
        { error: 'Missing required fields: email, fullName, eventTitle, orderId, eventSlug' },
        { status: 400 }
      );
    }

    const html = generateAbandonedCartEmailHTML({
      fullName,
      eventTitle,
      eventDate: eventDate || 'TBD',
      eventTime: eventTime || 'TBD',
      venue: venue || 'TBD',
      ticketType: ticketType || 'General',
      quantity: quantity || 1,
      totalAmount: totalAmount || 0,
      currency: currency || 'NGN',
      orderId,
      eventSlug,
    });

    await sendEmail({
      to: email,
      subject: `Complete Your Purchase - ${eventTitle}`,
      html,
    });

    return NextResponse.json(
      { message: 'Abandoned cart email sent successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error sending abandoned cart email:', error);
    const message = error instanceof Error ? error.message : 'Failed to send abandoned cart email';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

