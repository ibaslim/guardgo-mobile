import { useState } from 'react';
import { useWatch } from 'react-hook-form';

import { EditStepFailed, EditStepLoading, EditStepShell } from '@/components/account/edit-step-shell';
import { BillingStep } from '@/components/onboarding/client/billing-step';
import { ContactsStep } from '@/components/onboarding/client/contacts-step';
import { IdentityStep } from '@/components/onboarding/client/identity-step';
import { SitesStep } from '@/components/onboarding/client/sites-step';
import { LogoField } from '@/components/onboarding/logo-step';
import { CLIENT_PROFILE_STEPS, type ClientProfileStep } from '@/constants/profile-steps';
import { useApiForm } from '@/hooks/use-api-form';
import { useClientMetadata } from '@/hooks/use-client-metadata';
import { useStepSave } from '@/hooks/use-step-save';
import { useTenantPrefill } from '@/hooks/use-tenant-prefill';
import { CLIENT_ONBOARDING_DEFAULTS, CLIENT_STEP_FIELDS, clientOnboardingSchema } from '@/schemas/client-onboarding';
import { parseClientProfile, saveClientProfile, type TenantSnapshot } from '@/services/tenant';
import type { ClientKind, ClientMetadata } from '@/types/onboarding';

const fieldsOf = (key: string): readonly string[] => CLIENT_STEP_FIELDS[key as ClientProfileStep];

const parseSaved = (tenant: TenantSnapshot, metadata: ClientMetadata) => parseClientProfile(tenant.profile, metadata);

/**
 * One section of a client's saved profile (the same screen as its onboarding step), filled in with
 * what was saved, with a Save button.
 */
export function ClientStepEditor({ step }: { step: ClientProfileStep }) {
  const { metadata, failed, retry } = useClientMetadata();
  const [logoBusy, setLogoBusy] = useState(false);

  const form = useApiForm({ schema: clientOnboardingSchema, defaultValues: CLIENT_ONBOARDING_DEFAULTS });
  const kind = useWatch({ control: form.control, name: 'client_type' });

  const { tenant, photo: logo, setPhoto: setLogo } = useTenantPrefill({
    reset: form.reset,
    metadata,
    defaults: CLIENT_ONBOARDING_DEFAULTS,
    parse: parseSaved,
  });

  // An edit keeps the account's status ("active"); only the first save moves it out of onboarding.
  const { onSave, elsewhere } = useStepSave({
    form,
    step,
    steps: CLIENT_PROFILE_STEPS,
    fieldsOf,
    save: async (values) => {
      if (metadata) await saveClientProfile(values, metadata, tenant?.status);
    },
  });

  const title = CLIENT_PROFILE_STEPS.find((item) => item.key === step)?.title ?? 'Edit profile';

  if (failed) return <EditStepFailed title={title} onRetry={retry} />;
  if (!metadata || !tenant) return <EditStepLoading title={title} />;

  const clientKind: ClientKind = kind ?? 'company';

  return (
    <>
      <EditStepShell
        title={title}
        onSave={onSave}
        saving={form.isSubmitting}
        disabled={logoBusy}
        serverError={form.serverError}
        notice={elsewhere ?? (logoBusy ? 'Uploading… you can save when it is done.' : undefined)}>
        {step === 'identity' ? (
          <IdentityStep
            form={form}
            kind={clientKind}
            logo={<LogoField kind={clientKind} value={logo} onValueChange={setLogo} onBusyChange={setLogoBusy} />}
          />
        ) : null}
        {step === 'contacts' ? <ContactsStep form={form} /> : null}
        {step === 'billing' ? <BillingStep form={form} /> : null}
        {step === 'sites' ? <SitesStep form={form} /> : null}
      </EditStepShell>
    </>
  );
}
