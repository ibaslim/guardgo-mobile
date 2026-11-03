import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import { useWatch } from 'react-hook-form';

import { FormError } from '@/components/form/form-error';
import { AvailabilityStep } from '@/components/onboarding/guard/availability-step';
import { HomeStep } from '@/components/onboarding/guard/home-step';
import { IdentityStep } from '@/components/onboarding/guard/identity-step';
import { LicensesStep } from '@/components/onboarding/guard/licenses-step';
import { TrainingStep } from '@/components/onboarding/guard/training-step';
import { WorkAreaStep } from '@/components/onboarding/guard/work-area-step';
import { YouStep } from '@/components/onboarding/guard/you-step';
import { LogoField } from '@/components/onboarding/logo-step';
import { StepProgress } from '@/components/onboarding/step-progress';
import { Button } from '@/components/ui/button';
import { Entrance } from '@/components/ui/entrance';
import { FormScrollView } from '@/components/ui/form-scroll-view';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useApiForm } from '@/hooks/use-api-form';
import { useGuardMetadata } from '@/hooks/use-guard-metadata';
import { createGuardOnboardingSchema, GUARD_ONBOARDING_DEFAULTS, GUARD_STEP_FIELDS } from '@/schemas/guard-onboarding';
import { parseGuardProfile, saveGuardProfile } from '@/services/guard-tenant';
import {
  fetchTenantLogo,
  finishOnboarding,
  getTenant,
  isProviderOwned,
  type TenantImage,
  type TenantSnapshot,
} from '@/services/tenant';

type StepKey = keyof typeof GUARD_STEP_FIELDS;

const ALL_STEPS: readonly { key: StepKey; title: string }[] = [
  { key: 'you', title: 'You & contact' },
  { key: 'home', title: 'Home' },
  { key: 'work', title: 'Work area' },
  { key: 'identity', title: 'Identity' },
  { key: 'licenses', title: 'Licenses' },
  { key: 'training', title: 'Training' },
  { key: 'availability', title: 'Availability' },
];

/**
 * Guard onboarding, shown instead of the guard home screen while the server says the tenant is
 * still "onboarding" (see _layout.tsx). Each step is checked before moving on; finishing saves the
 * whole profile with one request, after which the session refreshes and the app opens the guard area.
 * Documents are uploaded as they are picked, so the final save only keeps their file ids.
 */
export default function GuardOnboardingScreen() {
  const { metadata, failed, loading, retry } = useGuardMetadata();
  const [step, setStep] = useState(0);
  const [tenant, setTenant] = useState<TenantSnapshot | null>(null);
  const [photo, setPhoto] = useState<TenantImage | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const prefilled = useRef(false);

  const schema = useMemo(() => createGuardOnboardingSchema(metadata), [metadata]);
  const form = useApiForm({ schema, defaultValues: GUARD_ONBOARDING_DEFAULTS });
  const managed = useWatch({ control: form.control, name: 'managed_by_provider' });

  // A service provider sets the availability for its own guards, so that step is left out for them.
  const steps = useMemo(() => ALL_STEPS.filter((item) => !(managed && item.key === 'availability')), [managed]);
  const lastStep = steps.length - 1;
  const current = steps[Math.min(step, lastStep)];

  // Whatever was saved earlier (for example on the web) shows up in the form and the photo.
  useEffect(() => {
    let active = true;
    getTenant()
      .then(async (saved) => {
        if (!active) return;
        setTenant(saved);
        const existing = await fetchTenantLogo(saved.id);
        if (active && existing) setPhoto((value) => value ?? existing);
      })
      .catch(() => {
        // Nothing to pre-fill: the guard fills the form in.
      });
    return () => {
      active = false;
    };
  }, []);

  // Cities are matched against the server's list, so wait for it too. Fields the guard already
  // changed are kept.
  useEffect(() => {
    if (!tenant || !metadata || prefilled.current) return;
    prefilled.current = true;
    const saved = parseGuardProfile(tenant.profile, metadata);
    form.reset(
      { ...GUARD_ONBOARDING_DEFAULTS, ...saved, managed_by_provider: isProviderOwned(tenant) },
      { keepDirtyValues: true }
    );
  }, [tenant, metadata, form]);

  // The phone's back button goes to the previous step instead of leaving the flow.
  useEffect(() => {
    if (step === 0) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setStep((value) => Math.max(value - 1, 0));
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  // The fields a step checks. For a provider's guard the work area step only asks for guard types.
  const fieldsOf = (key: StepKey): string[] =>
    key === 'work' && managed ? ['preferred_guard_types'] : [...GUARD_STEP_FIELDS[key]];

  async function onContinue() {
    const valid = await form.trigger(fieldsOf(current.key) as never, { shouldFocus: true });
    if (valid) setStep(step + 1);
  }

  const save = form.submit(async (values) => {
    if (!metadata) return;
    await saveGuardProfile(values, metadata);
    await finishOnboarding();
  });

  async function onFinish() {
    await save();
    // A server error for a field on an earlier step would be invisible here: go to that step.
    const failedStep = steps.findIndex((item) =>
      fieldsOf(item.key).some((name) => form.getFieldState(name as keyof typeof GUARD_ONBOARDING_DEFAULTS).error)
    );
    if (failedStep >= 0 && failedStep !== lastStep) setStep(failedStep);
  }

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3" accessibilityLiveRegion="polite">
          <ActivityIndicator colorClassName="accent-primary" />
          <Text tone="muted">Loading…</Text>
        </View>
      </Screen>
    );
  }

  if (failed || !metadata) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text variant="heading" className="text-center">
            Could not load the form
          </Text>
          <Text tone="secondary" className="text-center">
            Check your connection and try again.
          </Text>
          <Button title="Try again" variant="secondary" onPress={retry} />
        </View>
      </Screen>
    );
  }

  const last = step >= lastStep;
  const stepProps = {
    form,
    metadata,
    onUploading: (change: 1 | -1) => setUploading((value) => Math.max(value + change, 0)),
  };
  const busy = uploading > 0 || photoBusy;

  return (
    <Screen>
      <StepProgress
        step={step}
        total={steps.length}
        title={current.title}
        onBack={step > 0 ? () => setStep(step - 1) : undefined}
      />
      <FormScrollView contentContainerStyle={{ flexGrow: 1, gap: 24, padding: 24, paddingBottom: 32 }}>
        <Entrance key={current.key}>
          {current.key === 'you' ? (
            <YouStep
              form={form}
              photo={<LogoField kind="individual" value={photo} onValueChange={setPhoto} onBusyChange={setPhotoBusy} />}
            />
          ) : null}
          {current.key === 'home' ? <HomeStep {...stepProps} /> : null}
          {current.key === 'work' ? <WorkAreaStep {...stepProps} /> : null}
          {current.key === 'identity' ? <IdentityStep {...stepProps} /> : null}
          {current.key === 'licenses' ? <LicensesStep {...stepProps} /> : null}
          {current.key === 'training' ? <TrainingStep {...stepProps} /> : null}
          {current.key === 'availability' ? <AvailabilityStep form={form} /> : null}
        </Entrance>

        {last ? <FormError message={form.serverError} /> : null}
        {busy ? (
          <Text variant="small" tone="muted" accessibilityLiveRegion="polite">
            Uploading… you can continue when it is done.
          </Text>
        ) : null}

        <View className="flex-1 justify-end">
          {last ? (
            <Button title="Finish setup" size="lg" onPress={onFinish} loading={form.isSubmitting} disabled={busy} />
          ) : (
            <Button title="Continue" size="lg" onPress={onContinue} disabled={busy} />
          )}
        </View>
      </FormScrollView>
    </Screen>
  );
}
