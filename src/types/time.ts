export type MonthCursor = { year: number; month: number };

export type Period = 'AM' | 'PM';

/** A time being picked, in 12-hour parts. */
export type TimeDraft = { hour: number; minute: number; period: Period };
