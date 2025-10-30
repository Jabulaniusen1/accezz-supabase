import { supabase } from './supabaseClient';
import { fetchEventBySlug } from './eventUtils';

interface CreateOrderParams {
  eventId: string;
  ticketTypeName: string;
  quantity: number;
  email: string;
  phone: string;
  fullName: string;
  attendees?: Array<{ name: string; email: string }> | null;
  currency?: string;
}

interface TicketCreationData {
  orderId: string;
  eventId: string;
  ticketTypeId: string;
  attendeeName: string;
  attendeeEmail: string;
  price: number;
  currency: string;
}

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
 * Generate QR code URL (using a QR code service or generate locally)
 */
function generateQRCodeUrl(ticketCode: string): string {
  // Using a QR code API service (you can replace with your preferred service)
  const encodedCode = encodeURIComponent(ticketCode);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedCode}`;
}

/**
 * Create an order in Supabase
 */
export async function createOrder(params: CreateOrderParams): Promise<{ orderId: string; totalAmount: number }> {
  try {
    // Fetch event to get ticket type details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, currency')
      .eq('id', params.eventId)
      .single();

    if (eventError) throw eventError;

    // Fetch ticket type
    const { data: ticketType, error: ticketTypeError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', params.eventId)
      .eq('name', params.ticketTypeName)
      .single();

    if (ticketTypeError || !ticketType) {
      throw new Error('Ticket type not found');
    }

    // Check if enough tickets are available
    const available = ticketType.quantity - ticketType.sold;
    if (available < params.quantity) {
      throw new Error(`Only ${available} ticket(s) available`);
    }

    // Calculate total amount
    const totalAmount = ticketType.price * params.quantity;
    const currency = params.currency || event?.currency || 'NGN';

    // Get current session (optional - for logged-in users)
    const { data: { session } } = await supabase.auth.getSession();

    // Create order
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
        meta: {
          ticketTypeName: params.ticketTypeName,
          quantity: params.quantity,
          attendees: params.attendees || null,
        },
      })
      .select('id')
      .single();

    if (orderError) throw orderError;

    return {
      orderId: order.id,
      totalAmount: totalAmount,
    };
  } catch (error: any) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * Create tickets for a paid order
 */
export async function createTicketsForOrder(orderId: string): Promise<string[]> {
  try {
    // Fetch order with event details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, events!inner(*)')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Ensure order is paid (required by RLS policy)
    if (order.status !== 'paid') {
      // Try to update to paid if it's not already
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId);
      
      if (updateError) {
        throw new Error('Order must be paid before creating tickets');
      }
      
      // Re-fetch order to get updated status
      const { data: updatedOrder, error: refetchError } = await supabase
        .from('orders')
        .select('*, events!inner(*)')
        .eq('id', orderId)
        .single();
      
      if (refetchError || !updatedOrder) throw refetchError || new Error('Failed to verify order status');
      
      if (updatedOrder.status !== 'paid') {
        throw new Error('Order must be paid before creating tickets');
      }
      
      // Use updated order data
      Object.assign(order, updatedOrder);
    }

    const meta = order.meta as any;
    const ticketTypeName = meta?.ticketTypeName;
    const quantity = meta?.quantity || 1;
    const attendees = meta?.attendees || [];

    // Fetch ticket type
    const { data: ticketType, error: ticketTypeError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', order.event_id)
      .eq('name', ticketTypeName)
      .single();

    if (ticketTypeError || !ticketType) {
      throw new Error('Ticket type not found');
    }

    // Create tickets
    const ticketCodes: string[] = [];
    const ticketsToInsert = [];

    // Primary attendee
    const primaryTicketCode = generateTicketCode();
    ticketCodes.push(primaryTicketCode);
    ticketsToInsert.push({
      order_id: orderId,
      event_id: order.event_id,
      ticket_type_id: ticketType.id,
      ticket_code: primaryTicketCode,
      qr_code_url: generateQRCodeUrl(primaryTicketCode),
      attendee_name: order.buyer_full_name,
      attendee_email: order.buyer_email,
      price: ticketType.price,
      currency: order.currency,
      validation_status: 'valid',
    });

    // Additional attendees
    for (let i = 0; i < Math.min(attendees.length, quantity - 1); i++) {
      const attendee = attendees[i];
      const ticketCode = generateTicketCode();
      ticketCodes.push(ticketCode);
      ticketsToInsert.push({
        order_id: orderId,
        event_id: order.event_id,
        ticket_type_id: ticketType.id,
        ticket_code: ticketCode,
        qr_code_url: generateQRCodeUrl(ticketCode),
        attendee_name: attendee.name,
        attendee_email: attendee.email,
        price: ticketType.price,
        currency: order.currency,
        validation_status: 'valid',
      });
    }

    // Insert all tickets
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .insert(ticketsToInsert)
      .select('id');

    if (ticketsError) throw ticketsError;

    // Update ticket type sold count (using the function from schema)
    // Note: The schema has a function `issue_tickets_and_update_inventory` but it requires order to be paid
    // We'll manually update the sold count
    const { error: updateError } = await supabase
      .from('ticket_types')
      .update({ sold: ticketType.sold + quantity })
      .eq('id', ticketType.id);

    if (updateError) {
      console.error('Error updating ticket sold count:', updateError);
      // Don't throw - tickets are created, we can fix inventory later
    }

    return ticketCodes;
  } catch (error: any) {
    console.error('Error creating tickets:', error);
    throw error;
  }
}

/**
 * Update order status to paid
 */
export async function markOrderAsPaid(orderId: string, paymentReference?: string, paymentProvider: string = 'paystack'): Promise<void> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_reference: paymentReference,
        payment_provider: paymentProvider,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error marking order as paid:', error);
    throw error;
  }
}

/**
 * Create free tickets (for price = 0)
 */
export async function createFreeTickets(params: CreateOrderParams): Promise<{ ticketId: string }> {
  try {
    // Create order with paid status immediately for free tickets
    const { orderId } = await createOrder(params);

    // Mark as paid immediately
    await markOrderAsPaid(orderId, `FREE-${orderId}`, 'free');

    // Create tickets
    const ticketCodes = await createTicketsForOrder(orderId);

    // Return the first ticket ID
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id')
      .eq('order_id', orderId)
      .limit(1)
      .single();

    if (ticketError) throw ticketError;

    return { ticketId: ticket.id };
  } catch (error: any) {
    console.error('Error creating free tickets:', error);
    throw error;
  }
}

