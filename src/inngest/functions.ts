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

/**
 * Inngest function to generate QR codes and send ticket email after payment success
 * This runs asynchronously to avoid blocking the payment webhook
 */
export const generateTicketEmailAndQR = inngest.createFunction(
  {
    id: 'generate-ticket-email-and-qr',
    name: 'Generate Ticket Email and QR Codes',
  },
  { event: 'payment/success' },
  async ({ event, step }) => {
    const { orderId, paymentReference, paymentProvider } = event.data;

    // Fetch order and tickets
    const orderData = await step.run('fetch-order-and-tickets', async () => {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, event_id, buyer_email, buyer_full_name, total_amount, currency, meta, status')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('[generateTicketEmailAndQR] Error fetching order:', orderError);
        throw orderError;
      }

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      if (order.status !== 'paid') {
        throw new Error(`Order ${orderId} is not paid (status: ${order.status})`);
      }

      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, ticket_code, qr_code_url, attendee_name, attendee_email')
        .eq('order_id', orderId);

      if (ticketsError) {
        console.error('[generateTicketEmailAndQR] Error fetching tickets:', ticketsError);
        throw ticketsError;
      }

      return { order, tickets: tickets || [] };
    });

    // Generate QR codes for tickets that don't have them
    const ticketsWithQR = await step.run('generate-qr-codes', async () => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const ticketsNeedingQR = orderData.tickets.filter(t => !t.qr_code_url || t.qr_code_url === '');

      if (ticketsNeedingQR.length === 0) {
        console.log('[generateTicketEmailAndQR] All tickets already have QR codes');
        return orderData.tickets;
      }

      // Generate QR codes via API (or directly if we have access to the function)
      // For now, we'll call an API route that handles QR generation
      const qrPromises = ticketsNeedingQR.map(async (ticket) => {
        try {
          const response = await fetch(`${baseUrl}/api/tickets/generate-qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ticketId: ticket.id,
              ticketCode: ticket.ticket_code,
            }),
          });

          if (!response.ok) {
            console.error(`[generateTicketEmailAndQR] Failed to generate QR for ticket ${ticket.id}`);
            return ticket; // Return original ticket if QR generation fails
          }

          const { qrCodeUrl } = await response.json();
          return { ...ticket, qr_code_url: qrCodeUrl };
        } catch (error) {
          console.error(`[generateTicketEmailAndQR] Error generating QR for ticket ${ticket.id}:`, error);
          return ticket; // Return original ticket if QR generation fails
        }
      });

      const updatedTickets = await Promise.all(qrPromises);
      
      // Merge with tickets that already have QR codes
      const existingTickets = orderData.tickets.filter(t => t.qr_code_url && t.qr_code_url !== '');
      return [...existingTickets, ...updatedTickets];
    });

    // Send ticket email
    await step.run('send-ticket-email', async () => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      
      // Fetch event details for email
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('title, start_time, end_time, venue, location, address, city, country, is_virtual, virtual_details')
        .eq('id', orderData.order.event_id)
        .single();

      if (eventError) {
        console.error('[generateTicketEmailAndQR] Error fetching event:', eventError);
        throw eventError;
      }

      const meta = (orderData.order.meta as Record<string, unknown> | null) || {};
      const ticketTypeName = (meta.ticketTypeName as string) || 'General';
      const ticketCodes = ticketsWithQR.map(t => t.ticket_code);
      const primaryTicket = ticketsWithQR.find(t => t.attendee_email === orderData.order.buyer_email) || ticketsWithQR[0];

      // Format event details
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

      const isVirtualEvent = Boolean(event.is_virtual);
      const virtualDetails = (event.virtual_details as Record<string, unknown> | null) || {};
      const rawMeetingUrl = typeof virtualDetails?.meetingUrl === 'string' ? virtualDetails.meetingUrl.trim() : '';
      const rawMeetingId = typeof virtualDetails?.meetingId === 'string' ? virtualDetails.meetingId.trim() : '';
      const virtualPlatform = typeof virtualDetails?.platform === 'string' ? virtualDetails.platform : undefined;

      let virtualAccessLink: string | undefined;
      if (rawMeetingUrl) {
        virtualAccessLink = rawMeetingUrl;
      } else if (virtualPlatform === 'zoom' && rawMeetingId) {
        virtualAccessLink = `https://zoom.us/j/${rawMeetingId}`;
      }

      const physicalVenueParts = [
        event.venue,
        event.location,
        event.address,
        event.city,
        event.country,
      ].filter((part) => typeof part === 'string' && part.trim().length > 0);

      const venue = isVirtualEvent
        ? 'Online Event'
        : physicalVenueParts.join(', ') || 'TBD';

      const response = await fetch(`${baseUrl}/api/emails/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: orderData.order.buyer_email,
          fullName: orderData.order.buyer_full_name,
          eventTitle: event.title || 'Event',
          eventDate,
          eventTime,
          venue,
          ticketType: ticketTypeName,
          quantity: ticketCodes.length,
          ticketCodes,
          totalAmount: orderData.order.total_amount,
          currency: orderData.order.currency,
          orderId,
          qrCodeUrl: primaryTicket?.qr_code_url,
          ticketId: primaryTicket?.id,
          primaryTicketCode: primaryTicket?.ticket_code || ticketCodes[0],
          isVirtual: isVirtualEvent,
          virtualAccessLink,
          virtualPlatform,
          virtualMeetingId: rawMeetingId || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send ticket email');
      }

      return await response.json();
    });

    return {
      success: true,
      orderId,
      ticketsProcessed: ticketsWithQR.length,
      emailSent: true,
    };
  }
);

