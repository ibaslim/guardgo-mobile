import { View } from 'react-native';

import { FormTextField } from '@/components/form/form-fields';
import type { ProviderForm } from '@/components/onboarding/provider/provider-form';
import { StepHeading } from '@/components/onboarding/step-heading';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';

/** The primary representative and a backup contact. Both need a name, an email and a phone. */
export function ContactsStep({ form }: { form: ProviderForm }) {
  return (
    <View className="gap-6">
      <StepHeading title="Contacts" description="Who we talk to about your company." />

      <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <View className="gap-1">
          <Text variant="heading">Primary representative</Text>
          <Text tone="secondary">Your single point of contact.</Text>
        </View>
        <FormTextField
          control={form.control}
          name="rep_name"
          label="Name"
          placeholder="Alex Morgan"
          hint="Letters and spaces only."
          icon={ICONS.user}
          autoCapitalize="words"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => form.setFocus('rep_email')}
        />
        <FormTextField
          control={form.control}
          name="rep_email"
          label="Email"
          placeholder="name@example.com"
          icon={ICONS.mail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => form.setFocus('rep_phone')}
        />
        <FormTextField
          control={form.control}
          name="rep_phone"
          label="Phone"
          placeholder="416 555 0123"
          hint="A Canadian number, 10 digits. Used as the company phone."
          keyboardType="phone-pad"
          autoComplete="tel"
          returnKeyType="done"
        />
      </View>

      <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <View className="gap-1">
          <Text variant="heading">Secondary contact</Text>
          <Text tone="secondary">A backup contact for urgent updates.</Text>
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
