import { router, type Href } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ShiftCalendar, TONE_BAR } from '@/components/shifts/shift-calendar';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import type { useGuardShifts } from '@/hooks/use-guard-shifts';
import { isOpenShift, SHIFT_STATUS_LABELS, shiftHours, shiftTone } from '@/services/guard-shifts';
import type { GuardShift, ShiftTone } from '@/types/shift';
import type { BadgeKind } from '@/types/ui';
import { dateFromKey } from '@/utils/calendar';
import { formatTime } from '@/utils/format';

type Shifts = ReturnType<typeof useGuardShifts>;

const BADGE: Record<ShiftTone, BadgeKind> = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  neutral: 'secondary',
};

/** "3 h 20 min", "45 min", "2 days". */
function untilText(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

const hoursText = (hours: number) => `${Math.round(hours * 10) / 10}`;

/** The shift to point out: the one running now, or else the next one to start. */
function pickNext(shifts: GuardShift[]) {
  const now = Date.now();
  const live = shifts.find((shift) => shift.status === 'in_progress');
  if (live) return { shift: live, live: true, until: '' };
  const next = shifts.find((shift) => isOpenShift(shift) && shift.start && shift.start.getTime() > now);
  return next ? { shift: next, live: false, until: untilText(next.start!.getTime() - now) } : null;
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center gap-0.5 py-3">
      <Text variant="heading">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function ShiftRow({ shift, last }: { shift: GuardShift; last: boolean }) {
  const tone = shiftTone(shift);
  const short = shift.required > 0 && shift.staffed < shift.required;
  return (
    <View className="flex-row gap-3">
      <View className="w-16 items-end pt-3.5">
        <Text variant="label">{shift.start ? formatTime(shift.start) : '--'}</Text>
        {shift.end ? (
          <Text variant="caption" tone="muted">
            {formatTime(shift.end)}
          </Text>
        ) : null}
      </View>

      <View className="items-center">
        <View className={`mt-4 size-3 rounded-full ${TONE_BAR[tone]}`} />
        {last ? null : <View className="w-px flex-1 bg-border" />}
      </View>

      <View className={`flex-1 ${last ? '' : 'pb-3'}`}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${shift.title}, ${shift.siteName}. Open shift details.`}
          onPress={() => router.push(`/shift/${shift.id}` as Href)}
          className="gap-2 rounded-xl border border-border bg-surface p-3 active:bg-surface-muted">
          <View className="flex-row items-start justify-between gap-2">
            <Text variant="label" className="flex-1" numberOfLines={2}>
              {shift.title}
            </Text>
            <Badge label={SHIFT_STATUS_LABELS[shift.status] ?? shift.status} kind={BADGE[tone]} />
          </View>
          <View className="flex-row items-center gap-1.5">
            <Icon icon={ICONS.location} size={14} tone="muted" />
            <Text variant="small" tone="secondary" className="flex-1" numberOfLines={1}>
              {shift.siteName}
            </Text>
          </View>
          {shift.required > 0 ? (
            <Text variant="caption" tone={short ? 'danger' : 'muted'}>
              {shift.staffed} of {shift.required} {shift.required === 1 ? 'guard' : 'guards'} on this shift
            </Text>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

/** The guard's Shifts tab: a month calendar, the month's figures, and the shifts of the chosen day. */
export function ShiftsPanel({ shifts: state }: { shifts: Shifts }) {
  const { month, today, selected, byDay, shifts, error, setSelected, step, goToToday } = state;

  const day = useMemo(() => byDay[selected] ?? [], [byDay, selected]);

  // The figures are for the chosen day only; a cancelled or expired shift is not counted.
  const figures = useMemo(() => {
    const list = day.filter((shift) => shift.status !== 'cancelled' && shift.status !== 'expired');
    const attention = list.filter((shift) => isOpenShift(shift) && shiftTone(shift) === 'warning').length;
    return { count: list.length, hours: list.reduce((total, shift) => total + shiftHours(shift), 0), attention };
  }, [day]);

  const next = useMemo(() => pickNext(shifts ?? []), [shifts]);
  // "THU, NOV 12"
  const heading = dateFromKey(selected)
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit' })
    .toUpperCase();

  return (
    <>
      {next ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${next.live ? 'Live now' : 'Next shift'}: ${next.shift.title}. Open shift details.`}
          onPress={() => router.push(`/shift/${next.shift.id}` as Href)}
          className="flex-row items-center gap-3 rounded-2xl bg-primary-soft p-4 active:opacity-80">
          <View className={`size-2.5 rounded-full ${next.live ? 'bg-success' : 'bg-primary'}`} />
          <View className="flex-1 gap-0.5">
            <Text variant="caption" tone="inherit" className="text-primary-soft-content">
              {next.live
                ? 'Live now'
                : `Next shift in ${next.until}`}
            </Text>
            <Text variant="label" tone="inherit" className="text-primary-soft-content" numberOfLines={1}>
              {next.shift.title} at {next.shift.siteName}
            </Text>
          </View>
          <Icon icon={ICONS.chevronRight} size={16} tone="primary-soft" />
        </Pressable>
      ) : null}

      <ShiftCalendar
        month={month}
        today={today}
        selected={selected}
        byDay={byDay}
        onSelect={setSelected}
        onStep={step}
        onToday={goToToday}
        loading={shifts === null && !error}
      />

      <View className="flex-row rounded-2xl border border-border bg-surface">
        <Figure value={String(figures.count)} label={figures.count === 1 ? 'shift' : 'shifts'} />
        <View className="my-3 w-px bg-border" />
        <Figure value={hoursText(figures.hours)} label="hours" />
        <View className="my-3 w-px bg-border" />
        <Figure value={String(figures.attention)} label="need guards" />
      </View>

      {error ? (
        <Text tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <View className="gap-3">
        <View className="flex-row items-baseline justify-between">
          <Text variant="heading" tone="muted" accessibilityRole="header">
            {heading}
          </Text>
          {shifts !== null ? (
            <Text variant="small" tone="muted">
              {day.length === 0 ? 'Free' : `${day.length} ${day.length === 1 ? 'shift' : 'shifts'}`}
            </Text>
          ) : null}
        </View>

        {shifts === null && !error ? (
          <View className="items-center py-8" accessibilityLiveRegion="polite">
            <ActivityIndicator colorClassName="accent-primary" />
          </View>
        ) : null}

        {shifts !== null && day.length === 0 ? (
          <View className="rounded-xl border border-dashed border-border bg-surface-muted p-5">
            <Text tone="secondary">No shifts on this day. Pick a day with dots under its number to see its shifts.</Text>
          </View>
        ) : null}

        {day.length > 0 ? (
          <View>
            {day.map((shift, index) => (
              <ShiftRow key={shift.id} shift={shift} last={index === day.length - 1} />
            ))}
          </View>
        ) : null}
      </View>
    </>
  );
}
