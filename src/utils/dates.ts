/** "2026-03-12" in the device's time zone, the format the server stores dates in. */
export function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** A date from the server ("2026-03-12" or a full timestamp), as a local date, or null if it can't be read. */
export function fromIsoDate(value: unknown): Date | null {
  const text = typeof value === 'string' ? value.trim() : '';
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function endOfToday() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}

/** Whole years between a birth date and today. */
export function ageOn(birth: Date, today = new Date()) {
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

// A timestamp with no zone marker, such as "2026-11-17T10:03:30.564000".
const NO_ZONE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/**
 * A timestamp the server made itself (created_at, updated_at, offer and expiry deadlines...) as a Date.
 * The server writes these in UTC but leaves off the "Z", and JavaScript reads a bare timestamp as the
 * phone's local time, which puts every one of them off by the phone's offset (5 hours late at UTC+5).
 * So a bare one is read as UTC here. A stamp that already has a zone is read as written.
 *
 * Do not use it for the start and end a person typed on a request: those are wall-clock times in the
 * request's own timezone, and should stay as they are.
 */
export function parseServerTimestamp(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim();
  // Keep milliseconds only: the server sends microseconds, which not every JavaScript engine accepts.
  const iso = NO_ZONE.test(text) ? `${text.replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1')}Z` : text;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * A stored date and time read exactly as written, with no timezone applied: "2026-03-12T20:00:00" is 8:00 PM
 * on the 12th, whatever the phone's zone is. The web shows a shift's start and end this way. Use it for
 * values the person typed or the schedule fixed, not for timestamps the server made (see parseServerTimestamp).
 */
export function parseWallClock(value: unknown): Date | null {
  const match = typeof value === 'string' ? value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/) : null;
  if (!match) return null;
  const [, year, month, day, hour, minute, second = '0'] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  return Number.isNaN(date.getTime()) ? null : date;
}
