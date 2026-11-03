import type { ReactNode } from 'react';
import { View } from 'react-native';

import { FormDateField, FormTextField } from '@/components/form/form-fields';
import type { GuardForm } from '@/components/onboarding/guard/guard-form';
import { StepHeading } from '@/components/onboarding/step-heading';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';

/** Who the guard is and how to reach them: photo, name, birth date, phones, and a backup contact. */
export function YouStep({ form, photo }: { form: GuardForm; photo: ReactNode }) {
  return (
    <View className="gap-6">
      <StepHeading title="Tell us about you" description="Use your name as it appears on your ID." />

      {photo}

      <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <FormTextField
          control={form.control}
          name="full_name"
          label="Full name"
          placeholder="Alex Morgan"
          hint="Letters and spaces only."
          icon={ICONS.user}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => form.setFocus('mobile_phone')}
        />
        <FormDateField
          control={form.control}
          name="date_of_birth"
          label="Date of birth"
          placeholder="Select date"
          maximumDate={new Date()}
        />
        <FormTextField
          control={form.control}
          name="mobile_phone"
          label="Mobile phone"
          placeholder="416 555 0123"
          hint="A Canadian number, 10 digits. Give a mobile or a landline, or both."
          keyboardType="phone-pad"
          autoComplete="tel"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => form.setFocus('landline_phone')}
        />
        <FormTextField
          control={form.control}
          name="landline_phone"
          label="Landline phone"
          optional
          placeholder="416 555 0123"
          keyboardType="phone-pad"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => form.setFocus('secondary_name')}
        />
      </View>

      <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <View className="gap-1">
          <Text variant="heading">Secondary contact</Text>
          <Text tone="secondary">Someone we can reach for urgent updates.</Text>
        </View>
        <FormTextField
          control={form.control}
          name="secondary_name"
          label="Name"
          placeholder="Sam Morgan"
          icon={ICONS.user}
          autoCapitalize="words"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => form.setFocus('secondary_email')}
        />
        <FormTextField
          control={form.control}
          name="secondary_email"
          label="Email"
          placeholder="name@example.com"
          icon={ICONS.mail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => form.setFocus('secondary_phone')}
        />
        <FormTextField
          control={form.control}
          name="secondary_phone"
          label="Phone"
          placeholder="416 555 0123"
          hint="A Canadian number, 10 digits."
          keyboardType="phone-pad"
          returnKeyType="done"
        />
      </View>
    </View>
  );
}
