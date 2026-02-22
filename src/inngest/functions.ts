import { inngest } from '@/utils/inngest';
import { supabase } from '@/utils/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, generateEventReminderEmailHTML } from '@/utils/emailUtils';

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
      const { data: order, error } = await supabase
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
      console.log(`Order ${orderId} is no longer pending (status: ${orderStatus?.status}), skipping abandoned cart email`);
      return { skipped: true, reason: 'order_not_pending' };
    }

    // Check if email was already sent
    const meta = (orderStatus.meta as Record<string, unknown> | null) || {};
    if (meta.abandonedCartEmailSent === true) {
      console.log(`Abandoned cart email already sent for order ${orderId}`);
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
      console.log(`Event ${eventData.title || eventData.slug} has already passed, skipping abandoned cart email for order ${orderId}`);
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
        headers: { 'Content-Type': 'application/json' },
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

      const { error } = await supabase
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

      console.log(`[reminder] Sent ${hoursUntilEvent}h reminder to ${ticket.attendee_email} for event ${eventId}`);
    } catch (err) {
      console.error(`[reminder] Failed to send reminder to ${ticket.attendee_email}:`, err);
    }
  }
}

