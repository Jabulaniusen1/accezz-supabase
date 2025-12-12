/**
 * Utility functions for handling orphaned tickets (tickets with missing ticket_type records)
 * This allows analytics to display tickets even when ticket_types were deleted
 */

import { supabase } from './supabaseClient';

export interface RecoveredTicketType {
  id: string;
  name: string;
  price: number;
  currency: string;
}

/**
 * Reconstructs ticket type information from ticket data when ticket_type records are missing
 * This allows analytics to display tickets even after ticket_types were deleted
 */
export async function recoverTicketTypeNames(
  ticketTypeIds: string[],
  tickets: Array<{ ticket_type_id: string; price: number | string; currency?: string | null }>
): Promise<Map<string, string>> {
  const typeMap = new Map<string, string>();
  
  if (!ticketTypeIds.length || !tickets.length) {
    return typeMap;
  }

  // First, try to fetch existing ticket_types
  const { data: ticketTypes } = await supabase
    .from('ticket_types')
    .select('id, name')
    .in('id', ticketTypeIds);
  
  // Map existing ticket types
  (ticketTypes || []).forEach(tt => {
    typeMap.set(tt.id as string, tt.name as string);
  });

  // Find orphaned ticket type IDs (those not found in ticket_types table)
  const orphanedIds = ticketTypeIds.filter(id => !typeMap.has(id));
  
  if (orphanedIds.length === 0) {
    return typeMap;
  }

  // Reconstruct ticket type names from ticket data
  const orphanedTickets = tickets.filter(t => 
    orphanedIds.includes(t.ticket_type_id as string)
  );

  // Group tickets by ticket_type_id, price, and currency to infer names
  const typeGroups = new Map<string, { price: number; currency: string; count: number }>();
  
  orphanedTickets.forEach(t => {
    const typeId = t.ticket_type_id as string;
    const price = Number(t.price || 0);
    const currency = (t.currency as string) || 'USD';
    const key = `${typeId}`;
    
    if (!typeGroups.has(key)) {
      typeGroups.set(key, { price, currency, count: 0 });
    }
    const group = typeGroups.get(key)!;
    // Use the most common price for this ticket type
    if (price > 0 && (group.price === 0 || group.count < 1)) {
      group.price = price;
      group.currency = currency;
    }
    group.count++;
  });

  // Generate inferred names for orphaned ticket types
  typeGroups.forEach((group, typeId) => {
    if (!typeMap.has(typeId)) {
      const inferredName = group.price > 0 
        ? `${group.currency} ${group.price.toFixed(2)} (Recovered)`
        : `Free Ticket (Recovered)`;
      typeMap.set(typeId, inferredName);
    }
  });

  return typeMap;
}

/**
 * Attempts to restore deleted ticket_types from ticket data
 * This should be run as a one-time recovery operation
 */
export async function restoreTicketTypesFromTickets(eventId?: string): Promise<number> {
  try {
    // Find orphaned tickets (tickets with missing ticket_type records)
    let query = supabase
      .from('tickets')
      .select('ticket_type_id, event_id, price, currency, created_at')
      .not('ticket_type_id', 'is', null);

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data: tickets, error: ticketsError } = await query;
    
    if (ticketsError) {
      console.error('Error fetching tickets for recovery:', ticketsError);
      return 0;
    }

    if (!tickets || tickets.length === 0) {
      return 0;
    }

    // Check which ticket_type_ids are missing
    const ticketTypeIds = Array.from(new Set(tickets.map(t => t.ticket_type_id as string)));
    const { data: existingTypes } = await supabase
      .from('ticket_types')
      .select('id')
      .in('id', ticketTypeIds);
    
    const existingIds = new Set((existingTypes || []).map(t => t.id as string));
    const missingIds = ticketTypeIds.filter(id => !existingIds.has(id));

    if (missingIds.length === 0) {
      return 0;
    }

    // Group tickets by ticket_type_id to reconstruct ticket_types
    const typeData = new Map<string, { eventId: string; price: number; currency: string; sold: number; firstSale: string }>();
    
    tickets.forEach(t => {
      const typeId = t.ticket_type_id as string;
      if (!missingIds.includes(typeId)) return;
      
      const price = Number(t.price || 0);
      const currency = (t.currency as string) || 'USD';
      const eventId = t.event_id as string;
      const createdAt = t.created_at as string;
      
      if (!typeData.has(typeId)) {
        typeData.set(typeId, {
          eventId,
          price,
          currency,
          sold: 0,
          firstSale: createdAt,
        });
      }
      
      const data = typeData.get(typeId)!;
      data.sold++;
      if (createdAt < data.firstSale) {
        data.firstSale = createdAt;
      }
    });

    // Insert recovered ticket_types
    const recoveredTypes = Array.from(typeData.entries()).map(([id, data]) => ({
      id, // Use original ID to restore relationships
      event_id: data.eventId,
      name: data.price > 0 
        ? `${data.currency} ${data.price.toFixed(2)} (Recovered)`
        : 'Free Ticket (Recovered)',
      price: data.price,
      quantity: Math.max(data.sold + 10, 100), // Set quantity to sold + buffer
      sold: data.sold,
      details: {
        recovered: true,
        recovery_date: new Date().toISOString(),
        original_price: data.price,
        first_sale: data.firstSale,
      },
      created_at: data.firstSale,
      updated_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('ticket_types')
      .insert(recoveredTypes)
      .select();

    if (insertError) {
      console.error('Error restoring ticket types:', insertError);
      return 0;
    }

    return recoveredTypes.length;
  } catch (error) {
    console.error('Error in restoreTicketTypesFromTickets:', error);
    return 0;
  }
}

