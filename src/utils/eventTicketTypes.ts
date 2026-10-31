import { supabase } from './supabaseClient';

type TicketTypeInput = {
  id?: string;
  name: string;
  price: string | number;
  quantity: string | number;
  details?: string | null;
};

/**
 * Save an event's ticket types from an edit form.
 *
 * - Rows are matched by id (renaming a ticket type updates it in place).
 * - `sold` is never written from the browser; the database owns it.
 * - Quantity can't go below what has already been sold.
 * - A removed ticket type is deleted if nothing was sold and nobody is
 *   mid-checkout; otherwise it is closed (quantity = sold) so issued tickets
 *   stay valid and in-flight payments can still be honoured.
 */
export async function saveEventTicketTypes(eventId: string, ticketTypes: TicketTypeInput[]): Promise<void> {
  const { data: existingTypes, error: loadError } = await supabase
    .from('ticket_types')
    .select('id, name, sold')
    .eq('event_id', eventId);
  if (loadError) throw new Error('Could not load ticket types. Please try again.');

  const existing = existingTypes || [];
  const byId = new Map(existing.map((t) => [t.id, t]));
  const byName = new Map(existing.map((t) => [t.name, t]));
  const kept = new Set<string>();

  for (const ticket of ticketTypes) {
    const match = (ticket.id && byId.get(ticket.id)) || byName.get(ticket.name);
    const quantity = Number(ticket.quantity || 0);
    const row = {
      name: ticket.name,
      price: Number(ticket.price || 0),
      quantity,
      details: ticket.details || null,
    };

    if (match) {
      kept.add(match.id);
      const sold = Number(match.sold || 0);
      if (quantity < sold) {
        throw new Error(`"${ticket.name}" already has ${sold} tickets sold, so its quantity can't be lower than that.`);
      }
      const { error } = await supabase.from('ticket_types').update(row).eq('id', match.id);
      if (error) throw new Error(`Could not update "${ticket.name}". Please try again.`);
    } else {
      const { error } = await supabase.from('ticket_types').insert({ event_id: eventId, ...row });
      if (error) throw new Error(`Could not add "${ticket.name}". Please try again.`);
    }
  }

  for (const removed of existing.filter((t) => !kept.has(t.id))) {
    const sold = Number(removed.sold || 0);
    const { count: pendingOrders } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'pending')
      .eq('meta->>ticketTypeId', removed.id)
      // Checkouts started in the last hour; older pending orders are abandoned carts
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
    const { error } = sold > 0 || (pendingOrders ?? 0) > 0
      ? await supabase.from('ticket_types').update({ quantity: sold }).eq('id', removed.id)
      : await supabase.from('ticket_types').delete().eq('id', removed.id);
    if (error) throw new Error(`Could not remove "${removed.name}". Please try again.`);
  }
}
