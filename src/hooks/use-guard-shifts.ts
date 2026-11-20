import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRealtimeRefresh, useScreenFocused } from '@/hooks/use-realtime';
import { jobsErrorMessage } from '@/services/guard-jobs';
import { listGuardShifts, type GuardShift } from '@/services/guard-shifts';
import { monthKey, monthOf, sameMonth, shiftMonth, type MonthCursor } from '@/utils/calendar';
import { toIsoDate } from '@/utils/dates';

const LOAD_ERROR = "Couldn't load your shifts. Pull down to try again.";

type Result = { key: string; items: GuardShift[] };
type Failure = { key: string; message: string };

/**
 * One month of the guard's shifts for the calendar, and which month and day are showing. `shifts` is null
 * while the month loads, so an answer for an older month never shows under a newer one. Nothing loads
 * until `enabled`, so the tab costs nothing while another section is open.
 */
export function useGuardShifts(enabled: boolean) {
  const today = toIsoDate(new Date());
  const [month, setMonth] = useState<MonthCursor>(() => monthOf(new Date()));
  const [selected, setSelected] = useState(today);
  const [result, setResult] = useState<Result | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reloads, setReloads] = useState(0);
  const key = monthKey(month);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    listGuardShifts(month).then(
      (items) => {
        if (!live) return;
        setResult({ key, items });
        setFailure(null);
      },
      (error) => live && setFailure({ key, message: jobsErrorMessage(error, LOAD_ERROR) })
    );
    return () => {
      live = false;
    };
  }, [enabled, month, key, reloads]);

  const reload = useCallback(() => setReloads((count) => count + 1), []);

  const focused = useScreenFocused();
  useRealtimeRefresh(reload, { sources: ['requests'], active: focused && enabled });

  // Coming back to the screen shows what changed. The first focus is the first load above.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      reload();
    }, [reload])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setResult({ key, items: await listGuardShifts(month) });
      setFailure(null);
    } catch (error) {
      setFailure({ key, message: jobsErrorMessage(error, LOAD_ERROR) });
    } finally {
      setRefreshing(false);
    }
  }, [month, key]);

  /** Moves to another month, landing on today when that is the month, or on its first day. */
  const goToMonth = useCallback((next: MonthCursor) => {
    setMonth(next);
    setSelected(sameMonth(next, monthOf(new Date())) ? toIsoDate(new Date()) : toIsoDate(new Date(next.year, next.month, 1)));
  }, []);

  const step = useCallback((by: number) => goToMonth(shiftMonth(month, by)), [goToMonth, month]);
  const goToToday = useCallback(() => goToMonth(monthOf(new Date())), [goToMonth]);

  const shifts = result && result.key === key ? result.items : null;
  const byDay = useMemo(() => {
    const days: Record<string, GuardShift[]> = {};
    for (const shift of shifts ?? []) (days[shift.dateLocal] ??= []).push(shift);
    return days;
  }, [shifts]);

  return {
    month,
    today,
    selected,
    setSelected,
    step,
    goToToday,
    shifts,
    byDay,
    error: failure && failure.key === key ? failure.message : null,
    refreshing,
    refresh,
  };
}
