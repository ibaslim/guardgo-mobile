import type { RequestFormValues } from '@/types/request-form';
import { timeToDate } from '@/utils/availability';

export const WEEKDAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
] as const;

const two = (value: number) => String(value).padStart(2, '0');

/** "2026-11-20" */
export const dateKey = (date: Date) => `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;

/** "09:30 AM" to "09:30", or "21:30" for PM; empty text stays empty. */
export function to24Hour(time: string) {
  const parsed = timeToDate(time);
  return parsed ? `${two(parsed.getHours())}:${two(parsed.getMinutes())}` : '';
}

/** A date and a time of day ("09:30 AM") as one Date, or null while either is missing. */
export function combineDateTime(date: Date | null, time: string) {
  const parsed = timeToDate(time);
  if (!date || !parsed) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), parsed.getHours(), parsed.getMinutes());
}

/** The plain local time the server saves and the web sends: "2026-11-20T09:30", with no zone. */
export function localStamp(date: Date | null) {
  return date ? `${dateKey(date)}T${two(date.getHours())}:${two(date.getMinutes())}` : null;
}

/** The phone's timezone name, like "America/Toronto". Shifts are generated in it. */
export function deviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** True when the form describes a pattern that repeats. */
export const repeats = (values: Pick<RequestFormValues, 'repeat'>) => values.repeat !== 'none';
