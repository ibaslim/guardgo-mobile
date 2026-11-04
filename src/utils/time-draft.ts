import { parseTime } from '@/utils/availability';

export type Period = 'AM' | 'PM';

/** A time being picked, in 12-hour parts. */
export type TimeDraft = { hour: number; minute: number; period: Period };

export const DEFAULT_TIME_DRAFT: TimeDraft = { hour: 9, minute: 0, period: 'AM' };

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
