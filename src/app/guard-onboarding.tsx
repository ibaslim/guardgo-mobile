import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useWatch } from 'react-hook-form';

import { AvailabilityStep } from '@/components/onboarding/guard/availability-step';
import { HomeStep } from '@/components/onboarding/guard/home-step';
import { IdentityStep } from '@/components/onboarding/guard/identity-step';
import { LicensesStep } from '@/components/onboarding/guard/licenses-step';
import { TrainingStep } from '@/components/onboarding/guard/training-step';
import { WorkAreaStep } from '@/components/onboarding/guard/work-area-step';
import { YouStep } from '@/components/onboarding/guard/you-step';
import { LogoField } from '@/components/onboarding/logo-step';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useApiForm } from '@/hooks/use-api-form';
import { useGuardMetadata } from '@/hooks/use-guard-metadata';
import { useOnboardingWizard } from '@/hooks/use-onboarding-wizard';
import { useTenantPrefill } from '@/hooks/use-tenant-prefill';
import { createGuardOnboardingSchema, GUARD_ONBOARDING_DEFAULTS, GUARD_STEP_FIELDS } from '@/schemas/guard-onboarding';
import { parseGuardProfile, saveGuardProfile } from '@/services/guard-tenant';
import { finishOnboarding, isProviderOwned, type TenantSnapshot } from '@/services/tenant';
import type { GuardMetadata } from '@/types/guard-onboarding';

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

const parseSaved = (tenant: TenantSnapshot, metadata: GuardMetadata) => ({
  ...parseGuardProfile(tenant.profile, metadata),
  managed_by_provider: isProviderOwned(tenant),
});

/**
 * Guard onboarding, shown instead of the guard home screen while the server says the tenant is
 * still "onboarding" (see _layout.tsx). Each step is checked before moving on; finishing saves the
 * whole profile with one request, after which the session refreshes and the app opens the guard area.
 * Documents are uploaded as they are picked, so the final save only keeps their file ids.
 */
export default function GuardOnboardingScreen() {
  const { metadata, failed, loading, retry } = useGuardMetadata();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [uploading, setUploading] = useState(0);

  const schema = useMemo(() => createGuardOnboardingSchema(metadata), [metadata]);
  const form = useApiForm({ schema, defaultValues: GUARD_ONBOARDING_DEFAULTS });
  const managed = useWatch({ control: form.control, name: 'managed_by_provider' });

  // A service provider sets the availability for its own guards, so that step is left out for them.
  const steps = useMemo(() => ALL_STEPS.filter((item) => !(managed && item.key === 'availability')), [managed]);

  // The fields a step checks. For a provider's guard the work area step only asks for guard types.
  const fieldsOf = (key: StepKey): readonly string[] =>
    key === 'work' && managed ? ['preferred_guard_types'] : GUARD_STEP_FIELDS[key];

  const { photo, setPhoto } = useTenantPrefill({
    reset: form.reset,
    metadata,
    defaults: GUARD_ONBOARDING_DEFAULTS,
    parse: parseSaved,
  });

  const wizard = useOnboardingWizard({
    form,
    steps,
    fieldsOf,
    save: async (values) => {
      if (!metadata) return;
      await saveGuardProfile(values, metadata);
      await finishOnboarding();
    },
  });

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

  const stepProps = {
    form,
    metadata,
    onUploading: (change: 1 | -1) => setUploading((value) => Math.max(value + change, 0)),
  };
  const busy = uploading > 0 || photoBusy;
  const key = wizard.current.key;

  return (
    <OnboardingShell
      step={wizard.step}
      total={wizard.total}
      title={wizard.current.title}
      stepKey={key}
      onBack={wizard.onBack}
      last={wizard.last}
      serverError={form.serverError}
      finishing={form.isSubmitting}
      onContinue={wizard.onContinue}
      onFinish={wizard.onFinish}
      continueDisabled={busy}
      finishDisabled={busy}
      notice={busy ? 'Uploading… you can continue when it is done.' : undefined}>
      {key === 'you' ? (
        <YouStep
          form={form}
          photo={<LogoField kind="individual" value={photo} onValueChange={setPhoto} onBusyChange={setPhotoBusy} />}
        />
      ) : null}
      {key === 'home' ? <HomeStep {...stepProps} /> : null}
      {key === 'work' ? <WorkAreaStep {...stepProps} /> : null}
      {key === 'identity' ? <IdentityStep {...stepProps} /> : null}
      {key === 'licenses' ? <LicensesStep {...stepProps} /> : null}
      {key === 'training' ? <TrainingStep {...stepProps} /> : null}
      {key === 'availability' ? <AvailabilityStep form={form} /> : null}
    </OnboardingShell>
  );
}
