/**
 * Accezz pricing rules (NGN).
 *
 * Buyers pay: ticket subtotal + Paystack processing fee.
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
 */
const PAYSTACK_PERCENT = 1.5;
const PAYSTACK_FLAT_KOBO = 100_00;
const PAYSTACK_FLAT_WAIVED_BELOW_KOBO = 2_500_00;
const PAYSTACK_CAP_KOBO = 2_000_00;

export interface OrderCharges {
  /** Ticket price × quantity; this is what the organizer sells. */
  subtotal: number;
  /**
   * Always 0: the ₦100 service charge was removed on 2026-11-08. Kept because
   * orders placed before then store one in orders.service_fee.
   */
  serviceFee: number;
  processingFee: number;
  /** What the buyer pays. */
  total: number;
}

const toKobo = (naira: number) => Math.round(naira * 100);
const toNaira = (kobo: number) => kobo / 100;

/**
 * The fee to add so that, after Paystack takes its cut of the full charge,
 * `amountKobo` is still received. Rounded up to the whole naira.
 */
function paystackFeeToPassOn(amountKobo: number): number {
  // fee = (rate × amount + flat) / (1 − rate), in integer kobo
  const grossUp = (flatKobo: number) =>
    Math.ceil((PAYSTACK_PERCENT * amountKobo + 100 * flatKobo) / (100 - PAYSTACK_PERCENT));
  const roundUpToNaira = (kobo: number) => Math.ceil(kobo / 100) * 100;

  let feeKobo = roundUpToNaira(grossUp(0));
  // The flat fee applies once the full charge reaches ₦2,500
  if (amountKobo + feeKobo >= PAYSTACK_FLAT_WAIVED_BELOW_KOBO) {
    feeKobo = roundUpToNaira(grossUp(PAYSTACK_FLAT_KOBO));
  }
  return Math.min(feeKobo, PAYSTACK_CAP_KOBO);
}

/** Price an order for a ticket subtotal (price × quantity). */
export function calculateOrderCharges(subtotal: number): OrderCharges {
  const subtotalKobo = toKobo(Number.isFinite(subtotal) ? Math.max(subtotal, 0) : 0);
  if (subtotalKobo === 0) {
    return { subtotal: 0, serviceFee: 0, processingFee: 0, total: 0 };
  }
  const processingFeeKobo = paystackFeeToPassOn(subtotalKobo);
  return {
    subtotal: toNaira(subtotalKobo),
    serviceFee: 0,
    processingFee: toNaira(processingFeeKobo),
    total: toNaira(subtotalKobo + processingFeeKobo),
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
