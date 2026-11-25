import type { TimeDraft } from '@/types/time';
import { parseTime } from '@/utils/availability';

/**
 * The current time as 12-hour parts: where a picker with no time chosen yet opens. The minutes are
 * rounded down to a multiple of 5, since the button picker only offers those (and so the hour never rolls over).
 */
export function nowDraft(now = new Date()): TimeDraft {
  const hours = now.getHours();
  return { hour: hours % 12 === 0 ? 12 : hours % 12, minute: now.getMinutes() - (now.getMinutes() % 5), period: hours >= 12 ? 'PM' : 'AM' };
}

export const twoDigits = (value: number) => String(value).padStart(2, '0');

/** "09:30 AM", the text the server and the web use. */
export const draftToText = ({ hour, minute, period }: TimeDraft) => `${twoDigits(hour)}:${twoDigits(minute)} ${period}`;

/** "9:30 PM", for showing. */
export const draftToLabel = ({ hour, minute, period }: TimeDraft) => `${hour}:${twoDigits(minute)} ${period}`;

/** The 12-hour parts of "09:30 AM" (or a 24-hour "21:30"), or null when the text can't be read. */
export function textToDraft(text: string): TimeDraft | null {
  const minutes = parseTime(text);
  if (minutes === null) return null;
  const hours = Math.floor(minutes / 60);
  return { hour: hours % 12 === 0 ? 12 : hours % 12, minute: minutes % 60, period: hours >= 12 ? 'PM' : 'AM' };
}
