import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { jobsErrorMessage } from '@/services/guard-jobs';
import { isRosterable, rosterShift } from '@/services/guard-shifts';
import { listProviderGuards } from '@/services/provider-guards';
import { toast } from '@/services/toast';
import type { ProviderGuard } from '@/types/provider-guard';
import type { ShiftSlot } from '@/types/shift';

const guardLabel = (guard: ProviderGuard) => guard.name || guard.email;

/**
 * For a service provider: puts one of its own guards on each position it covers, then saves the roster.
 * Only active guards can be chosen. Tapping the chosen guard again clears the position. Nothing shows when
 * the shift has no position left to roster.
 */
export function RosterSection({ shiftId, slots, onSaved }: { shiftId: string; slots: ShiftSlot[]; onSaved: () => void }) {
  const open = slots.filter(isRosterable);
  const [guards, setGuards] = useState<ProviderGuard[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Only what the provider changed; every other position shows its current guard.
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const wanted = open.length > 0;

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

  if (!wanted) return null;

  const choice = (slot: ShiftSlot) => picked[slot.id] ?? slot.guardId;
  const changed = open.filter((slot) => choice(slot) && choice(slot) !== slot.guardId);

  const save = async () => {
    if (!changed.length) {
      toast.failure('Choose a guard for at least one position.');
      return;
    }
    setSaving(true);
    try {
      await rosterShift(
        shiftId,
        open.filter((slot) => choice(slot)).map((slot) => ({ slotId: slot.id, guardId: choice(slot) }))
      );
      toast.success('Shift roster updated');
      setPicked({});
      onSaved();
    } catch (failure) {
      toast.failure(jobsErrorMessage(failure, "Couldn't save the roster. Try again."));
    } finally {
      setSaving(false);
    }
  };

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
                    return (
                      <Pressable
                        key={guard.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                        onPress={() => setPicked((current) => ({ ...current, [slot.id]: on ? '' : guard.id }))}
                        className={`flex-row items-center gap-3 rounded-xl border px-3 py-2.5 ${
                          on ? 'border-primary bg-primary-soft' : 'border-border bg-surface active:bg-surface-muted'
                        }`}>
                        <View className={`h-4 w-4 rounded-full border-2 ${on ? 'border-primary bg-primary' : 'border-border-strong'}`} />
                        <Text numberOfLines={1} className="min-w-0 flex-1">
                          {guardLabel(guard)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))
            : null}
        </View>
      </Card>
      {guards && guards.length > 0 ? <Button title="Save roster" loading={saving} onPress={save} /> : null}
    </View>
  );
}
