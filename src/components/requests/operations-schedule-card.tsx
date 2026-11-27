import { Fragment } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { RequestSchedule } from '@/types/request';
import { formatTime12, parseTime } from '@/utils/availability';
import { formatDate } from '@/utils/format';
import { dateKey, WEEKDAYS } from '@/utils/request-form';
import { isClientPlan, parseDayKey, SCHEDULE_KIND_LABELS } from '@/utils/request-schedule';

const TABULAR = { fontVariant: ['tabular-nums' as const] };

// JavaScript's getDay() numbers: Sunday is 0.
const WEEKDAY_CODES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** "14:30" as "2:30 PM", or the text as it came when it can't be read. */
function clock(time: string) {
  const minutes = parseTime(time);
  if (minutes === null) return time;
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return formatTime12(date).replace(/^0/, '');
}

/** 15 -> "15 min", 60 -> "1 hr", 90 -> "1 hr 30 min". */
function duration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/** 150 -> "150 m", 1500 -> "1.5 km". */
function meters(value: number) {
  return value >= 1000 ? `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km` : `${value} m`;
}

/** The weekdays a schedule runs on: the chosen ones, every day for a range, or the one day of a single shift. */
function activeDays(schedule: RequestSchedule): Set<string> {
  if (schedule.kind === 'recurring_weekly') return new Set(schedule.recurrenceDays);
  const first = parseDayKey(schedule.startDate);
  const last = parseDayKey(schedule.endDate);
  if (schedule.kind === 'date_range' && first && last) {
    // A range shorter than a week only runs on the days it covers.
    const days = new Set<string>();
    for (let day = new Date(first); day <= last && days.size < 7; day.setDate(day.getDate() + 1)) {
      days.add(WEEKDAY_CODES[day.getDay()]);
    }
    return days;
  }
  if (schedule.kind === 'date_range') return new Set(WEEKDAY_CODES);
  return first ? new Set([WEEKDAY_CODES[first.getDay()]]) : new Set();
}

/** A week, Monday first, with the days the shifts fall on filled in. */
function WeekStrip({ days }: { days: Set<string> }) {
  const names = WEEKDAYS.filter((day) => days.has(day.value)).map((day) => day.label);
  return (
    <View
      className="flex-row gap-1.5"
      accessible
      accessibilityLabel={names.length ? `Runs on ${names.join(', ')}` : 'No weekdays set'}>
      {WEEKDAYS.map((day) => {
        const on = days.has(day.value);
        return (
          <View
            key={day.value}
            className={`h-8 flex-1 items-center justify-center rounded-lg border ${
              on ? 'border-primary bg-primary-soft' : 'border-border bg-surface'
            }`}>
            <Text variant="caption" tone="inherit" className={on ? 'font-sans-semibold text-primary-soft-content' : 'text-content-muted'}>
              {day.label.charAt(0)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Rows({ rows }: { rows: { label: string; value: string }[] }) {
  return rows.map((row, index) => (
    <Fragment key={row.label}>
      {index > 0 ? <View className="ml-4 h-px bg-border" /> : null}
      <View className="min-h-11 flex-row items-center justify-between gap-4 px-4 py-3">
        <Text variant="small" tone="muted" className="shrink-0">
          {row.label}
        </Text>
        <Text variant="label" className="min-w-0 flex-1 text-right" style={TABULAR}>
          {row.value}
        </Text>
      </View>
    </Fragment>
  ));
}

export type OperationsScheduleCardProps = {
  /** The request's schedule; null when it has none, undefined when it couldn't be loaded. */
  schedule: RequestSchedule | null | undefined;
  /** Opens the shift plan, for the client who owns the request. Leave out for a card that only shows. */
  onEdit?: () => void;
};

/**
 * How a request turns into dated shifts, as the web's "Operations schedule": the shift hours, the dates and
 * the weekdays they fall on. The rules those shifts follow are in `AttendanceRulesCard`.
 */
export function OperationsScheduleCard({ schedule, onEdit }: OperationsScheduleCardProps) {
  const planned = isClientPlan(schedule);

  if (!schedule) {
    return (
      <Card title="Operations schedule">
        <View className="gap-1 px-4 py-3.5">
          <Text variant="small" tone="secondary">
            {schedule === undefined
              ? "Couldn't load the schedule."
              : 'No schedule yet. The job runs once, at the start and end times above.'}
          </Text>
        </View>
        {onEdit ? (
          <View className="px-4 pb-4">
            <Button title="Plan ongoing shifts" variant="secondary" onPress={onEdit} />
          </View>
        ) : null}
      </Card>
    );
  }

  const first = parseDayKey(schedule.startDate);
  const last = parseDayKey(schedule.endDate);
  const oneDay = schedule.kind === 'one_time' || !first || !last || dateKey(first) === dateKey(last);
  const dates = first ? (oneDay ? formatDate(first) : `${formatDate(first)} to ${last ? formatDate(last) : 'no end date'}`) : '';
  const start = parseTime(schedule.startTime);
  const end = parseTime(schedule.endTime);
  const overnight = start !== null && end !== null && end <= start;
  const kind = planned ? SCHEDULE_KIND_LABELS[schedule.kind] : 'Single shift';
  const { rules } = schedule;

  const scheduleRows = [
    { label: 'Timezone', value: schedule.timezone.replace(/_/g, ' ') },
    { label: 'Shifts created', value: schedule.shiftCount !== null ? String(schedule.shiftCount) : '' },
    { label: 'Created ahead', value: planned ? `${rules.horizonDays} ${rules.horizonDays === 1 ? 'day' : 'days'}` : '' },
  ].filter((row) => row.value);

  return (
    <Card title="Operations schedule">
      <View className="gap-3 px-4 pb-4 pt-3.5">
        <View className="flex-row items-center justify-between gap-3">
          <Text variant="caption" tone="muted">
            {kind}
          </Text>
          {schedule.active ? null : (
            <View className="rounded-md bg-warning-soft px-2 py-0.5">
              <Text variant="caption" tone="inherit" className="font-sans-medium text-warning-soft-content">
                Paused
              </Text>
            </View>
          )}
        </View>

        <View className="gap-1">
          <Text variant="heading" style={TABULAR} accessibilityLabel={`${clock(schedule.startTime)} to ${clock(schedule.endTime)}`}>
            {`${clock(schedule.startTime)} – ${clock(schedule.endTime)}`}
          </Text>
          <Text variant="small" tone="secondary" style={TABULAR}>
            {[dates, overnight ? 'ends the next morning' : ''].filter(Boolean).join(' · ')}
          </Text>
        </View>

        <WeekStrip days={activeDays(schedule)} />

        {schedule.active ? null : (
          <Text variant="small" tone="secondary">
            No new shifts are made while the schedule is paused.
          </Text>
        )}
      </View>

      {scheduleRows.length > 0 ? (
        <View className="border-t border-border">
          <Rows rows={scheduleRows} />
        </View>
      ) : null}

      {onEdit ? (
        <View className="gap-2 border-t border-border p-4">
          {planned ? null : (
            <Text variant="small" tone="secondary">
              Plan shifts to repeat this job on more days, or to change its attendance rules.
            </Text>
          )}
          <Button title={planned ? 'Edit shift plan' : 'Plan ongoing shifts'} variant="secondary" onPress={onEdit} />
        </View>
      ) : null}
    </Card>
  );
}

/** The attendance rules a request's shifts follow: where a guard checks in, and when they count as late or absent. */
export function AttendanceRulesCard({ schedule }: { schedule: RequestSchedule }) {
  const { rules } = schedule;
  return (
    <Card title="Attendance rules">
      <Rows
        rows={[
          { label: 'Check in within', value: `${meters(rules.geofenceMeters)} of the site` },
          { label: 'Late after', value: `${duration(rules.lateGraceMinutes)} past start` },
          { label: 'No-show after', value: `${duration(rules.noShowMinutes)} past start` },
          { label: 'Leave reported by', value: `${duration(rules.leaveCutoffMinutes)} before start` },
          { label: 'Guard named by', value: `${duration(rules.rosterLeadMinutes)} before start` },
        ]}
      />
    </Card>
  );
}
