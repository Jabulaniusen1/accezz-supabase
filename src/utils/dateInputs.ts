/**
 * Conversions between stored timestamps (UTC ISO strings) and the values of
 * <input type="date"> / <input type="time">, which are in the user's local
 * time. Both directions must use local time, otherwise every edit shifts the
 * event by the UTC offset.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO timestamp -> "YYYY-MM-DD" in local time */
export function toLocalDateInput(value?: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** ISO timestamp -> "HH:MM" in local time */
export function toLocalTimeInput(value?: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "YYYY-MM-DD" + "HH:MM" (local) -> ISO timestamp */
export function combineLocalDateTime(date: string, time?: string | null): string {
  if (!date) return '';
  // "YYYY-MM-DDTHH:MM" without a zone is parsed as local time
  const combined = new Date(`${date}T${time || '00:00'}`);
  return Number.isNaN(combined.getTime()) ? '' : combined.toISOString();
}

/** Today's date as "YYYY-MM-DD" in local time (for min= on date inputs) */
export function todayLocalDateInput(): string {
  return toLocalDateInput(new Date());
}
