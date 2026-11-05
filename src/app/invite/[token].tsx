import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { z } from 'zod';

import { FormError } from '@/components/form/form-error';
import { FormPasswordField, FormTextField } from '@/components/form/form-fields';
import { Button } from '@/components/ui/button';
import { FormScrollView } from '@/components/ui/form-scroll-view';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { useApiForm } from '@/hooks/use-api-form';
import { ApiError } from '@/services/api';
import { activateInvite, getInviteContext } from '@/services/auth';

const schema = z
  .object({
    full_name: z.string().trim().min(1, 'Enter your full name.'),
    username: z
      .string()
      .trim()
      .regex(/^[A-Za-z][A-Za-z0-9_-]{7,19}$/, 'Use 8-20 letters, numbers, - or _, starting with a letter.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirm_password: z.string().min(1, 'Re-enter your password.'),
  })
  .refine((values) => values.password === values.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  });

type Status = { state: 'checking' } | { state: 'ready'; email: string } | { state: 'invalid'; message: string } | { state: 'done' };

function contextErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'This invite link is not valid.';
    if (error.status === 400) return error.message || 'This invite link has expired.';
    if (error.status === 0 || error.status === 408) return "Couldn't reach GuardGo. Check your connection and try again.";
  }
  return 'Something went wrong. Please try again later.';
}

/**
 * Opened by `guardgomobile://invite/<token>`, the link the invite web page redirects to. The guard
 * picks a username and password to finish the account, then signs in as usual.
 */
export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [status, setStatus] = useState<Status>({ state: 'checking' });
  const form = useApiForm({
    schema,
    defaultValues: { full_name: '', username: '', password: '', confirm_password: '' },
  });

  useEffect(() => {
    let cancelled = false;
    getInviteContext(token)
      .then((context) => {
        if (cancelled) return;
        if (!context.invite_pending) {
          setStatus({ state: 'invalid', message: 'This invite link has already been used.' });
          return;
        }
        if (context.full_name) form.setValue('full_name', context.full_name);
        setStatus({ state: 'ready', email: context.email });
      })
      .catch((error) => !cancelled && setStatus({ state: 'invalid', message: contextErrorMessage(error) }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onSubmit = form.submit(async ({ confirm_password: _confirm, ...values }) => {
    await activateInvite({ token, ...values });
    setStatus({ state: 'done' });
  });

  if (status.state === 'checking') {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (status.state === 'invalid' || status.state === 'done') {
    const done = status.state === 'done';
    return (
      <Screen>
        <View className="flex-1 justify-center gap-6 p-6">
          <View className="gap-1.5">
            <Text variant="title" accessibilityRole="header">
              {done ? 'Account ready' : 'Invite unavailable'}
            </Text>
            <Text tone="secondary">
              {done ? 'Sign in with your new username and password to continue.' : status.message}
            </Text>
          </View>
          <Button title="Go to sign in" size="lg" onPress={() => router.replace('/login')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FormScrollView contentContainerStyle={{ gap: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
        <View className="gap-1.5">
          <Text variant="display" accessibilityRole="header">
            You&apos;re invited
          </Text>
          <Text tone="secondary">Set up your GuardGo account for {status.email}.</Text>
        </View>

        <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <FormTextField
            control={form.control}
            name="full_name"
            label="Full name"
            placeholder="Your full name"
            icon={ICONS.user}
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => form.setFocus('username')}
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
          <Button title="Activate account" size="lg" className="mt-2" onPress={onSubmit} loading={form.isSubmitting} />
        </View>
      </FormScrollView>
    </Screen>
  );
}
