import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { z } from 'zod';

import { FormError } from '@/components/form/form-error';
import { FormPasswordField, FormSelect, FormTextField } from '@/components/form/form-fields';
import { Button } from '@/components/ui/button';
import { FormScrollView } from '@/components/ui/form-scroll-view';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { useApiForm } from '@/hooks/use-api-form';
import { register, setVerificationCredentials } from '@/services/auth';
import type { TenantType } from '@/types/auth';

const ACCOUNT_TYPES: readonly { value: TenantType; label: string; description: string }[] = [
  { value: 'client', label: 'Client', description: 'Request guards for your sites' },
  { value: 'guard', label: 'Guard', description: 'Find and work security jobs' },
  { value: 'service_provider', label: 'Service provider', description: 'Supply guards to clients' },
];

const schema = z
  .object({
    username: z.string().trim().min(3, 'Use at least 3 characters.'),
    email: z.email('Enter a valid email, like name@example.com.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirm_password: z.string().min(1, 'Re-enter your password.'),
    tenant_type: z
      .enum(['client', 'guard', 'service_provider'])
      .nullable()
      .refine((value) => value !== null, 'Choose an account type.'),
  })
  .refine((values) => values.password === values.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  });

export default function RegisterScreen() {
  const [created, setCreated] = useState(false);
  const form = useApiForm({
    schema,
    defaultValues: { username: '', email: '', password: '', confirm_password: '', tenant_type: null },
  });

  // The confirmation is checked here only; the server gets just the payload fields.
  const onSubmit = form.submit(async ({ confirm_password: _confirm, tenant_type, ...values }) => {
    await register({ ...values, tenant_type: tenant_type as TenantType });
    // Clients and guards confirm their email first (link in the mail).
    if (tenant_type === 'client' || tenant_type === 'guard') {
      setVerificationCredentials({ username: values.username, email: values.email, password: values.password });
      router.replace({ pathname: '/verify-email', params: { email: values.email } });
      return;
    }
    setCreated(true);
  });

  if (created) {
    return (
      <Screen edges={['bottom']}>
        <View className="flex-1 justify-center gap-6 p-6">
          <View className="gap-1.5">
            <Text variant="title" accessibilityRole="header">
              Account created
            </Text>
            <Text tone="secondary">Sign in with your new username and password to continue.</Text>
          </View>
          <Button title="Go to sign in" size="lg" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <FormScrollView contentContainerStyle={{ gap: 16, padding: 24 }}>
        <Text tone="muted">Create a GuardGo account.</Text>

        <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <FormSelect
            control={form.control}
            name="tenant_type"
            label="Account type"
            icon={ICONS.shield}
            options={ACCOUNT_TYPES}
            placeholder="Account Type"
          />
          <FormTextField
            control={form.control}
            name="username"
            label="Username"
            placeholder="Choose a username"
            icon={ICONS.user}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username-new"
            textContentType="username"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => form.setFocus('email')}
          />
          <FormTextField
            control={form.control}
            name="email"
            label="Email"
            placeholder="name@example.com"
            icon={ICONS.mail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => form.setFocus('password')}
          />
          <FormPasswordField
            control={form.control}
            name="password"
            label="Password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => form.setFocus('confirm_password')}
          />
          <FormPasswordField
            control={form.control}
            name="confirm_password"
            label="Confirm password"
            placeholder="Re-enter your password"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
          <FormError message={form.serverError} />
          <Button title="Create account" size="lg" className="mt-2" onPress={onSubmit} loading={form.isSubmitting} />
          <View className="flex-row flex-wrap items-center justify-center">
            <Text variant="small" tone="secondary">
              Already have an account?{' '}
            </Text>
            <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.back()} className="active:opacity-70">
              <Text variant="label" tone="link">
                Sign in now
              </Text>
            </Pressable>
          </View>
        </View>
      </FormScrollView>
    </Screen>
  );
}
