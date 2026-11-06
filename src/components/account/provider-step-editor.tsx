import { useMemo, useState } from 'react';

import { EditStepFailed, EditStepLoading, EditStepShell } from '@/components/account/edit-step-shell';
import { CompanyStep } from '@/components/onboarding/provider/company-step';
import { ContactsStep } from '@/components/onboarding/provider/contacts-step';
import { CoverageStep } from '@/components/onboarding/provider/coverage-step';
import { HeadOfficeStep } from '@/components/onboarding/provider/head-office-step';
import { LicensesInsuranceStep } from '@/components/onboarding/provider/licenses-insurance-step';
import { LogoField } from '@/components/onboarding/logo-step';
import { PROVIDER_PROFILE_STEPS, type ProviderProfileStep } from '@/constants/profile-steps';
import { useApiForm } from '@/hooks/use-api-form';
import { useGuardMetadata } from '@/hooks/use-guard-metadata';
import { useStepSave } from '@/hooks/use-step-save';
import { useTenantPrefill } from '@/hooks/use-tenant-prefill';
import {
  createProviderOnboardingSchema,
  PROVIDER_ONBOARDING_DEFAULTS,
  PROVIDER_STEP_FIELDS,
} from '@/schemas/provider-onboarding';
import { parseProviderProfile, saveProviderProfile } from '@/services/provider-tenant';
import type { TenantSnapshot } from '@/services/tenant';
import type { GuardMetadata } from '@/types/guard-onboarding';

const fieldsOf = (key: string): readonly string[] => PROVIDER_STEP_FIELDS[key as ProviderProfileStep];

const parseSaved = (tenant: TenantSnapshot, metadata: GuardMetadata) => parseProviderProfile(tenant.profile, metadata);

/**
 * One section of a service provider's saved profile (the same screen as its onboarding step), filled
 * in with what was saved, with a Save button.
 */
export function ProviderStepEditor({ step }: { step: ProviderProfileStep }) {
  // The provider's option lists (provinces, cities, license types, guard types) are the guard ones.
  const { metadata, failed, retry } = useGuardMetadata();
  const [logoBusy, setLogoBusy] = useState(false);
  const [uploading, setUploading] = useState(0);

  const schema = useMemo(() => createProviderOnboardingSchema(), []);
  const form = useApiForm({ schema, defaultValues: PROVIDER_ONBOARDING_DEFAULTS });

  const { tenant, photo, setPhoto } = useTenantPrefill({
    reset: form.reset,
    metadata,
    defaults: PROVIDER_ONBOARDING_DEFAULTS,
    parse: parseSaved,
  });

  // An edit keeps the account's status ("active"); only the first save moves it out of onboarding.
  const { onSave, elsewhere } = useStepSave({
    form,
    step,
    steps: PROVIDER_PROFILE_STEPS,
    fieldsOf,
    save: async (values) => {
      if (metadata) await saveProviderProfile(values, metadata, tenant?.status);
    },
  });

  const title = PROVIDER_PROFILE_STEPS.find((item) => item.key === step)?.title ?? 'Edit profile';

  if (failed) return <EditStepFailed title={title} onRetry={retry} />;
  if (!metadata || !tenant) return <EditStepLoading title={title} />;

  const stepProps = {
    form,
    metadata,
    onUploading: (change: 1 | -1) => setUploading((value) => Math.max(value + change, 0)),
  };
  const busy = uploading > 0 || logoBusy;

  return (
    <>
      <EditStepShell
        title={title}
        onSave={onSave}
        saving={form.isSubmitting}
        disabled={busy}
        serverError={form.serverError}
        notice={elsewhere ?? (busy ? 'Uploading… you can save when it is done.' : undefined)}>
        {step === 'company' ? (
          <CompanyStep
            form={form}
            logo={<LogoField kind="company" value={photo} onValueChange={setPhoto} onBusyChange={setLogoBusy} />}
          />
        ) : null}
        {step === 'head' ? <HeadOfficeStep {...stepProps} /> : null}
        {step === 'contacts' ? <ContactsStep form={form} /> : null}
        {step === 'licenses' ? <LicensesInsuranceStep {...stepProps} /> : null}
        {step === 'coverage' ? <CoverageStep {...stepProps} /> : null}
      </EditStepShell>
    </>
  );
}
