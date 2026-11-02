import type { ReactNode } from 'react';
import { View } from 'react-native';

import { FormTextField } from '@/components/form/form-fields';
import { StepHeading } from '@/components/onboarding/step-heading';
import type { OnboardingForm } from '@/components/onboarding/onboarding-types';
import type { ClientKind } from '@/types/onboarding';

/** Who the client is: an optional logo or photo, then a person's full name or a company's legal details. */
export function IdentityStep({ form, kind, logo }: { form: OnboardingForm; kind: ClientKind; logo?: ReactNode }) {
  const company = kind === 'company';

  return (
    <View className="gap-6">
      <StepHeading
        title={company ? 'Tell us about your company' : 'Tell us about you'}
        description={company ? 'Use the details on your business registration.' : 'Use your name as it appears on your ID.'}
      />

      {logo}

      <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <FormTextField
          control={form.control}
          name="legal_entity_name"
          label={company ? 'Legal entity name' : 'Full name'}
          placeholder={company ? 'Maple Leaf Logistics Inc' : 'Alex Morgan'}
          hint={company ? undefined : 'Letters and spaces only.'}
          autoCapitalize="words"
          autoComplete={company ? 'organization' : 'name'}
          returnKeyType={company ? 'next' : 'done'}
          submitBehavior={company ? 'submit' : undefined}
          onSubmitEditing={company ? () => form.setFocus('industry') : undefined}
        />
        {company ? (
          <>
            <FormTextField
              control={form.control}
              name="industry"
              label="Industry"
              placeholder="Retail"
              hint="Your business sector. Letters and spaces only."
              autoCapitalize="words"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => form.setFocus('company_registration_number')}
            />
            <FormTextField
              control={form.control}
              name="company_registration_number"
              label="Registration number"
              placeholder="e.g. 123456789"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => form.setFocus('company_website')}
            />
            <FormTextField
              control={form.control}
              name="company_website"
              label="Website"
              optional
              placeholder="example.com"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => form.setFocus('tax_vat_number')}
            />
            <FormTextField
              control={form.control}
              name="tax_vat_number"
              label="Tax or VAT number"
              optional
              placeholder="e.g. 123456789RT0001"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
            />
          </>
        ) : null}
      </View>
    </View>
  );
}
