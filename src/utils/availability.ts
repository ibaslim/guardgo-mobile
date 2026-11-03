import type { TimeRangeValue } from '@/types/guard-onboarding';

// A guard's "day" runs from 6:00 AM to 6:00 AM the next morning, so an overnight shift belongs to the
// day it starts on (same model as the web weekly-availability component and the matching service).
const DAY_START = 6 * 60;
const DAY_MINUTES = 24 * 60;

/** Minutes since midnight for "09:30 AM" (or 24-hour "14:00"), or null if it can't be read. */
export function parseTime(text: string): number | null {
  const match = text.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (minutes > 59) return null;
  if (period) {
    if (hours < 1 || hours > 12) return null;
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  } else if (hours > 23) {
    return null;
  }
  return hours * 60 + minutes;
}

/** "09:30 AM", the text the server and the web use. */
export function formatTime12(date: Date) {
  const hours = date.getHours();
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(hour12).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} ${period}`;
}

/** A Date (today) at the time written in `text`, for the time picker; null for empty or unreadable text. */
export function timeToDate(text: string): Date | null {
  const minutes = parseTime(text);
  if (minutes === null) return null;
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

// Minutes since 6:00 AM. An end of exactly 6:00 AM means the end of the day.
function inWindow(minutes: number, isEnd = false) {
  if (isEnd && minutes === DAY_START) return DAY_MINUTES;
  return minutes >= DAY_START ? minutes - DAY_START : DAY_MINUTES - DAY_START + minutes;
}

function duration(start: number, end: number) {
  if (start === end) return 0;
  return end > start ? end - start : DAY_MINUTES - start + end;
}

// A range that crosses the 6:00 AM boundary is split in two.
function intervals(start: number, end: number): [number, number][] {
  if (start === end) return [];
  return end > start
    ? [[start, end]]
    : [
        [0, end],
        [start, DAY_MINUTES],
      ];
}

/**
 * Problems with one enabled day's ranges, in the web's words. Extra ranges where start and end are
 * both empty are ignored (rows the guard didn't fill in).
 */
export function dayRangeErrors(ranges: readonly TimeRangeValue[]): string[] {
  const errors: string[] = [];
  const add = (message: string) => {
    if (!errors.includes(message)) errors.push(message);
  };

  const first = ranges[0];
  if (!first || !first.start || !first.end) add('Fill in both start and end times for the first time range.');

  const complete: [number, number][] = [];
  ranges.forEach((range, index) => {
    if (index > 0 && !range.start && !range.end) return;
    if (index > 0 && (!range.start || !range.end)) {
      add('Complete both start and end times for every extra range, or leave it empty.');
      return;
    }
    if (!range.start || !range.end) return;

    const start = parseTime(range.start);
    const end = parseTime(range.end);
    if (start === null || end === null) {
      add('Use a valid time.');
      return;
    }
    const normalizedStart = inWindow(start);
    const normalizedEnd = inWindow(end, true);
    if (normalizedStart === normalizedEnd) {
      add('Start time and end time cannot be the same.');
      return;
    }
    complete.push([normalizedStart, normalizedEnd]);
  });

  for (let i = 0; i < complete.length; i++) {
    for (let j = i + 1; j < complete.length; j++) {
      const overlaps = intervals(...complete[i]).some(([startA, endA]) =>
        intervals(...complete[j]).some(([startB, endB]) => startA < endB && endA > startB)
      );
      if (overlaps) add('Time ranges cannot overlap.');
    }
  }

  const total = complete.reduce((sum, [start, end]) => sum + duration(start, end), 0);
  if (total > DAY_MINUTES) add('Total duration cannot exceed 24 hours.');

  return errors;
}
