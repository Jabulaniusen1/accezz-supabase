import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateOrderCharges } from './fees';

type PricedOrder = {
  id: string;
  status: string;
  total_amount: number | string | null;
  service_fee: number | string | null;
  processing_fee: number | string | null;
  amount_due?: number | string | null;
};

/**
 * Bring a pending order's buyer fees in line with the current pricing rules,
 * so an order placed before a fee change (such as the ₦100 service charge
 * removed on 2026-11-08) is shown and charged today's amount when the buyer
 * comes back to pay. Only ever lowers or corrects fees on unpaid orders;
 * fulfilment accepts any payment at or above amount_due, so a checkout
 * already opened at the old amount still completes.
 */
export async function refreshPendingCharges<T extends PricedOrder>(db: SupabaseClient, order: T): Promise<T> {
  if (order.status !== 'pending') return order;

  const charges = calculateOrderCharges(Number(order.total_amount) || 0);
  if (
    charges.serviceFee === Number(order.service_fee || 0)
    && charges.processingFee === Number(order.processing_fee || 0)
  ) {
    return order;
  }

  const { data, error } = await db
    .from('orders')
    .update({ service_fee: charges.serviceFee, processing_fee: charges.processingFee })
    .eq('id', order.id)
    .eq('status', 'pending')
    .select('service_fee, processing_fee, amount_due')
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[orderPricing] Could not update fees for order', order.id, error);
    return order;
  }
  return { ...order, ...data };
}
