/**
 * Minutes a timezone is ahead of UTC at `at` (negative when behind), or null when the phone can't work
 * it out. Reads the wall clock in the zone with plain `Intl.DateTimeFormat` parts, which Hermes supports,
 * rather than the `shortOffset` time zone name, which it may not.
 */
export function utcOffsetMinutes(timeZone: string, at: Date = new Date()): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).formatToParts(at);
    const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
    // Some engines write midnight as 24 even with h23.
    const wall = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour') % 24, part('minute'));
    if (!Number.isFinite(wall)) return null;
    const utc = Math.floor(at.getTime() / 60_000) * 60_000;
    return Math.round((wall - utc) / 60_000);
  } catch {
    return null;
  }
}

/** 330 -> "UTC+05:30", -300 -> "UTC−05:00", 0 -> "UTC±00:00". */
export function formatUtcOffset(minutes: number) {
  const sign = minutes > 0 ? '+' : minutes < 0 ? '−' : '±';
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/** "Asia/Karachi" as "Asia/Karachi (UTC+05:00)", or the bare name when the offset can't be worked out. */
export function timezoneLabel(timeZone: string, at?: Date) {
  const name = timeZone.replace(/_/g, ' ');
  const offset = utcOffsetMinutes(timeZone, at);
  return offset === null ? name : `${name} (${formatUtcOffset(offset)})`;
}
