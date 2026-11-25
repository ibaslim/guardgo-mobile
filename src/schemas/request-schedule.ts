import { z } from 'zod';

import { SCHEDULE_RULE_LIMITS } from '@/constants/schedule';
import type { ScheduleRules } from '@/types/request';
import { parseTime } from '@/utils/availability';
import { dateKey } from '@/utils/request-form';
import { RULE_FIELDS, upcomingShiftDays, type SchedulePlanValues } from '@/utils/request-schedule';
import { isBlank } from '@/utils/validation';

const day = z.date().nullable();
const number = z.string();

const shape = z.object({
  kind: z.enum(['one_time', 'date_range', 'recurring_weekly']),
  first_day: day,
  last_day: day,
  start_time: z.string(),
  end_time: z.string(),
  days: z.array(z.string()),
  horizon_days: number,
  roster_lead_minutes: number,
  leave_cutoff_minutes: number,
  late_grace_minutes: number,
  no_show_minutes: number,
  geofence_meters: number,
});

const RULE_NAMES: Record<keyof ScheduleRules, string> = {
  horizonDays: 'Days ahead',
  rosterLeadMinutes: 'Roster lead time',
  leaveCutoffMinutes: 'Leave cutoff',
  lateGraceMinutes: 'Late grace',
  noShowMinutes: 'No-show time',
  geofenceMeters: 'Check-in distance',
};

type Fail = (path: keyof SchedulePlanValues, message: string) => void;

/**
 * A shift plan the server will take: the same rules it checks (schedule type, dates, weekdays and the
 * range of each rule), and at least one shift between today and the horizon, which it refuses without.
 */
export const schedulePlanSchema = shape.superRefine((values, ctx) => {
  const fail: Fail = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });
  const repeats = values.kind !== 'one_time';

  if (!values.first_day) fail('first_day', repeats ? 'Choose the first day.' : 'Choose the day.');
  if (isBlank(values.start_time) || parseTime(values.start_time) === null) fail('start_time', 'Choose when the shift starts.');
  if (isBlank(values.end_time) || parseTime(values.end_time) === null) fail('end_time', 'Choose when the shift ends.');

  if (repeats) {
    if (!values.last_day) fail('last_day', 'Choose the last day.');
    else if (values.first_day && dateKey(values.last_day) < dateKey(values.first_day)) {
      fail('last_day', "The last day can't be before the first day.");
    }
  }
  if (values.kind === 'recurring_weekly' && values.days.length === 0) fail('days', 'Choose at least one weekday.');

  let rulesValid = true;
  for (const [rule, field] of Object.entries(RULE_FIELDS) as [keyof ScheduleRules, keyof SchedulePlanValues][]) {
    const text = String(values[field]).trim();
    const { min, max } = SCHEDULE_RULE_LIMITS[rule];
    const value = Number(text);
    if (!/^\d+$/.test(text) || value < min || value > max) {
      fail(field, `${RULE_NAMES[rule]} must be a whole number from ${min} to ${max}.`);
      rulesValid = false;
    }
  }
  // A guard is first marked late, then a no-show; the other way round makes no sense.
  if (rulesValid && Number(values.no_show_minutes) < Number(values.late_grace_minutes)) {
    fail('no_show_minutes', "The no-show time can't be shorter than the late grace.");
  }

  // The server refuses a plan that makes no shift now. Only checked once the dates themselves are right.
  const datesValid =
    values.first_day &&
    (!repeats || (values.last_day && dateKey(values.last_day) >= dateKey(values.first_day))) &&
    (values.kind !== 'recurring_weekly' || values.days.length > 0);
  if (datesValid && rulesValid && values.first_day) {
    const shifts = upcomingShiftDays({
      kind: values.kind,
      firstDay: values.first_day,
      lastDay: values.last_day,
      days: values.days,
      horizonDays: Number(values.horizon_days),
    });
    if (shifts.length === 0) {
      fail(
        repeats ? 'last_day' : 'first_day',
        repeats
          ? `This plan makes no shifts from today within the next ${Number(values.horizon_days)} days. Check the dates and weekdays.`
          : "This day has passed. Choose today or a later day."
      );
    }
  }
});
