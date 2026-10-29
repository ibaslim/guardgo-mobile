/**
 * Development-only preview of the form components (opened from the Account tab in dev builds).
 * Submitting shows a fake server validation error, to check how server errors look.
 */
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { z } from 'zod';

import { FormError } from '@/components/form/form-error';
import {
  FormDateField,
  FormImageField,
  FormPasswordField,
  FormSelect,
  FormTextField,
  FormTimeField,
} from '@/components/form/form-fields';
import { Button, type ButtonVariant } from '@/components/ui/button';
import { FormScrollView } from '@/components/ui/form-scroll-view';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { useApiForm } from '@/hooks/use-api-form';
import { ApiError } from '@/services/api';

const SITES = [
  { value: 'north-gate', label: 'North Gate', description: 'Main entrance, 24/7' },
  { value: 'warehouse', label: 'Warehouse B', description: 'Loading docks' },
  { value: 'lobby', label: 'Head office lobby', description: 'Reception desk' },
];

const GUARDS = [
  'Amina Yusuf', 'Bilal Ahmed', 'Carlos Mendes', 'Daniel Okafor', 'Elena Petrova', 'Farah Khan', 'George Liu',
  'Hassan Ali', 'Imran Shah', 'Julia Novak', 'Kwame Mensah', 'Lina Haddad', 'Marco Rossi', 'Nadia Rahman',
].map((name) => ({ value: name.toLowerCase().replace(/\s/g, '-'), label: name }));

const schema = z.object({
  title: z.string().trim().min(3, 'Enter at least 3 characters.'),
  email: z.email('Enter a valid email, like name@example.com.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
  date: z.date({ error: 'Choose a date.' }).nullable().refine((value) => value !== null, 'Choose a date.'),
  time: z.date().nullable().refine((value) => value !== null, 'Choose a start time.'),
  site: z.string().nullable().refine((value) => value !== null, 'Choose a site.'),
  guard: z.string().nullable(),
  photo: z.custom<{ uri: string }>().nullable(),
  notes: z.string().max(200, 'Keep notes under 200 characters.'),
});

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'info', 'outline', 'success', 'warning', 'danger', 'link'];

export default function FormPreviewScreen() {
  const form = useApiForm({
    schema,
    defaultValues: { title: '', email: '', password: '', date: null, time: null, site: null, guard: null, photo: null, notes: '' },
  });

  if (!__DEV__) return <Redirect href="/" />;

  const onSubmit = form.submit(async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    throw new ApiError(422, 'Validation failed', {
      email: 'This email is already registered.',
      shift_code: 'Shift code is not valid for this site.',
    });
  });

  return (
    <View className="flex-1 bg-background">
      <FormScrollView contentContainerStyle={{ gap: 32, padding: 20, paddingBottom: 64 }}>
        <View className="gap-3">
          <Text variant="heading">Buttons</Text>
          <View className="flex-row flex-wrap gap-2">
            {VARIANTS.map((variant) => (
              <Button key={variant} title={variant} variant={variant} size="sm" />
            ))}
          </View>
          <Button title="Save shift" icon={ICONS.check} size="lg" />
          <View className="flex-row gap-2">
            <Button title="Disabled" disabled className="flex-1" />
            <Button title="Loading" loading className="flex-1" />
          </View>
        </View>

        <View className="gap-5">
          <Text variant="heading">Form</Text>
          <FormError message={form.serverError} />
          <FormTextField control={form.control} name="title" label="Shift title" placeholder="Night patrol" />
          <FormTextField
            control={form.control}
            name="email"
            label="Contact email"
            icon={ICONS.mail}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            hint="Submit the form to see a server error here."
          />
          <FormPasswordField control={form.control} name="password" label="Password" autoComplete="new-password" />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormDateField control={form.control} name="date" label="Date" minimumDate={new Date()} />
            </View>
            <View className="flex-1">
              <FormTimeField control={form.control} name="time" label="Start time" />
            </View>
          </View>
          <FormSelect control={form.control} name="site" label="Site" icon={ICONS.location} options={SITES} placeholder="Choose a site" />
          <FormSelect
            control={form.control}
            name="guard"
            label="Guard"
            icon={ICONS.user}
            options={GUARDS}
            optional
            searchable
            placeholder="Choose a guard"
            searchPlaceholder="Search guards"
          />
          <FormImageField control={form.control} name="photo" label="Site photo" optional aspect={[4, 3]} />
          <FormTextField
            control={form.control}
            name="notes"
            label="Notes"
            optional
            multiline
            placeholder="Access codes, parking, who to report to"
          />
          <Button title="Create shift" onPress={onSubmit} loading={form.isSubmitting} />
        </View>
      </FormScrollView>
    </View>
  );
}
