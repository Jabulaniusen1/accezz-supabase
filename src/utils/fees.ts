/**
 * Accezz pricing rules (NGN).
 *
 * Buyers pay: ticket subtotal only. The Paystack processing fee is no longer
 * passed on to the buyer — the merchant (organizer) bears it out of their
 * payout.
 * Organizers pay: the Accezz fee on each event's ticket sales, taken out of
 * their payout (see get_withdrawable_balance / platform_fee_rate in SQL; keep
 * the two in sync).
 *
 * The server prices orders with these; the browser uses them only to show the
 * same breakdown before checkout.
 */

/** Accezz fee on an event's ticket sales: 10%, or 7% once sales reach ₦1m. */
export const PLATFORM_FEE_THRESHOLD = 1_000_000;
export const PLATFORM_FEE_RATE_STANDARD = 0.1;
export const PLATFORM_FEE_RATE_REDUCED = 0.07;

/**
 * Paystack's local-card pricing: 1.5% + ₦100, the ₦100 is waived on
 * transactions under ₦2,500, and the fee is capped at ₦2,000.
 * https://paystack.com/pricing
 * Kept for reference; the merchant now bears this cost (deducted in
 * get_withdrawable_balance), so it is not added to the buyer's total.
 */
export interface OrderCharges {
  /** Ticket price × quantity; this is what the organizer sells. */
  subtotal: number;
  /**
   * Always 0: the ₦100 service charge was removed on 2026-11-08. Kept because
   * orders placed before then store one in orders.service_fee.
   */
  serviceFee: number;
  /** Always 0: the Paystack processing fee is borne by the merchant. */
  processingFee: number;
  /** What the buyer pays: the ticket subtotal only. */
  total: number;
}

const toKobo = (naira: number) => Math.round(naira * 100);
const toNaira = (kobo: number) => kobo / 100;

/** Price an order for a ticket subtotal (price × quantity). */
export function calculateOrderCharges(subtotal: number): OrderCharges {
  const subtotalKobo = toKobo(Number.isFinite(subtotal) ? Math.max(subtotal, 0) : 0);
  if (subtotalKobo === 0) {
    return { subtotal: 0, serviceFee: 0, processingFee: 0, total: 0 };
  }
  return {
    subtotal: toNaira(subtotalKobo),
    serviceFee: 0,
    processingFee: 0,
    total: toNaira(subtotalKobo),
  };
}

/** The Accezz fee rate for an event with this much in paid ticket sales. */
export function platformFeeRate(eventTicketSales: number): number {
  return eventTicketSales >= PLATFORM_FEE_THRESHOLD ? PLATFORM_FEE_RATE_REDUCED : PLATFORM_FEE_RATE_STANDARD;
}

/** The Accezz fee for one event's paid ticket sales. */
export function platformFee(eventTicketSales: number): number {
  const sales = Number.isFinite(eventTicketSales) ? Math.max(eventTicketSales, 0) : 0;
  return Math.round(sales * platformFeeRate(sales) * 100) / 100;
}
