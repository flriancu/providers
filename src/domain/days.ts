import type { ISODate } from './schema';

/**
 * Calendar days as the app stores them: YYYY-MM-DD, a day on the calendar, not a moment. Read
 * from a Date in local time, so "today" is this device's day; a day taken from the UTC time
 * would be yesterday in Romania between midnight and 02:00 or 03:00. Pure.
 */

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** The calendar day `date` falls on, on this device. */
export const dayOf = (date: Date): ISODate => `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * Whether `text` is a real calendar day. Checked by building the day and reading it back, not
 * with `Date.parse`, which some engines roll over ("2026-02-31" becomes 3 March) and others
 * refuse, so a file would read differently from one browser to the next.
 */
export function isDay(text: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;
  const [y, m, d] = match.slice(1).map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}
