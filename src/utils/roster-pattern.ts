import { isOpenShift, isRosterable } from '@/services/guard-shifts';
import type { GuardShift, GuardShiftDetail, ShiftSlot } from '@/types/shift';

/** The same position on every shift of a request: its assignment and its index within it, as the web keys it. */
export const rosterPatternKey = (slot: ShiftSlot) => `${slot.assignmentId || 'open'}:${slot.coverageIndex}`;

/** Position key to guard tenant id: who goes where. */
export type RosterPattern = Record<string, string>;

export type RosterAssignment = { slotId: string; guardId: string };

/** What copying a roster does to one later shift. */
export type ShiftRosterChange = {
  shift: GuardShift;
  /** What to send for the shift: its empty positions, and those with another guard when replacing. */
  assignments: RosterAssignment[];
  /** Positions that have a different guard, left alone unless replacing. */
  conflicts: number;
  /** Positions left out because their guard is already on another position of that shift. */
  clashes: number;
};

export type RosterPatternPlan = {
  /** Shifts with something to send, earliest first. */
  changes: ShiftRosterChange[];
  /** Shifts left as they are only because their positions have other guards (none when replacing). */
  skipped: GuardShift[];
  /** Shifts with a position on another guard: the ones the "replace" choice is about. */
  withConflicts: number;
  /** Shifts that already have this roster on every position it covers. */
  alreadySet: number;
  /** Shifts where a position was left out because its guard already works another position there. */
  withClashes: number;
};

/** The pattern the provider's picks on this shift make: each picked position's key and its guard. */
export function patternFrom(slots: ShiftSlot[], choice: (slot: ShiftSlot) => string): RosterPattern {
  const pattern: RosterPattern = {};
  for (const slot of slots) {
    const guardId = choice(slot);
    if (guardId) pattern[rosterPatternKey(slot)] = guardId;
  }
  return pattern;
}

/**
 * Shifts of the request a roster can be copied to: open ones (not completed, cancelled or expired) that
 * start at or after `current`, apart from `current` itself.
 */
export function laterShifts(shifts: GuardShift[], current: Pick<GuardShift, 'id' | 'start'>) {
  const from = current.start?.getTime() ?? 0;
  return shifts.filter((shift) => shift.id !== current.id && isOpenShift(shift) && (shift.start?.getTime() ?? 0) >= from);
}

/**
 * What copying `pattern` to each later shift does. A position is matched by its key and only filled when the
 * provider can still roster it. One that already has the pattern's guard is left out; one with a different
 * guard is replaced only when `replace` is on, since it may be a change made to that shift on purpose.
 */
export function planRosterPattern(pattern: RosterPattern, later: GuardShiftDetail[], replace: boolean): RosterPatternPlan {
  const changes: ShiftRosterChange[] = [];
  const skipped: GuardShift[] = [];
  let withConflicts = 0;
  let alreadySet = 0;
  let withClashes = 0;

  for (const { shift, slots } of later) {
    let assignments: RosterAssignment[] = [];
    let conflicts = 0;
    let matched = 0;
    for (const slot of slots) {
      const guardId = pattern[rosterPatternKey(slot)];
      if (!guardId || !isRosterable(slot)) continue;
      matched += 1;
      if (slot.guardId === guardId) continue;
      if (slot.guardId) {
        conflicts += 1;
        if (!replace) continue;
      }
      assignments.push({ slotId: slot.id, guardId });
    }

    // A guard works one position of a shift. A position that keeps its guard (a skipped one, or one under
    // way) may already have someone this roster puts elsewhere: leave that assignment out.
    const changing = new Set(assignments.map((item) => item.slotId));
    const staying = new Set(slots.filter((slot) => !changing.has(slot.id) && slot.guardId).map((slot) => slot.guardId));
    const kept = assignments.filter((item) => !staying.has(item.guardId));
    const clashes = assignments.length - kept.length;
    assignments = kept;
    if (clashes > 0) withClashes += 1;

    if (conflicts > 0) withConflicts += 1;
    if (assignments.length > 0) changes.push({ shift, assignments, conflicts, clashes });
    else if (conflicts > 0 || clashes > 0) skipped.push(shift);
    else if (matched > 0) alreadySet += 1;
  }

  return { changes, skipped, withConflicts, alreadySet, withClashes };
}
