import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { z } from 'zod';

import { FormError } from '@/components/form/form-error';
import { FormTextField } from '@/components/form/form-fields';
import { Button } from '@/components/ui/button';
import { FormScrollView } from '@/components/ui/form-scroll-view';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { useApiForm } from '@/hooks/use-api-form';
import { ApiError } from '@/services/api';
import { requestPasswordReset } from '@/services/auth';

/** Wait before asking for another email, so the inbox isn't flooded. */
const RESEND_COOLDOWN_SECONDS = 60;

const schema = z.object({
  email: z.email('Enter a valid email, like name@example.com.'),
});

/** The server answers 404 when no account uses the email. */
function requestError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404) return new ApiError(404, 'No account uses this email. Check it and try again.');
    if (error.status === 0 || error.status === 408) {
      return new ApiError(error.status, "Couldn't reach GuardGo. Check your connection and try again.");
    }
  }
  return error;
}

/** Asks for a password reset email. The link in it opens the reset screen (`reset/[token]`). */
export default function ForgotPasswordScreen() {
  const form = useApiForm({ schema, defaultValues: { email: '' } });
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const onSubmit = form.submit(async ({ email }) => {
    try {
      await requestPasswordReset(email);
    } catch (error) {
      throw requestError(error);
    }
    setSentTo(email.trim());
    setCooldown(RESEND_COOLDOWN_SECONDS);
  });

  if (sentTo) {
    return (
      <Screen>
        <View className="flex-1 justify-center gap-6 p-6">
          <View className="gap-1.5">
            <Text variant="title" accessibilityRole="header">
              Check your email
            </Text>
            <Text tone="secondary">
              We sent a link to {sentTo}. Open it on this phone to choose a new password. Check your spam folder if it is not in your inbox.
            </Text>
          </View>
          <FormError message={form.serverError} />
          <View className="gap-3">
            <View className="flex-row flex-wrap items-center justify-center">
              <Text variant="small" tone="secondary">
                Didn&apos;t get the email?{' '}
              </Text>
              {cooldown > 0 || form.isSubmitting ? (
                <Text variant="label" tone="muted" accessibilityState={{ disabled: true }}>
                  {form.isSubmitting ? 'Sending…' : `Resend in ${cooldown}s`}
                </Text>
              ) : (
                <Pressable accessibilityRole="link" hitSlop={12} onPress={onSubmit} className="min-h-8 justify-center active:opacity-70">
                  <Text variant="label" tone="link">
                    Resend email
                  </Text>
                </Pressable>
              )}
            </View>
            <Button title="Back to sign in" size="lg" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FormScrollView contentContainerStyle={{ gap: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
        <View className="gap-1.5">
          <Text variant="display" accessibilityRole="header">
            Forgot password
          </Text>
          <Text tone="secondary">Enter your email and we will send you a link to choose a new password.</Text>
        </View>

        <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
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
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
          <FormError message={form.serverError} />
          <Button title="Send reset link" size="lg" className="mt-2" onPress={onSubmit} loading={form.isSubmitting} />
          <View className="flex-row flex-wrap items-center justify-center">
            <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.back()} className="active:opacity-70">
              <Text variant="label" tone="link">
                Back to sign in
              </Text>
            </Pressable>
          </View>
        </View>
      </FormScrollView>
    </Screen>
  );
}
