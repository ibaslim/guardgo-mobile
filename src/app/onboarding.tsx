import { useState } from 'react';
import { useWatch } from 'react-hook-form';

import { BillingStep } from '@/components/onboarding/client/billing-step';
import { ClientTypeStep } from '@/components/onboarding/client/client-type-step';
import { ContactsStep } from '@/components/onboarding/client/contacts-step';
import { IdentityStep } from '@/components/onboarding/client/identity-step';
import { LogoField } from '@/components/onboarding/logo-step';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { SitesStep } from '@/components/onboarding/client/sites-step';
import { useApiForm } from '@/hooks/use-api-form';
import { useClientMetadata } from '@/hooks/use-client-metadata';
import { useOnboardingWizard } from '@/hooks/use-onboarding-wizard';
import { useTenantPrefill } from '@/hooks/use-tenant-prefill';
import { CLIENT_ONBOARDING_DEFAULTS, CLIENT_STEP_FIELDS, clientOnboardingSchema } from '@/schemas/client-onboarding';
import { finishOnboarding, parseClientProfile, saveClientProfile, type TenantSnapshot } from '@/services/tenant';
import type { ClientKind, ClientMetadata } from '@/types/onboarding';

// Steps in order. The first is a full-screen choice; the others share a progress header. The logo
// is part of the details step, at the top, like the web client profile.
const STEPS = [
  { key: 'type', title: 'Account type' },
  { key: 'identity', title: 'Details' },
  { key: 'contacts', title: 'Contacts' },
  { key: 'billing', title: 'Billing' },
  { key: 'sites', title: 'Sites' },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

// The account type step checks nothing: choosing a type is what moves on.
const fieldsOf = (key: StepKey) => (key === 'type' ? [] : CLIENT_STEP_FIELDS[key]);

const parseSaved = (tenant: TenantSnapshot, metadata: ClientMetadata) => parseClientProfile(tenant.profile, metadata);

/**
 * Client onboarding, shown instead of the home screen while the server says the tenant is still
 * "onboarding" (see _layout.tsx). Each step is checked before moving on; finishing saves the whole
 * profile with one request, after which the session refreshes and the app opens the client area.
 */
export default function OnboardingScreen() {
  const [logoBusy, setLogoBusy] = useState(false);
  const form = useApiForm({ schema: clientOnboardingSchema, defaultValues: CLIENT_ONBOARDING_DEFAULTS });
  const { metadata } = useClientMetadata();
  const kind = useWatch({ control: form.control, name: 'client_type' });

  const { photo: logo, setPhoto: setLogo } = useTenantPrefill({
    reset: form.reset,
    metadata,
    defaults: CLIENT_ONBOARDING_DEFAULTS,
    parse: parseSaved,
  });

  const wizard = useOnboardingWizard({
    form,
    steps: STEPS,
    fieldsOf,
    save: async (values) => {
      if (!metadata) return;
      await saveClientProfile(values, metadata);
      await finishOnboarding();
    },
  });

  if (wizard.current.key === 'type') {
    return (
      <ClientTypeStep
        progress={{ step: 0, total: wizard.total, title: STEPS[0].title }}
        selected={kind}
        onSelect={(selected: ClientKind) => {
          form.setValue('client_type', selected, { shouldValidate: true, shouldDirty: true });
          wizard.setStep(1);
        }}
      />
    );
  }

  const clientKind: ClientKind = kind ?? 'company';
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
      continueDisabled={key === 'identity' && logoBusy}
      finishDisabled={!metadata}>
      {key === 'identity' ? (
        <IdentityStep
          form={form}
          kind={clientKind}
          logo={<LogoField kind={clientKind} value={logo} onValueChange={setLogo} onBusyChange={setLogoBusy} />}
        />
      ) : null}
      {key === 'contacts' ? <ContactsStep form={form} /> : null}
      {key === 'billing' ? <BillingStep form={form} /> : null}
      {key === 'sites' ? <SitesStep form={form} /> : null}
    </OnboardingShell>
  );
}
