import { View } from 'react-native';

import { FormTextField } from '@/components/form/form-fields';
import { StepHeading } from '@/components/onboarding/step-heading';
import type { OnboardingForm } from '@/components/onboarding/onboarding-types';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';

type ContactCardProps = { form: OnboardingForm; contact: 'primary' | 'secondary'; title: string; next?: 'secondary_name' };

function ContactCard({ form, contact, title, next }: ContactCardProps) {
  return (
    <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <Text variant="heading">{title}</Text>
      <FormTextField
        control={form.control}
        name={`${contact}_name`}
        label="Name"
        placeholder="Alex Morgan"
        icon={ICONS.user}
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => form.setFocus(`${contact}_email`)}
      />
      <FormTextField
        control={form.control}
        name={`${contact}_email`}
        label="Email"
        placeholder="name@example.com"
        icon={ICONS.mail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => form.setFocus(`${contact}_phone`)}
      />
      <FormTextField
        control={form.control}
        name={`${contact}_phone`}
        label="Phone"
        placeholder="416 555 0123"
        hint="A Canadian number, 10 digits."
        keyboardType="phone-pad"
        autoComplete="tel"
        returnKeyType={next ? 'next' : 'done'}
        submitBehavior={next ? 'submit' : undefined}
        onSubmitEditing={next ? () => form.setFocus(next) : undefined}
      />
    </View>
  );
}

/** Two people we can reach: a primary and a secondary contact. */
export function ContactsStep({ form }: { form: OnboardingForm }) {
  return (
    <View className="gap-6">
      <StepHeading
        title="Who can we contact?"
        description="We reach out about requests and billing. Both contacts are required."
      />
      <ContactCard form={form} contact="primary" title="Primary contact" next="secondary_name" />
      <ContactCard form={form} contact="secondary" title="Secondary contact" />
    </View>
  );
}
