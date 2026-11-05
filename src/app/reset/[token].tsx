import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { z } from 'zod';

import { FormError } from '@/components/form/form-error';
import { FormPasswordField } from '@/components/form/form-fields';
import { Button } from '@/components/ui/button';
import { FormScrollView } from '@/components/ui/form-scroll-view';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useApiForm } from '@/hooks/use-api-form';
import { ApiError } from '@/services/api';
import { getResetContext, resetPassword } from '@/services/auth';

const schema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirm_password: z.string().min(1, 'Re-enter your password.'),
  })
  .refine((values) => values.password === values.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  });

type Status =
  | { state: 'checking' }
  | { state: 'ready'; email: string }
  | { state: 'invalid'; message: string }
  | { state: 'done' };

const OFFLINE_MESSAGE = "Couldn't reach GuardGo. Check your connection and try again.";

function networkProblem(error: unknown) {
  return error instanceof ApiError && (error.status === 0 || error.status === 408);
}

function contextErrorMessage(error: unknown) {
  if (networkProblem(error)) return OFFLINE_MESSAGE;
  if (error instanceof ApiError) {
    if (error.status === 404) return 'This reset link is not valid.';
    if (error.status === 400) return error.message || 'This reset link has expired. Ask for a new one.';
  }
  return 'Something went wrong. Please try again later.';
}

/**
 * Opened by `guardgomobile://reset/<token>`, the link the reset email's web page redirects to.
 * The user chooses a new password, then signs in as usual.
 */
export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [status, setStatus] = useState<Status>({ state: 'checking' });
  const form = useApiForm({ schema, defaultValues: { password: '', confirm_password: '' } });

  useEffect(() => {
    let cancelled = false;
    getResetContext(token)
      .then((context) => {
        if (cancelled) return;
        // An invited guard who never activated has to use the invite link: it also sets their username.
        if (context.invite_pending) {
          setStatus({
            state: 'invalid',
            message: 'This account is not activated yet. Use the invite link from your email to set it up.',
          });
          return;
        }
        setStatus({ state: 'ready', email: context.email });
      })
      .catch((error) => !cancelled && setStatus({ state: 'invalid', message: contextErrorMessage(error) }));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = form.submit(async ({ password }) => {
    try {
      await resetPassword(token, password);
    } catch (error) {
      if (networkProblem(error)) throw new ApiError(0, OFFLINE_MESSAGE);
      throw error;
    }
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
              {done ? 'Password updated' : 'Reset link unavailable'}
            </Text>
            <Text tone="secondary">{done ? 'Sign in with your new password to continue.' : status.message}</Text>
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
            New password
          </Text>
          <Text tone="secondary">Choose a new password for {status.email}.</Text>
        </View>

        <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <FormPasswordField
            control={form.control}
            name="password"
            label="New password"
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
          <Button title="Update password" size="lg" className="mt-2" onPress={onSubmit} loading={form.isSubmitting} />
        </View>
      </FormScrollView>
    </Screen>
  );
}
