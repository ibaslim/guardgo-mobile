import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useController, useWatch, type Control } from 'react-hook-form';
import { ActivityIndicator, View } from 'react-native';

import { EditHeading } from '@/components/account/edit-step-shell';
import { FormSelect, FormTextField, FormWheelDateField, FormWheelTimePicker } from '@/components/form/form-fields';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormScrollView } from '@/components/ui/form-scroll-view';
import { FormSection } from '@/components/ui/form-section';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useApiForm } from '@/hooks/use-api-form';
import { schedulePlanSchema } from '@/schemas/request-schedule';
import { getRequest, getRequestSchedule, requestsErrorMessage, saveRequestSchedule } from '@/services/requests';
import { toast } from '@/services/toast';
import type { RequestDetail, RequestSchedule, ScheduleKind } from '@/types/request';
import { WEEKDAYS } from '@/utils/request-form';
import {
  buildPlanPayload,
  isClientPlan,
  planFromSchedule,
  planTimezone,
  previewPlan,
  SCHEDULE_KIND_LABELS,
  type SchedulePlanValues,
} from '@/utils/request-schedule';

const KINDS = (Object.keys(SCHEDULE_KIND_LABELS) as ScheduleKind[]).map((value) => ({ value, label: SCHEDULE_KIND_LABELS[value] }));

type Loaded = { request: RequestDetail; schedule: RequestSchedule | null };

function Weekdays({ control }: { control: Control<SchedulePlanValues, unknown, SchedulePlanValues> }) {
  const { field, fieldState } = useController({ control, name: 'days' });
  return (
    <View className="gap-2">
      <Text variant="label">Repeat on</Text>
      <ChipSelect options={WEEKDAYS} value={field.value} onChange={field.onChange} accessibilityLabel="Weekdays" error={fieldState.error?.message} />
    </View>
  );
}

/** The plan form, once the request and its schedule have loaded. */
function PlanBody({ request, schedule }: Loaded) {
  const form = useApiForm({ schema: schedulePlanSchema, defaultValues: planFromSchedule(request, schedule) });
  const timezone = planTimezone(request, schedule);
  // A plan paused on the web stays paused: this screen doesn't pause or resume one.
  const active = schedule && isClientPlan(schedule) ? schedule.active : true;
  const values = useWatch({ control: form.control }) as SchedulePlanValues;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = new Date();
  const repeats = values.kind !== 'one_time';
  const preview = active ? previewPlan(values) : null;

  async function save(plan: SchedulePlanValues) {
    setSaving(true);
    try {
      await saveRequestSchedule(request.id, buildPlanPayload(plan, timezone, active), schedule !== null);
      toast.success('Shift plan saved.');
      router.back();
    } catch (failure) {
      toast.failure(requestsErrorMessage(failure, "Couldn't save the shift plan."));
    } finally {
      setSaving(false);
    }
  }

  const invalid = () => toast.warning('Some details need your attention.');
  // Saving rebuilds the upcoming shifts, so check the plan and ask first.
  const askToSave = form.handleSubmit(() => setConfirmOpen(true), invalid);

  return (
    <Screen>
      <EditHeading title="Shift plan" />
      <FormScrollView contentContainerStyle={{ gap: 20, padding: 20, paddingBottom: 40 }}>
        <Text tone="secondary">{`${request.title}${request.siteName ? `, ${request.siteName}` : ''}. The plan sets which days this job runs as shifts, and the attendance rules for them.`}</Text>

        {active ? null : (
          <View className="rounded-xl border border-border bg-surface-muted px-4 py-3">
            <Text variant="small" tone="secondary">
              This plan is paused, so it makes no shifts. Saving keeps it paused.
            </Text>
          </View>
        )}

        <FormSection title="Days" description={repeats ? 'The days this job runs on.' : 'The day this job runs on.'}>
          <FormSelect control={form.control} name="kind" label="Repeat" options={KINDS} />
          <FormWheelDateField control={form.control} name="first_day" label={repeats ? 'First day' : 'Day'} />
          {repeats ? <FormWheelDateField control={form.control} name="last_day" label="Last day" minimumDate={today} /> : null}
          {values.kind === 'recurring_weekly' ? <Weekdays control={form.control} /> : null}
        </FormSection>

        <FormSection title="Hours" description={`Each shift's start and end, in ${timezone} time.`}>
          <View className="flex-row items-start gap-3">
            <View className="flex-1">
              <FormWheelTimePicker control={form.control} name="start_time" label="Starts" compact />
            </View>
            <View className="flex-1">
              <FormWheelTimePicker control={form.control} name="end_time" label="Ends" compact />
            </View>
          </View>
          <Text variant="small" tone="muted">
            An end at or before the start runs overnight, into the next day.
          </Text>
        </FormSection>

        <FormSection title="Attendance rules" description="The standard rules suit most jobs.">
          <FormTextField
            control={form.control}
            name="horizon_days"
            label="Days of shifts made ahead"
            keyboardType="number-pad"
            hint="Shifts are made this many days ahead, up to 90. More follow as the days pass."
          />
          <FormTextField
            control={form.control}
            name="roster_lead_minutes"
            label="Roster due (minutes before start)"
            keyboardType="number-pad"
            hint="When a provider has to have named the guard for a shift."
          />
          <FormTextField
            control={form.control}
            name="leave_cutoff_minutes"
            label="Leave cutoff (minutes before start)"
            keyboardType="number-pad"
            hint="Until when a guard can still report leave for a shift."
          />
          <FormTextField
            control={form.control}
            name="late_grace_minutes"
            label="Late after (minutes)"
            keyboardType="number-pad"
            hint="How long after the start a guard can arrive before counting as late."
          />
          <FormTextField
            control={form.control}
            name="no_show_minutes"
            label="No-show after (minutes)"
            keyboardType="number-pad"
            hint="How long after the start a guard who hasn't arrived is marked a no-show."
          />
          <FormTextField
            control={form.control}
            name="geofence_meters"
            label="Check-in distance (meters)"
            keyboardType="number-pad"
            hint="How near the site a guard has to be to check in."
          />
        </FormSection>

        <View className="gap-3">
          {preview ? (
            <Text variant="small" tone="secondary" className="text-center">
              {preview}
            </Text>
          ) : null}
          <Button title="Save shift plan" size="lg" onPress={() => askToSave()} loading={saving} disabled={saving} />
          <Text variant="small" tone="muted" className="text-center">
            Saving rebuilds this job&apos;s upcoming shifts from the plan.
          </Text>
        </View>
      </FormScrollView>

      <ConfirmDialog
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Rebuild upcoming shifts?"
        message="Upcoming shifts, and one already under way, are replaced with the shifts in this plan. Guards on the job are placed on the new shifts, but changes made to single shifts, like replacements and check-ins, are lost."
        confirmLabel="Save plan"
        onConfirm={async () => {
          await form.handleSubmit(save, invalid)();
        }}
      />
    </Screen>
  );
}

/**
 * The shift plan of a live request, for the client who owns it: whether the job runs one day, every day
 * in a range, or on chosen weekdays, its shift hours, and the attendance rules. Opened from the request.
 */
export default function RequestScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([getRequest(id), getRequestSchedule(id)])
      .then(([request, schedule]) => {
        if (!active) return;
        setLoaded({ request, schedule });
        setFailed(false);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [id, attempt]);

  if (failed) {
    return (
      <Screen>
        <EditHeading title="Shift plan" />
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text variant="heading" className="text-center">
            Could not load the shift plan
          </Text>
          <Text tone="secondary" className="text-center">
            Check your connection and try again.
          </Text>
          <Button title="Try again" variant="secondary" onPress={() => setAttempt((count) => count + 1)} />
        </View>
      </Screen>
    );
  }

  if (!loaded) {
    return (
      <Screen>
        <EditHeading title="Shift plan" />
        <View className="flex-1 items-center justify-center gap-3" accessibilityLiveRegion="polite">
          <ActivityIndicator colorClassName="accent-primary" />
          <Text tone="muted">Loading…</Text>
        </View>
      </Screen>
    );
  }

  return <PlanBody request={loaded.request} schedule={loaded.schedule} />;
}
