import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { EditHeading } from '@/components/account/edit-step-shell';
import { RosterSection } from '@/components/shifts/roster-section';
import { SiteCard } from '@/components/shifts/site-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormScrollView } from '@/components/ui/form-scroll-view';
import { InfoCard } from '@/components/ui/info-card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useRealtimeRefresh, useScreenFocused } from '@/hooks/use-realtime';
import { useRequestSite } from '@/hooks/use-request-site';
import { useRoleArea } from '@/hooks/use-session';
import {
  checkInToSlot,
  checkOutOfSlot,
  getGuardShift,
  SHIFT_STATUS_LABELS,
  shiftHours,
  shiftTone,
  slotStep,
  startSlot,
  SLOT_STATUS_LABELS,
  type GuardShiftDetail,
  type ShiftSlot,
  type ShiftTone,
} from '@/services/guard-shifts';
import type { BadgeKind } from '@/types/ui';
import { dateFromKey } from '@/utils/calendar';
import { formatTime } from '@/utils/format';
import { stamp } from '@/utils/job-status';
import { jobsErrorMessage } from '@/services/guard-jobs';
import { toast } from '@/services/toast';

const BADGE: Record<ShiftTone, BadgeKind> = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  neutral: 'secondary',
};

const STEP_BUTTON = {
  check_in: { title: 'Check in', done: "You're checked in. Waiting for the client to confirm." },
  start: { title: 'Start shift', done: 'Shift started.' },
  check_out: { title: 'Check out', done: 'Checked out. Shift complete.' },
} as const;

/** Development only: coordinates typed by hand, used for the check-in instead of the phone's location. */
type ManualPosition = { latitude: string; longitude: string };

/** The guard's next move on one position: check in at the site, start once the client confirms, check out. */
function SlotActions({ slot, manual, onDone }: { slot: ShiftSlot; manual: ManualPosition; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const step = slotStep(slot);
  if (step === 'none') return null;

  if (step === 'wait_for_client') {
    return (
      <View className="rounded-xl border border-dashed border-border-strong p-4">
        <Text tone="secondary">You are checked in. You can start once the client confirms you have arrived.</Text>
      </View>
    );
  }

  const run = async () => {
    setBusy(true);
    try {
      if (step === 'check_in' && __DEV__) {
        const latitude = Number(manual.latitude);
        const longitude = Number(manual.longitude);
        if (!manual.latitude.trim() || !manual.longitude.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          toast.failure('Enter a valid latitude and longitude to check in.');
          return;
        }
        await checkInToSlot(slot.id, { latitude, longitude });
      } else if (step === 'check_in') {
        const { granted } = await Location.requestForegroundPermissionsAsync();
        if (!granted) {
          toast.failure('Allow location in Settings to check in. It proves you are at the site.');
          return;
        }
        const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        await checkInToSlot(slot.id, { latitude: coords.latitude, longitude: coords.longitude });
      } else if (step === 'start') {
        await startSlot(slot.id);
      } else {
        await checkOutOfSlot(slot.id);
      }
      toast.success(STEP_BUTTON[step].done);
      onDone();
    } catch (failure) {
      toast.failure(jobsErrorMessage(failure, "Couldn't update this shift. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      title={STEP_BUTTON[step].title}
      variant={step === 'check_out' ? 'danger' : 'primary'}
      loading={busy}
      onPress={run}
    />
  );
}

/** One shift the guard works: when and where it is, how many guards it has, and how each position is going. */
export default function ShiftScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<GuardShiftDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // The request holds the site's address and position; the shift only has its name.
  const request = useRequestSite(detail?.shift.requestId);
  // A guard works the shift (check in, start, check out); a service provider rosters its guards onto it.
  const role = useRoleArea();
  const isGuard = role === 'guard';

  useEffect(() => {
    let active = true;
    getGuardShift(id)
      .then((loaded) => {
        if (!active) return;
        setDetail(loaded);
        setFailed(false);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [id, attempt]);

  // Development only: the check-in sends these instead of the phone's location. Start from the site's own position.
  const [typed, setTyped] = useState<Partial<ManualPosition>>({});
  const manual: ManualPosition = {
    latitude: typed.latitude ?? (request?.site.latitude || detail?.shift.siteLatitude) ?? '',
    longitude: typed.longitude ?? (request?.site.longitude || detail?.shift.siteLongitude) ?? '',
  };
  const setManual = (change: Partial<ManualPosition>) => setTyped((current) => ({ ...current, ...change }));

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  const focused = useScreenFocused();
  useRealtimeRefresh(reload, { sources: ['requests'], active: focused });

  const shift = detail?.shift;
  const tone = shift ? shiftTone(shift) : 'neutral';
  const date = shift?.dateLocal
    ? dateFromKey(shift.dateLocal).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
    : '';
  const hours = shift ? Math.round(shiftHours(shift) * 10) / 10 : 0;

  return (
    <Screen>
      <EditHeading title={shift?.title ?? 'Shift'} />
      {failed && !detail ? (
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text variant="heading" className="text-center">
            Could not load this shift
          </Text>
          <Text tone="secondary" className="text-center">
            Check your connection and try again.
          </Text>
          <Button title="Try again" variant="secondary" onPress={reload} />
        </View>
      ) : shift && detail ? (
        <FormScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}>
          <Card>
            <View className="gap-2 p-4">
              <View className="flex-row items-start justify-between gap-3">
                <Text variant="heading" numberOfLines={3} className="min-w-0 flex-1">
                  {shift.title}
                </Text>
                <Badge label={SHIFT_STATUS_LABELS[shift.status] ?? shift.status} kind={BADGE[tone]} />
              </View>
              <Text tone="secondary">{shift.siteName}</Text>
              {date ? (
                <Text variant="label" className="font-sans-semibold">
                  {date}
                </Text>
              ) : null}
            </View>
          </Card>

          <InfoCard
            title="Shift"
            rows={[
              { label: 'Starts', value: shift.start ? formatTime(shift.start) : '' },
              { label: 'Ends', value: shift.end ? formatTime(shift.end) : '' },
              { label: 'Length', value: hours ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : '' },
              {
                label: 'Guards',
                value: shift.required ? `${shift.staffed} of ${shift.required} on this shift` : '',
              },
            ]}
          />

          {request ? <SiteCard site={request.site} name={shift.siteName} /> : null}

          {detail.slots.length > 0 ? (
            detail.slots.map((slot) => (
              <View key={slot.id} className="gap-3">
                <InfoCard
                  title={detail.slots.length > 1 ? `Position ${slot.number}` : 'Your position'}
                  rows={[
                    { label: 'Status', value: SLOT_STATUS_LABELS[slot.status] ?? slot.status },
                    { label: 'Guard', value: slot.guardName },
                    { label: 'Assign guard by', value: stamp(slot.rosterDueAt) },
                    { label: 'Arrived', value: stamp(slot.arrivedAt) },
                    { label: 'Client confirmed', value: stamp(slot.confirmedAt) },
                    { label: 'Started', value: stamp(slot.startedAt) },
                    { label: 'Completed', value: stamp(slot.completedAt) },
                  ]}
                />
                {isGuard && __DEV__ && slotStep(slot) === 'check_in' ? (
                  <View className="gap-3 rounded-xl border border-dashed border-warning p-3">
                    <Text variant="caption" tone="muted">
                      Development only: check-in sends these coordinates instead of the phone&apos;s location.
                    </Text>
                    <TextField
                      label="Latitude"
                      value={manual.latitude}
                      onChangeText={(latitude) => setManual({ latitude })}
                      keyboardType="numbers-and-punctuation"
                    />
                    <TextField
                      label="Longitude"
                      value={manual.longitude}
                      onChangeText={(longitude) => setManual({ longitude })}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                ) : null}
                {isGuard ? <SlotActions slot={slot} manual={manual} onDone={reload} /> : null}
              </View>
            ))
          ) : (
            <View className="rounded-xl border border-dashed border-border-strong p-4">
              <Text tone="secondary">No positions on this shift are assigned to you yet.</Text>
            </View>
          )}

          {role === 'provider' ? <RosterSection shiftId={shift.id} slots={detail.slots} onSaved={reload} /> : null}

          {shift.requestId ? (
            <Button
              title="View request details"
              variant="secondary"
              onPress={() => router.push({ pathname: '/request/[id]', params: { id: shift.requestId } })}
            />
          ) : null}
        </FormScrollView>
      ) : (
        <View className="flex-1 items-center justify-center gap-3" accessibilityLiveRegion="polite">
          <ActivityIndicator colorClassName="accent-primary" />
          <Text tone="muted">Loading…</Text>
        </View>
      )}
    </Screen>
  );
}
