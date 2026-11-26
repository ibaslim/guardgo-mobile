import { DEFAULT_SCHEDULE_RULES } from '@/constants/schedule';
import type { RequestDetail, RequestSchedule, ScheduleKind, SchedulePayload, ScheduleRules } from '@/types/request';
import { formatTime12, parseTime } from '@/utils/availability';
import { formatDate } from '@/utils/format';
import { dateKey, deviceTimezone, to24Hour, WEEKDAYS } from '@/utils/request-form';
import { rulesPayload } from '@/utils/request-payload';

/** Everything the shift plan screen collects. Times are text like "09:30 AM"; the rules are typed numbers. */
export type SchedulePlanValues = {
  kind: ScheduleKind;
  /** The IANA timezone the plan's days and hours are in, like "America/Toronto". */
  timezone: string;
  /** The first day shifts run on; for a one-day plan, the only day. */
  first_day: Date | null;
  /** The last day, for a plan that repeats. */
  last_day: Date | null;
  start_time: string;
  end_time: string;
  /** Weekday codes ("mon" ... "sun") for a weekly plan. */
  days: string[];
  horizon_days: string;
  roster_lead_minutes: string;
  leave_cutoff_minutes: string;
  late_grace_minutes: string;
  no_show_minutes: string;
  geofence_meters: string;
};

/** Which plan field holds each rule. */
export const RULE_FIELDS = {
  horizonDays: 'horizon_days',
  rosterLeadMinutes: 'roster_lead_minutes',
  leaveCutoffMinutes: 'leave_cutoff_minutes',
  lateGraceMinutes: 'late_grace_minutes',
  noShowMinutes: 'no_show_minutes',
  geofenceMeters: 'geofence_meters',
} as const satisfies Record<keyof ScheduleRules, keyof SchedulePlanValues>;

export const SCHEDULE_KIND_LABELS: Record<ScheduleKind, string> = {
  one_time: 'One day only',
  date_range: 'Every day until a date',
  recurring_weekly: 'On chosen weekdays',
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** "2026-11-20" as a local date, or null. */
export function parseDayKey(text: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "14:30" to "02:30 PM", the text the time pickers use; empty when it can't be read. */
function to12Hour(time: string) {
  const minutes = parseTime(time);
  if (minutes === null) return '';
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return formatTime12(date);
}

// JavaScript's getDay() numbers: Sunday is 0.
const WEEKDAY_NUMBER: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

type PlanShape = { kind: ScheduleKind; firstDay: Date; lastDay: Date | null; days: readonly string[]; horizonDays: number };

/**
 * The days the server makes shifts for when the plan is saved, worked out the way it does: from the
 * first day (or today, if that is later) up to the last day, but no further than the horizon ahead.
 * Later days get their shifts as time passes. Uses the phone's today; the server uses the plan's timezone.
 */
export function upcomingShiftDays({ kind, firstDay, lastDay, days, horizonDays }: PlanShape, today = new Date()): Date[] {
  const first = startOfDay(firstDay);
  const from = first > startOfDay(today) ? first : startOfDay(today);
  const finalDay = kind === 'one_time' ? first : startOfDay(lastDay ?? firstDay);
  const horizonEnd = addDays(from, Math.max(Math.floor(horizonDays) - 1, 0));
  const until = finalDay < horizonEnd ? finalDay : horizonEnd;
  if (until < from) return [];

  if (kind === 'one_time') return first >= from && first <= until ? [first] : [];

  const allowed = new Set(days.map((day) => WEEKDAY_NUMBER[day]).filter((day) => day !== undefined));
  const result: Date[] = [];
  for (let day = from; day <= until; day = addDays(day, 1)) {
    if (kind === 'date_range' || allowed.has(day.getDay())) result.push(day);
  }
  return result;
}

/** True when the plan keeps adding shifts after the ones made now, because its last day is past the horizon. */
export function continuesPastHorizon(plan: PlanShape, today = new Date()) {
  if (plan.kind === 'one_time' || !plan.lastDay) return false;
  const first = startOfDay(plan.firstDay);
  const from = first > startOfDay(today) ? first : startOfDay(today);
  return startOfDay(plan.lastDay) > addDays(from, Math.max(Math.floor(plan.horizonDays) - 1, 0));
}

/** True when the client set this schedule themselves (not one the server made for a single shift). */
export const isClientPlan = (schedule: RequestSchedule | null | undefined) => Boolean(schedule && !schedule.systemGenerated);

function rulesToValues(rules: ScheduleRules) {
  return {
    horizon_days: String(rules.horizonDays),
    roster_lead_minutes: String(rules.rosterLeadMinutes),
    leave_cutoff_minutes: String(rules.leaveCutoffMinutes),
    late_grace_minutes: String(rules.lateGraceMinutes),
    no_show_minutes: String(rules.noShowMinutes),
    geofence_meters: String(rules.geofenceMeters),
  };
}

/**
 * The plan to start the screen with. A plan the client set opens as it is saved. Otherwise it starts as
 * the request runs now: one day, at the request's own times, with the standard rules. A server-made
 * schedule keeps any rules it already carries, but its horizon is always the standard one: the server
 * makes those with a one-day horizon, which would make only one day of shifts at a time.
 */
export function planFromSchedule(request: RequestDetail, schedule: RequestSchedule | null): SchedulePlanValues {
  if (schedule && isClientPlan(schedule)) {
    const firstDay = parseDayKey(schedule.startDate);
    return {
      kind: schedule.kind,
      timezone: planTimezone(request, schedule),
      first_day: firstDay,
      // A one-day plan's last day is its first; it is set again if the plan is changed to repeat.
      last_day: schedule.kind === 'one_time' ? null : parseDayKey(schedule.endDate),
      start_time: to12Hour(schedule.startTime),
      end_time: to12Hour(schedule.endTime),
      days: schedule.kind === 'recurring_weekly' ? schedule.recurrenceDays.filter((day) => day in WEEKDAY_NUMBER) : [],
      ...rulesToValues(schedule.rules),
    };
  }

  const rules = schedule ? { ...schedule.rules, horizonDays: DEFAULT_SCHEDULE_RULES.horizonDays } : DEFAULT_SCHEDULE_RULES;
  return {
    kind: 'one_time',
    timezone: planTimezone(request, schedule),
    first_day: request.start ? startOfDay(request.start) : null,
    last_day: null,
    start_time: request.start ? formatTime12(request.start) : '',
    end_time: request.end ? formatTime12(request.end) : '',
    days: [],
    ...rulesToValues(rules),
  };
}

/** The timezone the plan's times are in: the saved plan's own, else the request's, else the phone's. */
export function planTimezone(request: RequestDetail, schedule: RequestSchedule | null) {
  return (schedule && isClientPlan(schedule) && schedule.timezone) || request.timezone || deviceTimezone();
}

/** The rules as numbers. The plan has to have passed `schedulePlanSchema` first. */
export function planRules(values: SchedulePlanValues): ScheduleRules {
  return {
    horizonDays: Number(values.horizon_days),
    rosterLeadMinutes: Number(values.roster_lead_minutes),
    leaveCutoffMinutes: Number(values.leave_cutoff_minutes),
    lateGraceMinutes: Number(values.late_grace_minutes),
    noShowMinutes: Number(values.no_show_minutes),
    geofenceMeters: Number(values.geofence_meters),
  };
}

/** The plan as the server takes it. The plan has to have passed `schedulePlanSchema` first. */
export function buildPlanPayload(values: SchedulePlanValues, active: boolean): SchedulePayload {
  const first = values.first_day ? dateKey(values.first_day) : '';
  const order = WEEKDAYS.map((day) => day.value as string);
  return {
    timezone: values.timezone,
    schedule_type: values.kind,
    start_date: first,
    // A one-day plan ends on the day it starts; the server refuses any other end for it.
    end_date: values.kind === 'one_time' ? first : values.last_day ? dateKey(values.last_day) : null,
    start_time_local: to24Hour(values.start_time),
    end_time_local: to24Hour(values.end_time),
    recurrence_days: values.kind === 'recurring_weekly' ? [...values.days].sort((a, b) => order.indexOf(a) - order.indexOf(b)) : [],
    ...rulesPayload(planRules(values)),
    active,
  };
}

const shortDay = (date: Date) => `${date.toLocaleDateString(undefined, { weekday: 'short' })} ${formatDate(date)}`;

/** "Mon, Wed and Fri" */
function weekdayList(days: readonly string[]) {
  const labels = WEEKDAYS.filter((day) => days.includes(day.value)).map((day) => day.label);
  if (labels.length === 7) return 'Every day';
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/** What a saved plan does, as rows for its card: the pattern, the dates and the hours. */
export function describeSchedule(schedule: RequestSchedule) {
  const first = parseDayKey(schedule.startDate);
  const last = parseDayKey(schedule.endDate);
  const pattern =
    schedule.kind === 'recurring_weekly' ? weekdayList(schedule.recurrenceDays) : schedule.kind === 'date_range' ? 'Every day' : 'One day only';
  const oneDay = schedule.kind === 'one_time' || !first || !last || dateKey(first) === dateKey(last);
  const dates = oneDay ? (first ? formatDate(first) : '') : `${formatDate(first)} to ${formatDate(last)}`;
  const start = parseTime(schedule.startTime);
  const end = parseTime(schedule.endTime);
  const hours =
    start !== null && end !== null
      ? `${to12Hour(schedule.startTime)} to ${to12Hour(schedule.endTime)}${end <= start ? ' (overnight)' : ''}`
      : '';
  return { pattern, dates, hours };
}

/**
 * One line on what saving this plan does now: how many shifts, from when to when, and whether more
 * follow. Null while the plan isn't complete enough to tell.
 */
export function previewPlan(values: SchedulePlanValues, today = new Date()): string | null {
  const horizonDays = Number(values.horizon_days);
  if (!values.first_day || !Number.isInteger(horizonDays) || horizonDays < 1) return null;
  if (values.kind !== 'one_time' && !values.last_day) return null;
  if (values.kind === 'recurring_weekly' && values.days.length === 0) return null;

  const plan = { kind: values.kind, firstDay: values.first_day, lastDay: values.last_day, days: values.days, horizonDays };
  const shifts = upcomingShiftDays(plan, today);
  if (shifts.length === 0) return null;

  const count = shifts.length === 1 ? '1 shift' : `${shifts.length} shifts`;
  const span = shifts.length === 1 ? `on ${shortDay(shifts[0])}` : `from ${shortDay(shifts[0])} to ${shortDay(shifts[shifts.length - 1])}`;
  const more = continuesPastHorizon(plan, today) ? ' More are added as the days pass, up to the last day.' : '';
  return `Saving creates ${count}, ${span}.${more}`;
}
