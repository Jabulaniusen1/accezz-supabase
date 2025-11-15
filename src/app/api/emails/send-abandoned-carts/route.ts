import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

/**
 * API route to check for incomplete orders and send abandoned cart emails
 * This should be called periodically (e.g., via cron job or scheduled task)
 * 
 * Query params:
 * - minutes: Number of minutes to wait before considering an order abandoned (default: 5)
 * - limit: Maximum number of emails to send in one run (default: 50)
 * 
 * Security: This endpoint checks for Vercel Cron authorization header
 */
export async function POST(req: NextRequest) {
  try {
    // Security check: Verify this is a Vercel Cron request
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is set, require it in the Authorization header
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else {
      // If no CRON_SECRET is set, check for Vercel's cron header
      const vercelCronHeader = req.headers.get('x-vercel-cron');
      if (!vercelCronHeader) {
        // Allow manual testing but log a warning
        console.warn('Cron endpoint called without proper authorization. Set CRON_SECRET for production.');
      }
    }

    const body = await req.json().catch(() => ({}));
    const minutes = body.minutes || 5;
    const limit = body.limit || 50;
    // Calculate the cutoff time (orders created before this time are considered abandoned)
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - minutes);

    // Find pending orders that:
    // 1. Are older than the cutoff time
    // 2. Haven't had an abandoned cart email sent (check meta field)
    // 3. Have a valid email address
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        event_id,
        buyer_email,
        buyer_full_name,
        total_amount,
        currency,
        meta,
        created_at,
        events (
          id,
          title,
          slug,
          start_time,
          end_time,
          venue,
          location,
          address,
          city,
          country,
          is_virtual,
          virtual_details
        )
      `)
      .eq('status', 'pending')
      .lt('created_at', cutoffTime.toISOString())
      .not('buyer_email', 'is', null)
      .limit(limit);

    if (ordersError) {
      console.error('Error fetching incomplete orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch incomplete orders', details: ordersError.message },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { message: 'No abandoned carts found', sent: 0 },
        { status: 200 }
      );
    }

    const results = {
      checked: orders.length,
      sent: 0,
      skipped: 0,
      errors: [] as Array<{ orderId: string; error: string }>,
    };

    // Process each order
    for (const order of orders) {
      try {
        // Check if email was already sent
        const meta = (order.meta as Record<string, unknown> | null) || {};
        if (meta.abandonedCartEmailSent === true) {
          results.skipped++;
          continue;
        }

        // Handle Supabase nested query response (could be array or object)
        const eventsData = order.events as
          | {
              title?: string;
              slug?: string;
              start_time?: string;
              end_time?: string;
              venue?: string;
              location?: string;
              address?: string;
              city?: string;
              country?: string;
              is_virtual?: boolean;
              virtual_details?: Record<string, unknown>;
            }
          | Array<{
              title?: string;
              slug?: string;
              start_time?: string;
              end_time?: string;
              venue?: string;
              location?: string;
              address?: string;
              city?: string;
              country?: string;
              is_virtual?: boolean;
              virtual_details?: Record<string, unknown>;
            }>
          | null;

        const event = Array.isArray(eventsData) ? eventsData[0] : eventsData;

        if (!event || !event.slug) {
          results.errors.push({
            orderId: order.id,
            error: 'Event not found or missing slug',
          });
          continue;
        }

        // Format event date and time
        const startDate = event.start_time ? new Date(event.start_time) : null;
        const endDate = event.end_time ? new Date(event.end_time) : null;

        const eventDate = startDate
          ? startDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'TBD';

        const formatTime = (date: Date | null) =>
          date
            ? date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })
            : null;

        const startTimeFormatted = formatTime(startDate);
        const endTimeFormatted = formatTime(endDate);

        const eventTime =
          startTimeFormatted && endTimeFormatted
            ? `${startTimeFormatted} - ${endTimeFormatted}`
            : startTimeFormatted || endTimeFormatted || 'TBD';

        // Build venue string
        const physicalVenueParts = [
          event.venue,
          event.location,
          event.address,
          event.city,
          event.country,
        ].filter((part) => typeof part === 'string' && part.trim().length > 0);

        const isVirtualEvent = Boolean(event.is_virtual);
        const venue = isVirtualEvent
          ? 'Online Event'
          : physicalVenueParts.join(', ') || 'TBD';

        // Get ticket type from meta
        const ticketTypeName = (meta.ticketTypeName as string) || 'General';
        const quantity = (meta.quantity as number) || 1;

        // Send email via API route
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/emails/abandoned-cart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: order.buyer_email,
            fullName: order.buyer_full_name || 'Valued Customer',
            eventTitle: event.title || 'Event',
            eventDate,
            eventTime,
            venue,
            ticketType: ticketTypeName,
            quantity,
            totalAmount: order.total_amount,
            currency: order.currency || 'NGN',
            orderId: order.id,
            eventSlug: event.slug,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to send email');
        }

        // Mark email as sent in order meta
        const updatedMeta = {
          ...meta,
          abandonedCartEmailSent: true,
          abandonedCartEmailSentAt: new Date().toISOString(),
        };

        await supabase
          .from('orders')
          .update({ meta: updatedMeta })
          .eq('id', order.id);

        results.sent++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing order ${order.id}:`, error);
        results.errors.push({
          orderId: order.id,
          error: errorMessage,
        });
      }
    }

    return NextResponse.json(
      {
        message: 'Abandoned cart email processing completed',
        ...results,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error processing abandoned carts:', error);
    const message = error instanceof Error ? error.message : 'Failed to process abandoned carts';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Also support GET for easy cron job calls
export async function GET(req: NextRequest) {
  // Security check: Verify this is a Vercel Cron request
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // If CRON_SECRET is set, require it in the Authorization header
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  } else {
    // If no CRON_SECRET is set, check for Vercel's cron header
    const vercelCronHeader = req.headers.get('x-vercel-cron');
    if (!vercelCronHeader) {
      // Allow manual testing but log a warning
      console.warn('Cron endpoint called without proper authorization. Set CRON_SECRET for production.');
    }
  }

  const searchParams = req.nextUrl.searchParams;
  const minutes = parseInt(searchParams.get('minutes') || '5', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  // Create a POST request body and call the POST handler logic
  const request = new NextRequest(req.url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'authorization': authHeader || '',
    },
    body: JSON.stringify({ minutes, limit }),
  });

  return POST(request);
}

