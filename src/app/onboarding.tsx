import { useEffect, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { useWatch } from 'react-hook-form';

import { FormError } from '@/components/form/form-error';
import { BillingStep } from '@/components/onboarding/billing-step';
import { ClientTypeStep } from '@/components/onboarding/client-type-step';
import { ContactsStep } from '@/components/onboarding/contacts-step';
import { IdentityStep } from '@/components/onboarding/identity-step';
import { LogoField } from '@/components/onboarding/logo-step';
import { SitesStep } from '@/components/onboarding/sites-step';
import { StepProgress } from '@/components/onboarding/step-progress';
import { Button } from '@/components/ui/button';
import { Entrance } from '@/components/ui/entrance';
import { FormScrollView } from '@/components/ui/form-scroll-view';
import { Screen } from '@/components/ui/screen';
import { useApiForm } from '@/hooks/use-api-form';
import { useClientMetadata } from '@/hooks/use-client-metadata';
import { CLIENT_ONBOARDING_DEFAULTS, CLIENT_STEP_FIELDS, clientOnboardingSchema } from '@/schemas/client-onboarding';
import {
  fetchTenantLogo,
  finishOnboarding,
  getTenant,
  parseClientProfile,
  saveClientProfile,
  type TenantImage,
  type TenantSnapshot,
} from '@/services/tenant';
import type { ClientKind } from '@/types/onboarding';

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

const LAST_STEP = STEPS.length - 1;
const stepIndex = (key: StepKey) => STEPS.findIndex((step) => step.key === key);

// Steps whose fields are validated before moving on.
const VALIDATED_STEPS = ['identity', 'contacts', 'billing', 'sites'] as const;

/**
 * Client onboarding, shown instead of the home screen while the server says the tenant is still
 * "onboarding" (see _layout.tsx). Each step is checked before moving on; finishing saves the whole
 * profile with one request, after which the session refreshes and the app opens the client area.
 */
export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [logo, setLogo] = useState<TenantImage | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [tenant, setTenant] = useState<TenantSnapshot | null>(null);
  const prefilled = useRef(false);
  const form = useApiForm({ schema: clientOnboardingSchema, defaultValues: CLIENT_ONBOARDING_DEFAULTS });
  const { metadata } = useClientMetadata();
  const kind = useWatch({ control: form.control, name: 'client_type' });

  // Whatever was saved earlier (for example on the web) shows up in the form and the logo field.
  useEffect(() => {
    let active = true;
    getTenant()
      .then(async (saved) => {
        if (!active) return;
        setTenant(saved);
        const existing = await fetchTenantLogo(saved.id);
        if (active && existing) setLogo((current) => current ?? existing);
      })
      .catch(() => {
        // Nothing to pre-fill: the user fills the form in.
      });
    return () => {
      active = false;
    };
  }, []);

  // The city is matched against the server's list, so wait for it too. Fields the user already
  // changed are kept.
  useEffect(() => {
    if (!tenant || !metadata || prefilled.current) return;
    prefilled.current = true;
    const saved = parseClientProfile(tenant.profile, metadata);
    if (saved) form.reset({ ...CLIENT_ONBOARDING_DEFAULTS, ...saved }, { keepDirtyValues: true });
  }, [tenant, metadata, form]);

  // The phone's back button goes to the previous step instead of leaving the flow.
  useEffect(() => {
    if (step === 0) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setStep((current) => Math.max(current - 1, 0));
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  const current = STEPS[step];

  async function onContinue() {
    if (current.key !== 'type') {
      const valid = await form.trigger([...CLIENT_STEP_FIELDS[current.key]], { shouldFocus: true });
      if (!valid) return;
    }
    setStep(step + 1);
  }

  const save = form.submit(async (values) => {
    if (!metadata) return;
    await saveClientProfile(values, metadata);
    await finishOnboarding();
  });

  async function onFinish() {
    await save();
    // A server error for a field on an earlier step would be invisible here: go to that step.
    const failed = VALIDATED_STEPS.find((key) => CLIENT_STEP_FIELDS[key].some((name) => form.getFieldState(name).error));
    if (failed && failed !== STEPS[LAST_STEP].key) setStep(stepIndex(failed));
  }

  if (step === 0) {
    return (
      <ClientTypeStep
        progress={{ step: 0, total: STEPS.length, title: STEPS[0].title }}
        selected={kind}
        onSelect={(selected: ClientKind) => {
          form.setValue('client_type', selected, { shouldValidate: true, shouldDirty: true });
          setStep(1);
        }}
      />
    );
  }

  const clientKind: ClientKind = kind ?? 'company';
  const last = step === LAST_STEP;

  return (
    <Screen>
      <StepProgress step={step} total={STEPS.length} title={current.title} onBack={() => setStep(step - 1)} />
      <FormScrollView contentContainerStyle={{ flexGrow: 1, gap: 24, padding: 24, paddingBottom: 32 }}>
        <Entrance key={current.key}>
          {current.key === 'identity' ? (
            <IdentityStep
              form={form}
              kind={clientKind}
              logo={<LogoField kind={clientKind} value={logo} onValueChange={setLogo} onBusyChange={setLogoBusy} />}
            />
          ) : null}
          {current.key === 'contacts' ? <ContactsStep form={form} /> : null}
          {current.key === 'billing' ? <BillingStep form={form} /> : null}
          {current.key === 'sites' ? <SitesStep form={form} /> : null}
        </Entrance>

        {last ? <FormError message={form.serverError} /> : null}

        <View className="flex-1 justify-end">
          {last ? (
            <Button title="Finish setup" size="lg" onPress={onFinish} loading={form.isSubmitting} disabled={!metadata} />
          ) : (
            <Button title="Continue" size="lg" onPress={onContinue} disabled={current.key === 'identity' && logoBusy} />
          )}
        </View>
      </FormScrollView>
    </Screen>
  );
}
