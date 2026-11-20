import { toIsoDate } from '@/utils/dates';

export const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export type MonthCursor = { year: number; month: number };

export const monthOf = (date: Date): MonthCursor => ({ year: date.getFullYear(), month: date.getMonth() });

export const shiftMonth = ({ year, month }: MonthCursor, by: number): MonthCursor => monthOf(new Date(year, month + by, 1));

export const monthKey = ({ year, month }: MonthCursor) => `${year}-${month}`;

export const sameMonth = (a: MonthCursor, b: MonthCursor) => a.year === b.year && a.month === b.month;

/** The first and last day of the month, "2026-03-01" and "2026-03-31". */
export function monthRange({ year, month }: MonthCursor) {
  return { from: toIsoDate(new Date(year, month, 1)), to: toIsoDate(new Date(year, month + 1, 0)) };
}

/** The month as weeks of seven cells, Sunday first. A cell is a "2026-03-12" key, or null outside the month. */
export function monthGrid({ year, month }: MonthCursor): (string | null)[][] {
  const lead = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, index) => toIsoDate(new Date(year, month, index + 1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/** "2026-03-12" as a local Date at midnight. */
export function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}
