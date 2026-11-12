import type { ReactNode } from 'react';
import { View } from 'react-native';

import { FormWheelDateField, FormTextField } from '@/components/form/form-fields';
import type { ProviderForm } from '@/components/onboarding/provider/provider-form';
import { StepHeading } from '@/components/onboarding/step-heading';
import { ICONS } from '@/constants/icons';

/** The company: logo, names, registration number and optional details. */
export function CompanyStep({ form, logo }: { form: ProviderForm; logo: ReactNode }) {
  return (
    <View className="gap-6">
      <StepHeading title="Your company" description="The registration details of your security company." />

      {logo}

      <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <FormTextField
          control={form.control}
          name="legal_company_name"
          label="Legal company name"
          placeholder="Northern Shield Security Ltd"
          icon={ICONS.building}
          autoCapitalize="words"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => form.setFocus('trading_name')}
        />
        <FormTextField
          control={form.control}
          name="trading_name"
          label="Trading name"
          optional
          autoCapitalize="words"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => form.setFocus('corporation_number')}
        />
        <FormTextField
          control={form.control}
          name="corporation_number"
          label="Corporation number"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => form.setFocus('tax_number')}
        />
        <FormWheelDateField
          control={form.control}
          name="established_on"
          label="Date of establishment"
          optional
          placeholder="Select date"
          maximumDate={new Date()}
        />
        <FormTextField
          control={form.control}
          name="tax_number"
          label="Tax registration number"
          optional
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => form.setFocus('website')}
        />
        <FormTextField
          control={form.control}
          name="website"
          label="Company website"
          optional
          placeholder="example.com"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}
