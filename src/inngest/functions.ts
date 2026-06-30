import { inngest } from '@/utils/inngest';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, generateEventReminderEmailHTML, generateEventEndedReportEmailHTML } from '@/utils/emailUtils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Inngest function to send abandoned cart email 20 seconds after order creation
 */
export const sendAbandonedCartEmail = inngest.createFunction(
  {
    id: 'send-abandoned-cart-email',
    name: 'Send Abandoned Cart Email',
  },
  { event: 'order/created' },
  async ({ event, step }) => {
    const { orderId } = event.data;

    // Wait 20 seconds before checking if order is still pending
    await step.sleep('wait-20-seconds', '20s');

    // Check if order is still pending (not paid)
    const orderStatus = await step.run('check-order-status', async () => {
      const { data: order, error } = await supabaseAdmin
        .from('orders')
        .select('id, status, buyer_email, buyer_full_name, total_amount, currency, meta, event_id, events(id, title, slug, start_time, end_time, venue, location, address, city, country, is_virtual, virtual_details)')
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Error fetching order:', error);
        throw error;
      }

      return order;
    });

    // If order is already paid, cancelled, or failed, don't send email
    if (!orderStatus || orderStatus.status !== 'pending') {
      return { skipped: true, reason: 'order_not_pending' };
    }

    // Check if email was already sent
    const meta = (orderStatus.meta as Record<string, unknown> | null) || {};
    if (meta.abandonedCartEmailSent === true) {
      return { skipped: true, reason: 'email_already_sent' };
    }

    // Get event details
    const eventsData = orderStatus.events as
      | {
          id?: string;
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
          id?: string;
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

    const eventData = Array.isArray(eventsData) ? eventsData[0] : eventsData;

    if (!eventData || !eventData.slug) {
      console.error(`Event not found or missing slug for order ${orderId}`);
      return { error: 'event_not_found' };
    }

    // Check if event has already passed - don't send email for past events
    const eventEndTime = eventData.end_time ? new Date(eventData.end_time) : null;
    const eventStartTime = eventData.start_time ? new Date(eventData.start_time) : null;
    const eventDateTime = eventEndTime || eventStartTime;
    
    if (eventDateTime && eventDateTime < new Date()) {
      return { skipped: true, reason: 'event_passed' };
    }

    // Format event date and time
    const startDate = eventData.start_time ? new Date(eventData.start_time) : null;
    const endDate = eventData.end_time ? new Date(eventData.end_time) : null;

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
      eventData.venue,
      eventData.location,
      eventData.address,
      eventData.city,
      eventData.country,
    ].filter((part) => typeof part === 'string' && part.trim().length > 0);

    const isVirtualEvent = Boolean(eventData.is_virtual);
    const venue = isVirtualEvent
      ? 'Online Event'
      : physicalVenueParts.join(', ') || 'TBD';

    // Get ticket type from meta
    const ticketTypeName = (meta.ticketTypeName as string) || 'General';
    const quantity = (meta.quantity as number) || 1;

    // Send abandoned cart email
    await step.run('send-abandoned-cart-email', async () => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/emails/abandoned-cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
        },
        body: JSON.stringify({
          email: orderStatus.buyer_email,
          fullName: orderStatus.buyer_full_name || 'Valued Customer',
          eventTitle: eventData.title || 'Event',
          eventDate,
          eventTime,
          venue,
          ticketType: ticketTypeName,
          quantity,
          totalAmount: orderStatus.total_amount,
          currency: orderStatus.currency || 'NGN',
          orderId: orderStatus.id,
          eventSlug: eventData.slug,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send abandoned cart email');
      }

      return await response.json();
    });

    // Mark email as sent in order meta
    await step.run('mark-email-sent', async () => {
      const updatedMeta = {
        ...meta,
        abandonedCartEmailSent: true,
        abandonedCartEmailSentAt: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from('orders')
        .update({ meta: updatedMeta })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order meta:', error);
        throw error;
      }

      return { success: true };
    });

    return {
      success: true,
      orderId,
      emailSent: true,
    };
  }
);

/**
 * Inngest function to send event reminder emails to all ticket holders
 * Triggered when an order is paid (event: 'order/paid')
 * Sends reminders 24h and 2h before the event
 */
export const sendEventReminderEmails = inngest.createFunction(
  {
    id: 'send-event-reminder-emails',
    name: 'Send Event Reminder Emails',
  },
  { event: 'order/paid' },
  async ({ event, step }) => {
    const { orderId } = event.data as { orderId: string };

    // Fetch order and event details
    const orderData = await step.run('fetch-order-and-event', async () => {
      const { data: order, error } = await supabaseAdmin
        .from('orders')
        .select('id, buyer_email, buyer_full_name, event_id, events(id, title, start_time, end_time, venue, location, address, city, country, is_virtual, virtual_details)')
        .eq('id', orderId)
        .single();

      if (error || !order) throw new Error(`Order not found: ${orderId}`);
      return order;
    });

    const eventsData = orderData.events as
      | { title?: string; start_time?: string; end_time?: string; venue?: string; location?: string; address?: string; city?: string; country?: string; is_virtual?: boolean; virtual_details?: Record<string, unknown> }
      | Array<{ title?: string; start_time?: string; end_time?: string; venue?: string; location?: string; address?: string; city?: string; country?: string; is_virtual?: boolean; virtual_details?: Record<string, unknown> }>
      | null;

    const eventData = Array.isArray(eventsData) ? eventsData[0] : eventsData;

    if (!eventData?.start_time) {
      return { skipped: true, reason: 'no_event_start_time' };
    }

    const eventStart = new Date(eventData.start_time);
    const now = new Date();

    // Don't schedule reminders for past events
    if (eventStart <= now) {
      return { skipped: true, reason: 'event_already_started' };
    }

    const msUntilEvent = eventStart.getTime() - now.getTime();
    const hoursUntilEvent = msUntilEvent / (1000 * 60 * 60);

    // Format event details
    const isVirtualEvent = Boolean(eventData.is_virtual);
    const virtualDetails = (eventData.virtual_details as Record<string, unknown> | null) || null;
    const rawMeetingUrl = typeof virtualDetails?.meetingUrl === 'string' ? virtualDetails.meetingUrl.trim() : '';
    const rawMeetingId = typeof virtualDetails?.meetingId === 'string' ? virtualDetails.meetingId.trim() : '';
    const virtualPlatform = typeof virtualDetails?.platform === 'string' ? virtualDetails.platform : undefined;
    let virtualAccessLink: string | undefined;
    if (rawMeetingUrl) {
      virtualAccessLink = rawMeetingUrl;
    } else if (virtualPlatform === 'zoom' && rawMeetingId) {
      virtualAccessLink = `https://zoom.us/j/${rawMeetingId}`;
    }

    const physicalVenueParts = [eventData.venue, eventData.location, eventData.address, eventData.city, eventData.country]
      .filter((p) => typeof p === 'string' && (p as string).trim().length > 0);
    const formatPlatform = (v?: string) => {
      if (!v) return 'Online Event';
      return v.split(/[-_]/g).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    };
    const venue = isVirtualEvent
      ? `${formatPlatform(virtualPlatform)} (Online)`
      : physicalVenueParts.join(', ') || 'TBD';

    const eventDate = eventStart.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const endDate = eventData.end_time ? new Date(eventData.end_time) : null;
    const formatTime = (d: Date | null) => d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
    const startFmt = formatTime(eventStart);
    const endFmt = formatTime(endDate);
    const eventTime = startFmt && endFmt ? `${startFmt} - ${endFmt}` : startFmt || 'TBD';

    // Schedule 24h reminder if event is more than 24h away
    if (hoursUntilEvent > 25) {
      const waitUntil24h = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000);
      const waitMs24h = waitUntil24h.getTime() - Date.now();
      if (waitMs24h > 0) {
        await step.sleep('wait-until-24h-before', `${Math.round(waitMs24h / 1000)}s`);
        await step.run('send-24h-reminders', async () => {
          await sendRemindersForOrder(orderId, orderData.event_id, eventData.title || 'Event', eventDate, eventTime, venue, isVirtualEvent, virtualAccessLink, virtualPlatform, 24);
        });
      }
    }

    // Schedule 2h reminder if event is more than 2h away
    if (hoursUntilEvent > 2.5) {
      const waitUntil2h = new Date(eventStart.getTime() - 2 * 60 * 60 * 1000);
      const waitMs2h = waitUntil2h.getTime() - Date.now();
      if (waitMs2h > 0) {
        await step.sleep('wait-until-2h-before', `${Math.round(waitMs2h / 1000)}s`);
        await step.run('send-2h-reminders', async () => {
          await sendRemindersForOrder(orderId, orderData.event_id, eventData.title || 'Event', eventDate, eventTime, venue, isVirtualEvent, virtualAccessLink, virtualPlatform, 2);
        });
      }
    }

    return { success: true, orderId };
  }
);

async function sendRemindersForOrder(
  orderId: string,
  eventId: string,
  eventTitle: string,
  eventDate: string,
  eventTime: string,
  venue: string,
  isVirtual: boolean,
  virtualAccessLink: string | undefined,
  virtualPlatform: string | undefined,
  hoursUntilEvent: number
) {
  const { data: tickets } = await supabaseAdmin
    .from('tickets')
    .select('id, ticket_code, attendee_name, attendee_email')
    .eq('order_id', orderId);

  if (!tickets || tickets.length === 0) return;

  for (const ticket of tickets) {
    try {
      const html = generateEventReminderEmailHTML({
        fullName: ticket.attendee_name || 'Attendee',
        eventTitle,
        eventDate,
        eventTime,
        venue,
        ticketCode: ticket.ticket_code,
        isVirtual,
        virtualAccessLink,
        virtualPlatform,
        hoursUntilEvent,
      });

      await sendEmail({
        to: ticket.attendee_email,
        subject: `Reminder: ${eventTitle} is ${hoursUntilEvent <= 2 ? 'in 2 hours' : 'tomorrow'}!`,
        html,
      });

    } catch (err) {
      console.error(`[reminder] Failed to send reminder to ${ticket.attendee_email}:`, err);
    }
  }
}

/**
 * Inngest cron function — scans for events that have just ended and sends the
 * organizer a recap report (revenue, tickets sold, check-ins, etc).
 * Runs every 20 minutes; relies on events.organizer_report_sent_at to avoid
 * sending duplicates.
 */
export const sendEventEndedReports = inngest.createFunction(
  {
    id: 'send-event-ended-reports',
    name: 'Send Event Ended Reports',
  },
  { cron: '*/20 * * * *' },
  async ({ step }) => {
    const endedEvents = await step.run('find-recently-ended-events', async () => {
      const { data, error } = await supabaseAdmin
        .from('events')
        .select('id, user_id, title, slug, end_time, currency')
        .eq('status', 'published')
        .is('organizer_report_sent_at', null)
        .not('end_time', 'is', null)
        .lte('end_time', new Date().toISOString());

      if (error) {
        console.error('Error finding ended events:', error);
        throw error;
      }

      return data || [];
    });

    if (endedEvents.length === 0) {
      return { skipped: true, reason: 'no_ended_events' };
    }

    const results = [];
    for (const ev of endedEvents) {
      const result = await step.run(`send-report-${ev.id}`, async () => {
        try {
          await sendOrganizerReport(ev);
          await supabaseAdmin
            .from('events')
            .update({ organizer_report_sent_at: new Date().toISOString() })
            .eq('id', ev.id);
          return { eventId: ev.id, sent: true };
        } catch (err) {
          console.error(`[event-report] Failed for event ${ev.id}:`, err);
          return { eventId: ev.id, sent: false, error: err instanceof Error ? err.message : String(err) };
        }
      });
      results.push(result);
    }

    return { success: true, processed: results.length, results };
  }
);

async function sendOrganizerReport(ev: {
  id: string;
  user_id: string;
  title: string;
  slug: string | null;
  end_time: string;
  currency: string | null;
}) {
  const currency = ev.currency || 'NGN';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accezzlive.com';

  const [{ data: profile }, { data: { user: organizer } = { user: null } }, { data: ticketTypes }, { data: tickets }, { count: pageViews }] =
    await Promise.all([
      supabaseAdmin.from('profiles').select('full_name').eq('user_id', ev.user_id).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(ev.user_id),
      supabaseAdmin.from('ticket_types').select('id, name, quantity, sold').eq('event_id', ev.id),
      supabaseAdmin.from('tickets').select('ticket_type_id, price, is_scanned, validation_status, gender').eq('event_id', ev.id),
      supabaseAdmin.from('event_views').select('id', { count: 'exact', head: true }).eq('event_id', ev.id),
    ]);

  const organizerEmail = organizer?.email;
  if (!organizerEmail) {
    throw new Error(`No email found for organizer ${ev.user_id}`);
  }

  const validTickets = (tickets || []).filter((t) => t.validation_status === 'valid');
  const ticketsSold = validTickets.length;
  const totalRevenue = validTickets.reduce((sum, t) => sum + Number(t.price || 0), 0);
  const checkedIn = validTickets.filter((t) => t.is_scanned).length;
  const totalCapacity = (ticketTypes || []).reduce((sum, t) => sum + Number(t.quantity || 0), 0);

  const typeMap = new Map((ticketTypes || []).map((t) => [t.id, t]));
  const breakdownMap = new Map<string, { name: string; sold: number; quantity: number; revenue: number }>();
  for (const t of validTickets) {
    const type = typeMap.get(t.ticket_type_id);
    const name = type?.name || 'General';
    const entry = breakdownMap.get(name) || { name, sold: 0, quantity: Number(type?.quantity || 0), revenue: 0 };
    entry.sold += 1;
    entry.revenue += Number(t.price || 0);
    breakdownMap.set(name, entry);
  }

  const genderLabels: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
    'prefer-not-to-say': 'Prefer not to say',
  };
  const genderCounts = new Map<string, number>();
  for (const t of validTickets) {
    if (!t.gender) continue;
    const label = genderLabels[t.gender] || t.gender;
    genderCounts.set(label, (genderCounts.get(label) || 0) + 1);
  }

  const { data: topAffiliateRow } = await supabaseAdmin
    .from('affiliates')
    .select('user_id, conversions, total_earned')
    .eq('event_id', ev.id)
    .gt('conversions', 0)
    .order('conversions', { ascending: false })
    .limit(1)
    .maybeSingle();

  let topAffiliate: { name: string; conversions: number; earned: number } | null = null;
  if (topAffiliateRow) {
    const { data: affiliateProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', topAffiliateRow.user_id)
      .maybeSingle();
    topAffiliate = {
      name: affiliateProfile?.full_name || 'An affiliate',
      conversions: topAffiliateRow.conversions,
      earned: Number(topAffiliateRow.total_earned || 0),
    };
  }

  const eventDate = new Date(ev.end_time).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = generateEventEndedReportEmailHTML({
    fullName: profile?.full_name || organizer?.user_metadata?.full_name || 'there',
    eventTitle: ev.title,
    eventDate,
    currency,
    totalRevenue,
    ticketsSold,
    totalCapacity,
    checkedIn,
    pageViews: pageViews || 0,
    noShows: Math.max(0, ticketsSold - checkedIn),
    ticketTypeBreakdown: Array.from(breakdownMap.values()),
    genderBreakdown: Array.from(genderCounts.entries()).map(([label, count]) => ({ label, count })),
    topAffiliate,
    analyticsUrl: `${baseUrl}/analytics?id=${ev.id}`,
    createEventUrl: `${baseUrl}/create-event`,
  });

  await sendEmail({
    to: organizerEmail,
    subject: `Your event recap — ${ev.title}`,
    html,
  });
}

