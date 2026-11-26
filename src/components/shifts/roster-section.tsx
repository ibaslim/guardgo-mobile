import { useCallback, useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { jobsErrorMessage } from '@/services/guard-jobs';
import { getGuardShift, isRosterable, listRequestShifts, rosterShift } from '@/services/guard-shifts';
import { listProviderGuards } from '@/services/provider-guards';
import { toast } from '@/services/toast';
import type { ProviderGuard } from '@/types/provider-guard';
import type { GuardShift, GuardShiftDetail, ShiftSlot } from '@/types/shift';
import { dateFromKey } from '@/utils/calendar';
import { laterShifts, patternFrom, planRosterPattern, type ShiftRosterChange } from '@/utils/roster-pattern';

const guardLabel = (guard: ProviderGuard) => guard.name || guard.email;

/** "Mon, 1 Dec", from the shift's date at the site. */
const shiftDay = (shift: GuardShift) =>
  shift.dateLocal ? dateFromKey(shift.dateLocal).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : 'A shift';

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** Date chips shown before the rest are summed up as "+N more". */
const CHIPS_SHOWN = 6;
/** Calls in flight at once while loading or saving upcoming shifts: quick, without flooding the server. */
const PARALLEL = 4;

/** Runs `task` over `items`, `PARALLEL` at a time, and reports each one's outcome in the same order. */
async function eachLimited<T, R>(items: T[], task: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: 'fulfilled', value: await task(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, items.length) }, worker));
  return results;
}

type Upcoming = { state: 'loading' } | { state: 'failed' } | { state: 'ready'; shifts: GuardShiftDetail[] };

/**
 * The request's later open shifts. The list itself loads as soon as the section shows (`wanted`), so a job
 * with nothing to copy to can leave the switch out; each shift's positions load only once `detailed` is on.
 * `later` is undefined while the list loads and null when it couldn't be loaded.
 */
function useUpcomingShifts(current: GuardShift, wanted: boolean, detailed: boolean) {
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  // The shift object is new on every reload of the screen; its id, request, day and start are what count.
  const { id, requestId, dateLocal } = current;
  const startMs = current.start?.getTime() ?? 0;
  // Which load a result belongs to. A result for another key is stale, so it reads as loading.
  const key = `${id}|${requestId}|${dateLocal}|${startMs}|${attempt}`;
  const [list, setList] = useState<{ key: string; later: GuardShift[] | null } | null>(null);
  const [details, setDetails] = useState<{ key: string; shifts: GuardShiftDetail[] | null } | null>(null);
  const later = list?.key === key ? list.later : undefined;
  // The ids as one string, so the details reload when the shifts change and not on every new array.
  const laterIds = later ? later.map((shift) => shift.id).join(',') : '';

  useEffect(() => {
    if (!wanted || !requestId) return;
    let live = true;
    listRequestShifts(requestId, dateLocal).then(
      (shifts) => live && setList({ key, later: laterShifts(shifts, { id, start: new Date(startMs) }) }),
      () => live && setList({ key, later: null })
    );
    return () => {
      live = false;
    };
  }, [wanted, key, id, requestId, dateLocal, startMs]);

  useEffect(() => {
    if (!detailed || !laterIds) return;
    let live = true;
    // A shift that won't load is left out rather than failing the rest.
    eachLimited(laterIds.split(','), (shiftId) => getGuardShift(shiftId)).then((loaded) => {
      if (live) setDetails({ key, shifts: loaded.flatMap((item) => (item.status === 'fulfilled' ? [item.value] : [])) });
    });
    return () => {
      live = false;
    };
  }, [detailed, key, laterIds]);

  const upcoming: Upcoming =
    later === null
      ? { state: 'failed' }
      : later === undefined
        ? { state: 'loading' }
        : later.length === 0
          ? { state: 'ready', shifts: [] }
          : details?.key === key && details.shifts
            ? { state: 'ready', shifts: details.shifts }
            : { state: 'loading' };
  return { later, upcoming, reload };
}

function DayChips({ shifts }: { shifts: GuardShift[] }) {
  const shown = shifts.slice(0, CHIPS_SHOWN);
  const more = shifts.length - shown.length;
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {shown.map((shift) => (
        <View key={shift.id} className="rounded-full bg-surface-muted px-2.5 py-1">
          <Text variant="caption" tone="secondary">
            {shiftDay(shift)}
          </Text>
        </View>
      ))}
      {more > 0 ? (
        <View className="rounded-full bg-surface-muted px-2.5 py-1">
          <Text variant="caption" tone="secondary">{`+${more} more`}</Text>
        </View>
      ) : null}
    </View>
  );
}

function SwitchRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (on: boolean) => void }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="label" className="font-sans-semibold">
          {label}
        </Text>
        <Text variant="small" tone="secondary">
          {hint}
        </Text>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

/**
 * For a service provider: puts one of its own guards on each position it covers, then saves the roster.
 * Only active guards can be chosen. Tapping the chosen guard again clears the position. Nothing shows when
 * the shift has no position left to roster.
 *
 * The roster can also be copied to the request's upcoming shifts, position by position. A position that
 * already has a different guard there is left alone unless the provider chooses to replace it, since it may
 * have been changed for that day on purpose. Leave is not checked yet.
 */
export function RosterSection({ shift, slots, onSaved }: { shift: GuardShift; slots: ShiftSlot[]; onSaved: () => void }) {
  const open = slots.filter(isRosterable);
  const [guards, setGuards] = useState<ProviderGuard[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Only what the provider changed; every other position shows its current guard.
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [replace, setReplace] = useState(false);
  const wanted = open.length > 0;
  const { later, upcoming, reload: reloadUpcoming } = useUpcomingShifts(shift, wanted, wanted && repeat);
  // A job with no later open shift (one day only, or this is its last) has nothing to copy to: no switch.
  // When the list couldn't be loaded the switch still shows, and says so once turned on.
  const canCopy = Boolean(shift.requestId) && later !== undefined && (later === null || later.length > 0);
  const copying = repeat && canCopy;

  useEffect(() => {
    if (!wanted) return;
    let live = true;
    listProviderGuards(1, { status: 'active', rows: 100 }).then(
      (page) => {
        if (!live) return;
        setGuards(page.items.filter((guard) => guard.invite !== 'expired'));
        setFailed(false);
      },
      () => live && setFailed(true)
    );
    return () => {
      live = false;
    };
  }, [wanted]);

  const choice = (slot: ShiftSlot) => picked[slot.id] ?? slot.guardId;
  const chosen = open.filter((slot) => choice(slot));
  const changed = chosen.filter((slot) => choice(slot) !== slot.guardId);
  // A guard works one position of a shift. Every position counts here, including ones already under way.
  const holderOf = (guardId: string, except: ShiftSlot) =>
    slots.find((other) => other.id !== except.id && (open.includes(other) ? choice(other) : other.guardId) === guardId);
  const doubled = chosen.find((slot) => holderOf(choice(slot), slot));
  // Worked out each render from the picks: a few positions over at most 100 shifts, so it is cheap.
  const plan = copying && upcoming.state === 'ready' ? planRosterPattern(patternFrom(open, choice), upcoming.shifts, replace) : null;
  const copies = plan?.changes ?? [];

  if (!wanted) return null;

  const save = async () => {
    if (!chosen.length || (!changed.length && !copies.length)) {
      toast.failure(copying ? 'Choose a guard for at least one position to copy.' : 'Choose a guard for at least one position.');
      return;
    }
    if (doubled) {
      const name = guards?.find((guard) => guard.id === choice(doubled));
      toast.failure(`${name ? guardLabel(name) : 'A guard'} is on more than one position. Choose a different guard for one of them.`);
      return;
    }
    setSaving(true);
    try {
      // This shift first: if it fails, none of the later ones are touched.
      if (changed.length) {
        await rosterShift(
          shift.id,
          chosen.map((slot) => ({ slotId: slot.id, guardId: choice(slot) }))
        );
      }
    } catch (failure) {
      toast.failure(jobsErrorMessage(failure, "Couldn't save the roster. Try again."));
      setSaving(false);
      return;
    }

    const results = await eachLimited(copies, (change: ShiftRosterChange) => rosterShift(change.shift.id, change.assignments));
    const missed = copies.filter((_, index) => results[index].status === 'rejected');
    const applied = copies.length - missed.length;

    if (!copies.length) toast.success('Shift roster updated');
    else if (!missed.length) {
      toast.success(changed.length ? `Roster saved and copied to ${plural(applied, 'shift')}` : `Roster copied to ${plural(applied, 'shift')}`);
    } else {
      const days = missed.slice(0, 3).map((change) => shiftDay(change.shift)).join(', ');
      toast.warning(
        `Copied to ${applied} of ${plural(copies.length, 'shift')}. Couldn't update ${days}${missed.length > 3 ? ` and ${missed.length - 3} more` : ''}. Try again to finish.`
      );
    }

    setSaving(false);
    setPicked({});
    if (copies.length) reloadUpcoming();
    onSaved();
  };

  const buttonTitle = copies.length ? (changed.length ? `Save and copy to ${plural(copies.length, 'shift')}` : `Copy to ${plural(copies.length, 'shift')}`) : 'Save roster';

  return (
    <View className="gap-3">
      <Card title="Roster your guards">
        <View className="gap-4 p-4">
          {failed ? <Text tone="danger">Couldn&apos;t load your guards. Pull down to try again.</Text> : null}
          {guards && guards.length === 0 ? <Text tone="secondary">You have no active guards yet. Invite one from the Guards tab.</Text> : null}
          {guards === null && !failed ? <Text tone="muted">Loading your guards…</Text> : null}
          {guards && guards.length > 0
            ? open.map((slot) => (
                <View key={slot.id} className="gap-2">
                  <Text variant="label" className="font-sans-semibold">
                    {open.length > 1 || slot.number > 1 ? `Position ${slot.number}` : 'Position'}
                  </Text>
                  {guards.map((guard) => {
                    const on = choice(slot) === guard.id;
                    // On another position of this shift: can't be picked here too. Still shown if picked here
                    // already (an older roster may have one guard twice), so it can be swapped for someone else.
                    const elsewhere = holderOf(guard.id, slot);
                    const blocked = Boolean(elsewhere) && !on;
                    return (
                      <Pressable
                        key={guard.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on, disabled: blocked }}
                        accessibilityHint={elsewhere ? `Already on position ${elsewhere.number}` : undefined}
                        disabled={blocked}
                        onPress={() => setPicked((current) => ({ ...current, [slot.id]: on ? '' : guard.id }))}
                        className={`flex-row items-center gap-3 rounded-xl border px-3 py-2.5 ${
                          on
                            ? elsewhere
                              ? 'border-danger bg-primary-soft'
                              : 'border-primary bg-primary-soft'
                            : blocked
                              ? 'border-border bg-surface opacity-50'
                              : 'border-border bg-surface active:bg-surface-muted'
                        }`}>
                        <View className={`h-4 w-4 rounded-full border-2 ${on ? 'border-primary bg-primary' : 'border-border-strong'}`} />
                        <Text numberOfLines={1} className="min-w-0 flex-1">
                          {guardLabel(guard)}
                        </Text>
                        {elsewhere ? (
                          <Text variant="caption" tone={on ? 'danger' : 'muted'}>
                            {`On position ${elsewhere.number}`}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))
            : null}
        </View>

        {guards && guards.length > 0 && canCopy ? (
          <View className="gap-3 border-t border-border p-4">
            <SwitchRow
              label="Copy to upcoming shifts"
              hint="Put the same guards on the same positions of this job's later shifts."
              value={repeat}
              onChange={setRepeat}
            />
            {repeat ? <UpcomingSummary upcoming={upcoming} plan={plan} onRetry={reloadUpcoming} /> : null}
            {repeat && plan && plan.withConflicts > 0 ? (
              <SwitchRow
                label="Replace other guards"
                hint={`${plural(plan.withConflicts, 'shift has', 'shifts have')} a different guard on a position. Turn on to swap them for this roster.`}
                value={replace}
                onChange={setReplace}
              />
            ) : null}
          </View>
        ) : null}
      </Card>
      {guards && guards.length > 0 ? (
        <Button title={buttonTitle} loading={saving} disabled={saving || (copying && upcoming.state === 'loading')} onPress={save} />
      ) : null}
    </View>
  );
}

/** What copying will do: the days that change, and the ones left as they are and why. */
function UpcomingSummary({ upcoming, plan, onRetry }: { upcoming: Upcoming; plan: ReturnType<typeof planRosterPattern> | null; onRetry: () => void }) {
  if (upcoming.state === 'loading') {
    return (
      <Text variant="small" tone="muted" accessibilityLiveRegion="polite">
        Checking this job&apos;s upcoming shifts…
      </Text>
    );
  }
  if (upcoming.state === 'failed' || !plan) {
    return (
      <View className="gap-2">
        <Text variant="small" tone="danger">
          Couldn&apos;t load the upcoming shifts.
        </Text>
        <Button title="Try again" variant="secondary" onPress={onRetry} />
      </View>
    );
  }

  const notes = [
    plan.alreadySet ? `${plural(plan.alreadySet, 'shift')} already ${plan.alreadySet === 1 ? 'has' : 'have'} this roster.` : '',
    plan.skipped.length ? `${plural(plan.skipped.length, 'shift')} left as ${plan.skipped.length === 1 ? 'it is' : 'they are'}: a different guard is on the position.` : '',
    plan.withClashes
      ? `On ${plural(plan.withClashes, 'shift')}, a position is left out: its guard is already on another position there.`
      : '',
  ].filter(Boolean);

  return (
    <View className="gap-2" accessibilityLiveRegion="polite">
      <Text variant="small" tone={plan.changes.length ? 'secondary' : 'muted'}>
        {plan.changes.length
          ? `This roster will be copied to ${plural(plan.changes.length, 'shift')}:`
          : upcoming.shifts.length
            ? 'No upcoming shift needs this roster.'
            : 'This job has no upcoming shifts to copy to.'}
      </Text>
      {plan.changes.length ? <DayChips shifts={plan.changes.map((change) => change.shift)} /> : null}
      {notes.map((note) => (
        <Text key={note} variant="small" tone="muted">
          {note}
        </Text>
      ))}
    </View>
  );
}
