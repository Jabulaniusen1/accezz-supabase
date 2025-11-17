import { inngest } from '@/utils/inngest';
import { supabase } from '@/utils/supabaseClient';

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

