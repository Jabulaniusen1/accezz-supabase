import type { Ticket } from '@/types/event';

/** Same limit as the server (/api/orders) */
export const MAX_TICKETS_PER_ORDER = 20;

export const CHECKOUT_STEPS = ['Tickets', 'Your details', 'Review & pay'] as const;
export type CheckoutStep = 0 | 1 | 2;

export type TicketHolder = { name: string; email: string; gender: string };

export type BuyerDetails = {
  fullName: string;
  email: string;
  phone: string;
  gender: string;
};

export type FieldErrors = Record<string, string>;

export const EMPTY_HOLDER: TicketHolder = { name: '', email: '', gender: '' };

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const parsePrice = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const ticketsLeft = (ticket: Pick<Ticket, 'quantity' | 'sold'>) =>
  Math.max(0, (parseInt(ticket.quantity, 10) || 0) - (parseInt(ticket.sold, 10) || 0));

export const maxPerOrder = (ticket: Pick<Ticket, 'quantity' | 'sold'>) =>
  Math.min(ticketsLeft(ticket), MAX_TICKETS_PER_ORDER);

/** Inline errors for the details step; empty when everything is valid. */
export function validateDetails(
  buyer: BuyerDetails,
  quantity: number,
  useSameDetails: boolean,
  holders: TicketHolder[],
): FieldErrors {
  const errors: FieldErrors = {};
  if (!buyer.fullName.trim()) errors.fullName = 'Enter your full name';
  if (!buyer.email.trim()) errors.email = 'Enter your email address';
  else if (!EMAIL_RE.test(buyer.email.trim())) errors.email = 'Enter a valid email address';
  const phoneDigits = buyer.phone.replace(/^\+\d+\s*/, '').replace(/\D/g, '');
  if (phoneDigits.length < 7) errors.phone = 'Enter a valid phone number';
  if (!buyer.gender) errors.gender = 'Select an option';

  if (quantity > 1 && !useSameDetails) {
    for (let i = 0; i < quantity - 1; i++) {
      const holder = holders[i] || EMPTY_HOLDER;
      if (!holder.name.trim()) errors[`holder-${i}-name`] = 'Enter a name';
      if (!holder.email.trim()) errors[`holder-${i}-email`] = 'Enter an email address';
      else if (!EMAIL_RE.test(holder.email.trim())) errors[`holder-${i}-email`] = 'Enter a valid email address';
      if (!holder.gender) errors[`holder-${i}-gender`] = 'Select an option';
    }
  }
  return errors;
}

/** Everything that goes into an order; a changed signature needs a new order. */
export function orderSignature(
  ticketId: string | null,
  quantity: number,
  buyer: BuyerDetails,
  useSameDetails: boolean,
  holders: TicketHolder[],
): string {
  return JSON.stringify({
    ticketId,
    quantity,
    buyer: {
      fullName: buyer.fullName.trim(),
      email: buyer.email.trim().toLowerCase(),
      phone: buyer.phone.trim(),
      gender: buyer.gender,
    },
    holders: quantity > 1 && !useSameDetails
      ? holders.slice(0, quantity - 1).map((h) => ({ name: h.name.trim(), email: h.email.trim().toLowerCase(), gender: h.gender }))
      : [],
  });
}
