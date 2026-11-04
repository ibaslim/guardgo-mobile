import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { CompanyStep } from '@/components/onboarding/provider/company-step';
import { ContactsStep } from '@/components/onboarding/provider/contacts-step';
import { CoverageStep } from '@/components/onboarding/provider/coverage-step';
import { HeadOfficeStep } from '@/components/onboarding/provider/head-office-step';
import { LicensesInsuranceStep } from '@/components/onboarding/provider/licenses-insurance-step';
import { LogoField } from '@/components/onboarding/logo-step';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useApiForm } from '@/hooks/use-api-form';
import { useGuardMetadata } from '@/hooks/use-guard-metadata';
import { useOnboardingWizard } from '@/hooks/use-onboarding-wizard';
import { useTenantPrefill } from '@/hooks/use-tenant-prefill';
import {
  createProviderOnboardingSchema,
  PROVIDER_ONBOARDING_DEFAULTS,
  PROVIDER_STEP_FIELDS,
} from '@/schemas/provider-onboarding';
import { parseProviderProfile, saveProviderProfile } from '@/services/provider-tenant';
import { finishOnboarding, type TenantSnapshot } from '@/services/tenant';
import type { GuardMetadata } from '@/types/guard-onboarding';

type StepKey = keyof typeof PROVIDER_STEP_FIELDS;

const STEPS: readonly { key: StepKey; title: string }[] = [
  { key: 'company', title: 'Company' },
  { key: 'head', title: 'Head office' },
  { key: 'contacts', title: 'Contacts' },
  { key: 'licenses', title: 'Licenses' },
  { key: 'coverage', title: 'Coverage' },
];

const fieldsOf = (key: StepKey): readonly string[] => PROVIDER_STEP_FIELDS[key];

const parseSaved = (tenant: TenantSnapshot, metadata: GuardMetadata) => parseProviderProfile(tenant.profile, metadata);

/**
 * Service provider onboarding, shown instead of the provider home screen while the server says the
 * tenant is still "onboarding" (see _layout.tsx). Each step is checked before moving on; finishing
 * saves the whole profile with one request, after which the session refreshes and the app shows the
 * under-review screen. Documents are uploaded as they are picked, so the final save only keeps
 * their file ids.
 */
export default function ProviderOnboardingScreen() {
  // The provider's option lists (provinces, cities, license types, guard types) are the guard ones.
  const { metadata, failed, loading, retry } = useGuardMetadata();
  const [logoBusy, setLogoBusy] = useState(false);
  const [uploading, setUploading] = useState(0);

  const schema = useMemo(() => createProviderOnboardingSchema(), []);
  const form = useApiForm({ schema, defaultValues: PROVIDER_ONBOARDING_DEFAULTS });

  const { photo, setPhoto } = useTenantPrefill({
    reset: form.reset,
    metadata,
    defaults: PROVIDER_ONBOARDING_DEFAULTS,
    parse: parseSaved,
  });

  const wizard = useOnboardingWizard({
    form,
    steps: STEPS,
    fieldsOf,
    save: async (values) => {
      if (!metadata) return;
      await saveProviderProfile(values, metadata);
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
  const busy = uploading > 0 || logoBusy;
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
      {key === 'company' ? (
        <CompanyStep
          form={form}
          logo={<LogoField kind="company" value={photo} onValueChange={setPhoto} onBusyChange={setLogoBusy} />}
        />
      ) : null}
      {key === 'head' ? <HeadOfficeStep {...stepProps} /> : null}
      {key === 'contacts' ? <ContactsStep form={form} /> : null}
      {key === 'licenses' ? <LicensesInsuranceStep {...stepProps} /> : null}
      {key === 'coverage' ? <CoverageStep {...stepProps} /> : null}
    </OnboardingShell>
  );
}
