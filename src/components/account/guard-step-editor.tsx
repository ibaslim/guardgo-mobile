import { useMemo, useState } from 'react';
import { useWatch } from 'react-hook-form';

import { EditStepFailed, EditStepLoading, EditStepShell } from '@/components/account/edit-step-shell';
import { AvailabilityStep } from '@/components/onboarding/guard/availability-step';
import { HomeStep } from '@/components/onboarding/guard/home-step';
import { IdentityStep } from '@/components/onboarding/guard/identity-step';
import { LicensesStep } from '@/components/onboarding/guard/licenses-step';
import { TrainingStep } from '@/components/onboarding/guard/training-step';
import { WorkAreaStep } from '@/components/onboarding/guard/work-area-step';
import { YouStep } from '@/components/onboarding/guard/you-step';
import { LogoField } from '@/components/onboarding/logo-step';
import { GUARD_PROFILE_STEPS, type GuardProfileStep } from '@/constants/profile-steps';
import { useApiForm } from '@/hooks/use-api-form';
import { useGuardMetadata } from '@/hooks/use-guard-metadata';
import { useStepSave } from '@/hooks/use-step-save';
import { useTenantPrefill } from '@/hooks/use-tenant-prefill';
import { createGuardOnboardingSchema, GUARD_ONBOARDING_DEFAULTS, GUARD_STEP_FIELDS } from '@/schemas/guard-onboarding';
import { parseGuardProfile, saveGuardProfile } from '@/services/guard-tenant';
import { isProviderOwned, type TenantSnapshot } from '@/services/tenant';
import type { GuardMetadata } from '@/types/guard-onboarding';

const parseSaved = (tenant: TenantSnapshot, metadata: GuardMetadata) => ({
  ...parseGuardProfile(tenant.profile, metadata),
  managed_by_provider: isProviderOwned(tenant),
});

/**
 * One section of a guard's saved profile (the same screen as its onboarding step), filled in with
 * what was saved, with a Save button. A provider's guard cannot change the work area or the
 * availability (the provider sets them), so those fields are not sent and only the types of work can be edited.
 */
export function GuardStepEditor({ step }: { step: GuardProfileStep }) {
  const { metadata, failed, retry } = useGuardMetadata();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [uploading, setUploading] = useState(0);

  const schema = useMemo(() => createGuardOnboardingSchema(metadata), [metadata]);
  const form = useApiForm({ schema, defaultValues: GUARD_ONBOARDING_DEFAULTS });
  const managed = useWatch({ control: form.control, name: 'managed_by_provider' });

  const { tenant, photo, setPhoto } = useTenantPrefill({
    reset: form.reset,
    metadata,
    defaults: GUARD_ONBOARDING_DEFAULTS,
    parse: parseSaved,
  });

  const fieldsOf = (key: string): readonly string[] =>
    key === 'work' && managed ? ['preferred_guard_types'] : GUARD_STEP_FIELDS[key as GuardProfileStep];

  // An edit keeps the account's status ("active"); only the first save moves it out of onboarding.
  const { onSave, elsewhere } = useStepSave({
    form,
    step,
    steps: managed ? GUARD_PROFILE_STEPS.filter((item) => item.key !== 'availability') : GUARD_PROFILE_STEPS,
    fieldsOf,
    save: async (values) => {
      if (metadata) await saveGuardProfile(values, metadata, tenant?.status);
    },
  });

  const title = GUARD_PROFILE_STEPS.find((item) => item.key === step)?.title ?? 'Edit profile';

  if (failed) return <EditStepFailed title={title} onRetry={retry} />;
  // Wait for the saved profile to be filled in, including whether a provider owns this guard.
  if (!metadata || !tenant || managed !== isProviderOwned(tenant)) return <EditStepLoading title={title} />;

  const stepProps = {
    form,
    metadata,
    onUploading: (change: 1 | -1) => setUploading((value) => Math.max(value + change, 0)),
  };
  const busy = uploading > 0 || photoBusy;

  return (
    <>
      <EditStepShell
        title={title}
        onSave={onSave}
        saving={form.isSubmitting}
        disabled={busy}
        serverError={form.serverError}
        notice={elsewhere ?? (busy ? 'Uploading… you can save when it is done.' : undefined)}>
        {step === 'you' ? (
          <YouStep
            form={form}
            photo={<LogoField kind="individual" shape="square" value={photo} onValueChange={setPhoto} onBusyChange={setPhotoBusy} />}
          />
        ) : null}
        {step === 'home' ? <HomeStep {...stepProps} /> : null}
        {step === 'work' ? <WorkAreaStep {...stepProps} /> : null}
        {step === 'identity' ? <IdentityStep {...stepProps} /> : null}
        {step === 'licenses' ? <LicensesStep {...stepProps} /> : null}
        {step === 'training' ? <TrainingStep {...stepProps} /> : null}
        {step === 'availability' ? <AvailabilityStep form={form} /> : null}
      </EditStepShell>
    </>
  );
}
