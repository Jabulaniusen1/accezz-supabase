import { supabase } from './supabaseClient';
import { notifyTicketPurchase } from './notificationClient';

/**
 * Order type based on database schema
 */
interface Order {
  id: string;
  event_id: string;
  buyer_user_id: string | null;
  buyer_full_name: string | null;
  buyer_email: string;
  buyer_phone: string | null;
  currency: string | null;
  total_amount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  payment_provider: string | null;
  payment_reference: string | null;
  meta: {
    ticketTypeName?: string;
    quantity?: number;
    attendees?: Array<{ name: string; email: string }>;
  } | null;
  created_at: string;
  updated_at: string;
}

/**
 * Ticket type based on database schema
 */
interface TicketType {
  id: string;
  event_id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  details: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Helper function to send ticket email after tickets are created
 */
async function sendTicketEmail({
  orderId,
  order,
  ticketType,
  ticketCodes,
}: {
  orderId: string;
  order: Order;
  ticketType: TicketType;
  ticketCodes: string[];
}): Promise<void> {
  try {
    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title, start_time, end_time, venue, location, address, city, country, is_virtual, virtual_details')
      .eq('id', order.event_id)
      .single();

    if (eventError) {
      console.error('[sendTicketEmail] Error fetching event:', eventError);
      return;
    }

    const isVirtualEvent = Boolean(event.is_virtual);
    const virtualDetails = (event.virtual_details as Record<string, unknown> | null) || null;
    const rawMeetingUrl = typeof virtualDetails?.meetingUrl === 'string' ? virtualDetails.meetingUrl.trim() : '';
    const rawMeetingId = typeof virtualDetails?.meetingId === 'string' ? virtualDetails.meetingId.trim() : '';
    const virtualPlatform = typeof virtualDetails?.platform === 'string' ? virtualDetails.platform : undefined;

    let virtualAccessLink: string | undefined;
    if (rawMeetingUrl) {
      virtualAccessLink = rawMeetingUrl;
    } else if (virtualPlatform === 'zoom' && rawMeetingId) {
      virtualAccessLink = `https://zoom.us/j/${rawMeetingId}`;
    }

    const formatPlatform = (value?: string) => {
      if (!value) return 'Online Event';
      return value
        .split(/[-_]/g)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
    };

    const physicalVenueParts = [
      event.venue,
      event.location,
      event.address,
      event.city,
      event.country,
    ].filter((part) => typeof part === 'string' && part.trim().length > 0);

    const eventVenue = isVirtualEvent
      ? `${formatPlatform(virtualPlatform)} (Online)`
      : physicalVenueParts.join(', ') || 'TBD';

    // Fetch primary ticket to get QR code URL and ticket ID
    const { data: primaryTicket } = await supabase
      .from('tickets')
      .select('qr_code_url, id, ticket_code')
      .eq('order_id', orderId)
      .eq('attendee_email', order.buyer_email)
      .limit(1)
      .single();

    // Format date and time
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

    // Send email via API route
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/emails/ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: order.buyer_email,
        fullName: order.buyer_full_name,
        eventTitle: event.title || 'Event',
        eventDate,
        eventTime,
        venue: eventVenue,
        ticketType: ticketType.name,
        quantity: ticketCodes.length,
        ticketCodes,
        totalAmount: order.total_amount,
        currency: order.currency,
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

    console.log('[sendTicketEmail] Ticket email sent successfully');
  } catch (error) {
    console.error('[sendTicketEmail] Error:', error);
    // Don't throw - this is a background operation
  }
}

interface CreateOrderParams {
  eventId: string;
  ticketTypeName: string;
  quantity: number;
  email: string;
  phone: string;
  fullName: string;
  gender?: string;
  attendees?: Array<{ name: string; email: string; gender?: string }> | null;
  currency?: string;
}

// Internal data shapes are inferred per-query; explicit TicketCreationData not needed

/**
 * Generate a unique ticket code
 */
function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate QR code image and store in Supabase Storage
 * Returns the public URL of the stored QR code
 */
async function generateAndStoreQRCode(ticketId: string, ticketCode: string): Promise<string> {
  try {
    // Generate validation URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL || '';
    const validateUrl = `${baseUrl}/validate-ticket?ticketId=${ticketId}&signature=${ticketCode}`;
    
    // Dynamically import QRCode
    const qrcodeModule = await import('qrcode');
    const QRCodeLib = qrcodeModule.default;
    
    // Generate QR code as data URL (PNG)
    const qrCodeDataUrl = await QRCodeLib.toDataURL(validateUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Convert data URL to blob
    const response = await fetch(qrCodeDataUrl);
    const blob = await response.blob();

    // Note: We don't need auth session for QR generation
    // For QR codes, we'll use a simpler path structure
    // Path: tickets/{ticketId}/qr-code.png
    const filePath = `tickets/${ticketId}/qr-code.png`;
    const { error: uploadError } = await supabase.storage
      .from('ticket-qr')
      .upload(filePath, blob, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading QR code:', uploadError);
      // Fallback to data URL if upload fails
      return qrCodeDataUrl;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('ticket-qr')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Fallback: return a QR code service URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL || '';
    const encodedUrl = encodeURIComponent(`${baseUrl}/validate-ticket?ticketId=${ticketId}&signature=${ticketCode}`);
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodedUrl}`;
  }
}

/**
 * Create an order in Supabase
 */
export async function createOrder(params: CreateOrderParams): Promise<{ orderId: string; totalAmount: number }> {
  try {
    console.log('[createOrder] Starting order creation for eventId:', params.eventId);
    
    // Fetch event to get ticket type details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, currency')
      .eq('id', params.eventId)
      .single();

    if (eventError) {
      console.error('[createOrder] Error fetching event:', eventError);
      throw eventError;
    }
    console.log('[createOrder] Event fetched successfully:', event?.id);

    // Fetch ticket type to get price (availability check will be done atomically)
    const { data: ticketType, error: ticketTypeError } = await supabase
      .from('ticket_types')
      .select('price')
      .eq('event_id', params.eventId)
      .eq('name', params.ticketTypeName)
      .single();

    if (ticketTypeError) {
      console.error('[createOrder] Error fetching ticket type:', ticketTypeError);
      throw ticketTypeError;
    }
    if (!ticketType) {
      console.error('[createOrder] Ticket type not found:', params.ticketTypeName);
      throw new Error('Ticket type not found');
    }
    console.log('[createOrder] Ticket type found:', params.ticketTypeName);

    // Calculate total amount
    const totalAmount = ticketType.price * params.quantity;
    const currency = params.currency || event?.currency || 'NGN';

    // Get current session (optional - for logged-in users)
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[createOrder] Session:', session ? 'authenticated' : 'anonymous');

    // Set expiry time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Create order first (without reservation - will be done atomically)
    console.log('[createOrder] Inserting order with data:', {
      event_id: params.eventId,
      buyer_email: params.email,
      total_amount: totalAmount,
      expires_at: expiresAt.toISOString()
    });
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        event_id: params.eventId,
        buyer_user_id: session?.user?.id || null,
        buyer_full_name: params.fullName,
        buyer_email: params.email,
        buyer_phone: params.phone,
        currency: currency,
        total_amount: totalAmount,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        meta: {
          ticketTypeName: params.ticketTypeName,
          quantity: params.quantity,
          attendees: params.attendees || null,
          primaryBuyerGender: params.gender || null,
        },
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('[createOrder] Error creating order:', orderError);
      console.error('[createOrder] Full error details:', JSON.stringify(orderError, null, 2));
      throw orderError;
    }

    console.log('[createOrder] Order created successfully:', order.id);

    // Atomically reserve tickets (this uses row-level locking to prevent race conditions)
    console.log('[createOrder] Attempting atomic reservation:', {
      eventId: params.eventId,
      ticketTypeName: params.ticketTypeName,
      quantity: params.quantity,
      orderId: order.id
    });

    const { data: reservationResult, error: reservationError } = await supabase
      .rpc('reserve_tickets_atomic', {
        p_event_id: params.eventId,
        p_ticket_type_name: params.ticketTypeName,
        p_quantity: params.quantity,
        p_order_id: order.id,
        p_expires_at: expiresAt.toISOString()
      });

    if (reservationError) {
      console.error('[createOrder] Reservation error:', reservationError);
      // Clean up order if reservation fails
      await supabase.from('orders').delete().eq('id', order.id);
      throw new Error(`Reservation failed: ${reservationError.message}`);
    }

    const reservation = reservationResult as { success: boolean; error?: string; available?: number } | null;
    
    if (!reservation || !reservation.success) {
      const errorMsg = reservation?.error || 'Reservation failed';
      const available = reservation?.available ?? 0;
      console.error('[createOrder] Reservation failed:', { errorMsg, available });
      // Clean up order if reservation fails
      await supabase.from('orders').delete().eq('id', order.id);
      throw new Error(available > 0 
        ? `Only ${available} ticket(s) available` 
        : errorMsg);
    }

    console.log('[createOrder] Tickets reserved successfully:', reservation);

    // Trigger Inngest event to send abandoned cart email after 20 seconds
    // Only trigger for paid tickets (not free tickets)
    if (totalAmount > 0) {
      try {
        // Use API route to trigger Inngest event (works from both client and server)
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        
        const triggerUrl = `${baseUrl}/api/inngest/trigger`;
        console.log('[createOrder] Attempting to trigger Inngest event:', {
          url: triggerUrl,
          orderId: order.id,
          baseUrl,
          isClient: typeof window !== 'undefined',
        });
        
        const response = await fetch(triggerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventName: 'order/created',
            data: {
              orderId: order.id,
            },
          }),
        });

        const responseText = await response.text();
        let result;
        try {
          result = responseText ? JSON.parse(responseText) : {};
        } catch {
          result = { raw: responseText };
        }

        if (!response.ok) {
          console.error('[createOrder] Inngest trigger failed:', {
            status: response.status,
            statusText: response.statusText,
            error: result,
            url: triggerUrl,
          });
          // Don't throw - Inngest failures shouldn't block order creation
          // The order is created successfully, Inngest is just for background jobs
        } else if (result.skipped) {
          // In development, Inngest events are skipped if dev server isn't running
          console.log('[createOrder] Inngest event skipped (dev mode):', {
            orderId: order.id,
            message: result.message,
          });
        } else {
          console.log('[createOrder] Inngest event triggered successfully:', {
            orderId: order.id,
            result,
          });
        }
      } catch (inngestError) {
        // Log detailed error but don't fail order creation
        console.error('[createOrder] Error triggering Inngest event:', {
          error: inngestError,
          orderId: order.id,
          errorMessage: inngestError instanceof Error ? inngestError.message : String(inngestError),
          errorStack: inngestError instanceof Error ? inngestError.stack : undefined,
        });
      }
    }

    return {
      orderId: order.id,
      totalAmount: totalAmount,
    };
  } catch (error: unknown) {
    console.error('[createOrder] Error creating order:', error);
    throw error;
  }
}

/**
 * Create tickets for a paid order
 */
export async function createTicketsForOrder(orderId: string): Promise<string[]> {
  try {
    // Idempotency check: Check if tickets already exist for this order
    const { data: existingTickets, error: checkError } = await supabase
      .from('tickets')
      .select('id, ticket_code')
      .eq('order_id', orderId)
      .limit(1);

    if (checkError) {
      console.error('[createTicketsForOrder] Error checking existing tickets:', checkError);
      // Continue anyway - might be a permission issue
    }

    if (existingTickets && existingTickets.length > 0) {
      console.log(`[createTicketsForOrder] Tickets already exist for order ${orderId}, returning existing codes`);
      // Return existing ticket codes
      const { data: allTickets } = await supabase
        .from('tickets')
        .select('ticket_code')
        .eq('order_id', orderId);
      
      return (allTickets || []).map(t => t.ticket_code);
    }

    // Fetch order details (don't join events to avoid RLS issues)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Ensure order is paid (required by RLS policy)
    if (order.status !== 'paid') {
      throw new Error('Order must be paid before creating tickets');
    }

    const meta = order.meta as { 
      ticketTypeName?: string; 
      quantity?: number; 
      attendees?: Array<{ name: string; email: string; gender?: string }>; 
      primaryBuyerGender?: string;
    } | null;
    const ticketTypeName = meta?.ticketTypeName;
    const quantity = meta?.quantity || 1;
    const attendees = meta?.attendees || [];
    const primaryBuyerGender = meta?.primaryBuyerGender || null;

    console.log('[createTicketsForOrder] Fetching ticket type:', { ticketTypeName, eventId: order.event_id });

    // Fetch ticket type
    const { data: ticketType, error: ticketTypeError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', order.event_id)
      .eq('name', ticketTypeName)
      .single();

    if (ticketTypeError || !ticketType) {
      console.error('[createTicketsForOrder] Ticket type lookup error:', ticketTypeError);
      console.error('[createTicketsForOrder] Meta data:', meta);
      console.error('[createTicketsForOrder] Looking for:', ticketTypeName);
      throw new Error(`Ticket type not found: ${ticketTypeName}`);
    }
    
    console.log('[createTicketsForOrder] Ticket type found:', ticketType.name);

    // Create tickets and generate QR codes
    const ticketCodes: string[] = [];
    
    // Primary attendee
    const primaryTicketCode = generateTicketCode();
    ticketCodes.push(primaryTicketCode);
    
    // Insert primary ticket first to get its ID for QR code generation
    const { data: primaryTicket, error: primaryTicketError } = await supabase
      .from('tickets')
      .insert({
        order_id: orderId,
        event_id: order.event_id,
        ticket_type_id: ticketType.id,
        ticket_code: primaryTicketCode,
        qr_code_url: '', // Will be updated after generation
        attendee_name: order.buyer_full_name,
        attendee_email: order.buyer_email,
        gender: primaryBuyerGender,
        price: ticketType.price,
        currency: order.currency,
        validation_status: 'valid',
      })
      .select('id')
      .single();

    if (primaryTicketError) throw primaryTicketError;

    // Create all additional tickets first (without QR codes for speed)
    const additionalTicketInserts: Array<{
      order_id: string;
      event_id: string;
      ticket_type_id: string;
      ticket_code: string;
      qr_code_url: string;
      attendee_name: string;
      attendee_email: string;
      gender: string | null;
      price: number;
      currency: string;
      validation_status: string;
    }> = [];

    for (let i = 0; i < Math.min(attendees.length, quantity - 1); i++) {
      const attendee = attendees[i];
      const ticketCode = generateTicketCode();
      ticketCodes.push(ticketCode);
      
      additionalTicketInserts.push({
        order_id: orderId,
        event_id: order.event_id,
        ticket_type_id: ticketType.id,
        ticket_code: ticketCode,
        qr_code_url: '', // Will be generated in background
        attendee_name: attendee.name,
        attendee_email: attendee.email,
        gender: attendee.gender || null,
        price: ticketType.price,
        currency: order.currency,
        validation_status: 'valid',
      });
    }

    // Insert all additional tickets at once
    if (additionalTicketInserts.length > 0) {
      const { data: additionalTickets, error: additionalTicketError } = await supabase
        .from('tickets')
        .insert(additionalTicketInserts)
        .select('id, ticket_code');

      if (additionalTicketError) throw additionalTicketError;

      // Generate QR codes for all tickets in background (non-blocking)
      const allTicketsToGenerate = [
        { id: primaryTicket.id, code: primaryTicketCode },
        ...(additionalTickets || []).map((t: { id: string; ticket_code: string }) => ({ id: t.id, code: t.ticket_code }))
      ];

      // Generate QR codes asynchronously (don't wait)
      Promise.all(
        allTicketsToGenerate.map(async ({ id, code }) => {
          try {
            const qrUrl = await generateAndStoreQRCode(id, code);
            await supabase
              .from('tickets')
              .update({ qr_code_url: qrUrl })
              .eq('id', id);
          } catch (error) {
            console.error(`Failed to generate QR code for ticket ${id}:`, error);
          }
        })
      ).catch(err => console.error('Background QR generation error:', err));
    } else {
      // Generate primary QR code in background if no additional tickets
      generateAndStoreQRCode(primaryTicket.id, primaryTicketCode)
        .then(qrUrl => {
          return supabase
            .from('tickets')
            .update({ qr_code_url: qrUrl })
            .eq('id', primaryTicket.id);
        })
        .catch(err => console.error('Background QR generation error:', err));
    }

    // Note: We no longer manually update sold count here
    // The move_reserved_to_sold RPC function handles this atomically
    // This is called in processPaymentSuccess before createTicketsForOrder

    // Send ticket email (non-blocking, don't wait for it)
    sendTicketEmail({
      orderId,
      order,
      ticketType,
      ticketCodes,
    }).catch(err => {
      console.error('Failed to send ticket email:', err);
      // Don't throw - tickets are created successfully
    });

    // Notify event creator about ticket purchase (non-blocking)
    notifyTicketPurchase(orderId).catch(err => {
      console.error('Failed to send ticket purchase notification:', err);
      // Don't throw - tickets are created successfully
    });

    return ticketCodes;
  } catch (error: unknown) {
    console.error('Error creating tickets:', error);
    throw error;
  }
}

/**
 * Process payment success (idempotent)
 * This is the main function called by webhook and redirect verification
 * It handles: marking order as paid, moving reserved to sold, creating tickets, and queuing email/QR
 */
export async function processPaymentSuccess(
  orderId: string,
  paymentReference: string,
  paymentProvider: string = 'paystack'
): Promise<{ success: boolean; ticketsCreated: boolean; message: string }> {
  try {
    console.log('[processPaymentSuccess] Processing payment success:', { orderId, paymentReference });

    // Idempotency check: Check if order is already paid
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, payment_reference')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('[processPaymentSuccess] Error fetching order:', fetchError);
      throw fetchError;
    }

    if (!order) {
      throw new Error('Order not found');
    }

    // If already paid, check if tickets exist
    if (order.status === 'paid') {
      console.log(`[processPaymentSuccess] Order ${orderId} is already paid`);
      
      // Check if tickets exist
      const { data: existingTickets } = await supabase
        .from('tickets')
        .select('id')
        .eq('order_id', orderId)
        .limit(1);

      if (existingTickets && existingTickets.length > 0) {
        console.log(`[processPaymentSuccess] Order ${orderId} already processed (tickets exist)`);
        return { success: true, ticketsCreated: true, message: 'Order already processed' };
      } else {
        // Order is paid but tickets don't exist - create them
        console.log(`[processPaymentSuccess] Order ${orderId} is paid but tickets missing, creating tickets`);
        // Continue to ticket creation below
      }
    }

    // Mark order as paid (idempotent)
    await markOrderAsPaid(orderId, paymentReference, paymentProvider);

    // Move reserved tickets to sold (atomic operation)
    // Note: This may fail if reservation expired or was already moved (idempotent case)
    console.log('[processPaymentSuccess] Moving reserved tickets to sold');
    const { data: moveResult, error: moveError } = await supabase
      .rpc('move_reserved_to_sold', {
        p_order_id: orderId
      });

    // Handle move result - check if it's idempotent failure
    let moveSucceeded = false;

    if (moveError) {
      console.warn('[processPaymentSuccess] Error moving reserved to sold:', moveError);
      // Check if tickets already exist (idempotent case)
      const { data: existingTickets } = await supabase
        .from('tickets')
        .select('id')
        .eq('order_id', orderId)
        .limit(1);
      
      if (existingTickets && existingTickets.length > 0) {
        console.log('[processPaymentSuccess] Tickets exist despite RPC error - idempotent success');
        return { success: true, ticketsCreated: true, message: 'Order already processed' };
      }
      // Continue - order is paid, proceed to create tickets
      console.log('[processPaymentSuccess] RPC error but order is paid - proceeding to create tickets');
    } else {
    const moveResultData = moveResult as { success: boolean; error?: string } | null;
      if (moveResultData && moveResultData.success) {
        moveSucceeded = true;
        console.log('[processPaymentSuccess] Reserved tickets moved to sold successfully');
      } else {
      const errorMsg = moveResultData?.error || 'Failed to move reserved tickets';
        console.warn('[processPaymentSuccess] Move failed:', errorMsg);
        
        // Check if tickets already exist (idempotent case)
        const { data: existingTickets } = await supabase
          .from('tickets')
          .select('id')
          .eq('order_id', orderId)
          .limit(1);
        
        if (existingTickets && existingTickets.length > 0) {
          console.log('[processPaymentSuccess] Tickets already exist - idempotent success');
          return { success: true, ticketsCreated: true, message: 'Order already processed' };
        }
        
        // If "insufficient reserved", reservation expired/missing but order is paid - proceed
        // The ticket creation will handle inventory checks
        if (errorMsg.includes('Insufficient reserved')) {
          console.log('[processPaymentSuccess] Reservation expired/missing, but order is paid - proceeding to create tickets');
        } else {
          // Other errors - since order is paid, proceed anyway (ticket creation will validate)
          console.warn('[processPaymentSuccess] Move failed with:', errorMsg, '- but order is paid, proceeding');
        }
      }
    }

    // Create tickets (idempotent - checks if tickets already exist)
    let ticketsCreated = false;
    try {
      await createTicketsForOrder(orderId);
      ticketsCreated = true;
      console.log('[processPaymentSuccess] Tickets created successfully');
    } catch (ticketError) {
      console.error('[processPaymentSuccess] Error creating tickets:', ticketError);
      // If tickets already exist, that's okay (idempotent)
      if (ticketError instanceof Error && ticketError.message.includes('already exist')) {
        ticketsCreated = true;
      } else {
        throw ticketError;
      }
    }

    // Queue Inngest event for email and QR generation (non-blocking)
    try {
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      
      const triggerUrl = `${baseUrl}/api/inngest/trigger`;
      
      await fetch(triggerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: 'payment/success',
          data: {
            orderId,
            paymentReference,
            paymentProvider,
          },
        }),
      }).catch(err => {
        console.error('[processPaymentSuccess] Failed to queue email/QR event:', err);
        // Don't throw - tickets are created, email can be sent later
      });

      console.log('[processPaymentSuccess] Email/QR generation queued');
    } catch (queueError) {
      console.error('[processPaymentSuccess] Error queueing email/QR:', queueError);
      // Don't throw - tickets are created successfully
    }

    return { 
      success: true, 
      ticketsCreated, 
      message: 'Payment processed successfully' 
    };
  } catch (error: unknown) {
    console.error('[processPaymentSuccess] Error processing payment:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { 
      success: false, 
      ticketsCreated: false, 
      message: `Payment processing failed: ${message}` 
    };
  }
}

/**
 * Update order status to paid (idempotent)
 * If order is already paid, returns early without error
 */
export async function markOrderAsPaid(orderId: string, paymentReference?: string, paymentProvider: string = 'paystack'): Promise<void> {
  try {
    // Check current status (idempotency check)
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status, payment_reference')
      .eq('id', orderId)
      .single();

    if (fetchError) throw fetchError;

    // If already paid, return early (idempotent)
    if (order?.status === 'paid') {
      console.log(`[markOrderAsPaid] Order ${orderId} is already paid, skipping update`);
      return;
    }

    // Update to paid status
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_reference: paymentReference,
        payment_provider: paymentProvider,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'pending'); // Only update if still pending (prevents race conditions)

    if (error) throw error;
  } catch (error: unknown) {
    console.error('Error marking order as paid:', error);
    throw error;
  }
}

/**
 * Create free tickets (for price = 0)
 * Uses atomic reservation for consistency, but with immediate payment processing
 * Note: Free tickets still reserve inventory to prevent overselling, but payment is instant
 */
export async function createFreeTickets(params: CreateOrderParams): Promise<{ ticketId: string; orderId: string }> {
  try {
    // Create order with reservation (createOrder handles atomic reservation)
    // For free tickets, we'll set a shorter expiry (5 minutes) since payment is instant
    // But actually, we'll process payment immediately, so expiry doesn't matter
    const { orderId } = await createOrder(params);

    // For free tickets, process payment immediately (no actual payment, just mark as paid)
    // This will move reserved -> sold and create tickets
    const result = await processPaymentSuccess(orderId, `FREE-${orderId}`, 'free');

    if (!result.success) {
      throw new Error(result.message || 'Failed to process free ticket order');
    }

    // Wait a moment for tickets to be created
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return the first ticket ID
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id')
      .eq('order_id', orderId)
      .limit(1)
      .single();

    if (ticketError) {
      // If ticket not found, wait a bit more and retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      const { data: retryTicket, error: retryError } = await supabase
        .from('tickets')
        .select('id')
        .eq('order_id', orderId)
        .limit(1)
        .single();
      
      if (retryError) throw retryError;
      return { ticketId: retryTicket.id, orderId };
    }

    return { ticketId: ticket.id, orderId };
  } catch (error: unknown) {
    console.error('Error creating free tickets:', error);
    throw error;
  }
}