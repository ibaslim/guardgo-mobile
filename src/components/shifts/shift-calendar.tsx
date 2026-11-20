import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { shiftTone, type GuardShift, type ShiftTone } from '@/services/guard-shifts';
import { dateFromKey, monthGrid, WEEKDAYS, type MonthCursor } from '@/utils/calendar';

/** The colour of a shift's bar in a day cell. */
export const TONE_BAR: Record<ShiftTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-content-muted',
};

/** A day shows at most this many dots, then "+N"; the list below the calendar shows them all. */
const MAX_DOTS = 2;

/** One seventh of the week row. */
const CELL = { width: '14.2857%' } as const;

export type ShiftCalendarProps = {
  month: MonthCursor;
  /** "2026-03-12" */
  today: string;
  selected: string;
  byDay: Record<string, GuardShift[]>;
  onSelect: (day: string) => void;
  onStep: (by: number) => void;
  onToday: () => void;
  /** True while the month's shifts load; the days stay visible, only without bars. */
  loading?: boolean;
};

/**
 * A month as a board: each day is a tile, and each shift on it is a dot under the number coloured by how
 * it stands (upcoming, needs guards, live, done, cancelled). A busy day is easy to spot before it is opened.
 */
export function ShiftCalendar({
  month,
  today,
  selected,
  byDay,
  onSelect,
  onStep,
  onToday,
  loading = false,
}: ShiftCalendarProps) {
  const first = new Date(month.year, month.month, 1);
  const monthName = first.toLocaleDateString(undefined, { month: 'long' });
  const viewingToday = today.startsWith(`${month.year}-${String(month.month + 1).padStart(2, '0')}`);

  return (
    <View className="gap-3 rounded-xl border border-border bg-surface p-3">
      <View className="flex-row items-center justify-between pl-1">
        <View className="flex-row items-baseline gap-2">
          <Text variant="heading" accessibilityRole="header">
            {monthName}
          </Text>
          <Text tone="muted">{month.year}</Text>
        </View>

        <View className="flex-row items-center gap-1">
          {viewingToday ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go to today"
              onPress={onToday}
              className="mr-1 h-8 justify-center rounded-full bg-primary-soft px-3 active:opacity-70"
            >
              <Text variant="label" tone="inherit" className="text-primary-soft-content">
                Today
              </Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            hitSlop={6}
            onPress={() => onStep(-1)}
            className="size-9 items-center justify-center rounded-full bg-surface-muted active:opacity-70"
          >
            <Icon icon={ICONS.chevronLeft} size={16} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            hitSlop={6}
            onPress={() => onStep(1)}
            className="size-9 items-center justify-center rounded-full bg-surface-muted active:opacity-70"
          >
            <Icon icon={ICONS.chevronRight} size={16} />
          </Pressable>
        </View>
      </View>

      <View className="flex-row" accessible={false} importantForAccessibility="no-hide-descendants">
        {WEEKDAYS.map((label, index) => (
          <View key={index} className="flex-1 items-center">
            <Text variant="caption" tone="muted" className="font-sans-medium">
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View className={loading ? 'opacity-60' : ''}>
        {monthGrid(month).map((week, row) => (
          <View key={row} className="flex-row">
            {week.map((day, column) => {
              // Every cell is one seventh of the row, so a short last week keeps the same tile size.
              if (!day) return <View key={column} style={[CELL, { height: 52 }]} />;
              const shifts = byDay[day] ?? [];
              const on = day === selected;
              const now = day === today;
              const number = Number(day.slice(8));
              const label = `${dateFromKey(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}, ${
                shifts.length ? `${shifts.length} ${shifts.length === 1 ? 'shift' : 'shifts'}` : 'no shifts'
              }`;
              return (
                <View key={column} style={CELL} className="p-0.5">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{ selected: on }}
                    onPress={() => onSelect(day)}
                    className={`h-12 w-full items-center justify-between rounded-md px-1 pb-1 pt-1.5 ${
                      on
                        ? 'border border-primary bg-primary'
                        : now
                          ? 'border-2 border-primary bg-surface'
                          : shifts.length
                            ? 'border border-border-strong bg-border'
                            : 'border border-border bg-surface'
                    } ${on || now ? '' : 'active:bg-surface-muted'}`}
                  >
                    <Text
                      variant="label"
                      tone="inherit"
                      className={
                        on
                          ? 'font-sans-semibold text-on-primary'
                          : now
                            ? 'font-sans-semibold text-primary'
                            : 'text-content'
                      }
                    >
                      {number}
                    </Text>
                    <View className="h-3 flex-row items-center justify-center gap-0.5" pointerEvents="none">
                      {shifts.slice(0, MAX_DOTS).map((shift) => (
                        <View
                          key={shift.id}
                          className={`size-1.5 rounded-full ${on ? 'bg-on-primary' : TONE_BAR[shiftTone(shift)]}`}
                        />
                      ))}
                      {shifts.length > MAX_DOTS ? (
                        <Text
                          variant="caption"
                          tone="inherit"
                          className={`text-[10px] leading-3 ${on ? 'text-on-primary' : 'text-content-muted'}`}
                        >
                          +{shifts.length - MAX_DOTS}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
