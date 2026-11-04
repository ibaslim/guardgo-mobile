import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { z } from 'zod';

import { FormError } from '@/components/form/form-error';
import { FormPasswordField, FormTextField } from '@/components/form/form-fields';
import { Button } from '@/components/ui/button';
import { FormScrollView } from '@/components/ui/form-scroll-view';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { FORM_SERVER_ERROR } from '@/constants/form';
import { ICONS } from '@/constants/icons';
import { useApiForm } from '@/hooks/use-api-form';
import { ApiError, getApiUrl } from '@/services/api';
import { AuthError, isAccountBlocked, isEmailVerificationPending, requestLogin, setVerificationCredentials, startSession } from '@/services/auth';

const schema = z.object({
  username: z.string().trim().min(1, 'Enter your username or email.'),
  password: z.string().min(1, 'Enter your password.'),
});

// Test account, prefilled in development builds only.
const DEFAULT_VALUES = __DEV__
  ? { username: 'guard1@gmail.com', password: '1qaz!QAZ' }
  : { username: '', password: '' };

export default function LoginScreen() {
  const [server, setServer] = useState(getApiUrl);
  const form = useApiForm({ schema, defaultValues: DEFAULT_VALUES });

  // The server may have changed on the IP Config screen.
  useFocusEffect(
    useCallback(() => {
      setServer(getApiUrl());
    }, [])
  );

  // Sign-in hand-off: the form slides down and fades, then the session starts and the home
  // screen builds in (see AreaHomeScreen).
  const reduceMotion = useReducedMotion();
  const leaving = useSharedValue(0);
  const contentStyle = useAnimatedStyle(() => ({
    opacity: 1 - leaving.get(),
    transform: [{ translateY: leaving.get() * 28 }],
  }));

  function playExit() {
    return new Promise<void>((resolve) => {
      leaving.set(
        withTiming(1, { duration: reduceMotion ? 0 : 220, easing: Easing.in(Easing.cubic) }, () => scheduleOnRN(resolve))
      );
    });
  }

  const onSubmit = form.submit(async ({ username, password }) => {
    try {
      const result = await requestLogin(username, password);
      await playExit();
      // The session guard in _layout.tsx then switches to the user's home screen.
      startSession(result);
    } catch (error) {
      if (error instanceof AuthError) {
        form.setError(`root.${FORM_SERVER_ERROR}`, { type: 'server', message: error.message });
        return;
      }
      // Registered but never confirmed the email: send them to the screen that can resend the link.
      if (isEmailVerificationPending(error)) {
        setVerificationCredentials({ username, password });
        router.push({ pathname: '/verify-email', params: { reason: 'sign-in', ...(username.includes('@') ? { email: username } : {}) } });
        return;
      }
      // Banned or blocked: signing in again won't help, so explain it on its own screen.
      if (isAccountBlocked(error)) {
        router.push('/account-blocked');
        return;
      }
      // The server only says "Invalid credentials".
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError(401, 'Wrong username or password. Check both and try again.');
      }
      throw error;
    }
  });

  return (
    <Screen>
      {/* Style props, not classes: this scroll view comes from react-native-keyboard-controller. */}
      <FormScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
        <Animated.View style={[{ flexGrow: 1, gap: 40 }, contentStyle]}>
          {/* The form sits low on the screen, within reach of a thumb. */}
          <View className="flex-1 justify-end gap-8">
            <View className="gap-5">
              <View className="size-14 items-center justify-center rounded-2xl bg-primary" accessible={false}>
                <Icon icon={ICONS.shield} size={30} colorVar="--color-on-primary" />
              </View>
              <View className="gap-1.5">
                <Text variant="display" accessibilityRole="header">
                  Sign in
                </Text>
                <Text tone="secondary">Sign in to your GuardGo account.</Text>
              </View>
            </View>

            <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
              <FormTextField
                control={form.control}
                name="username"
                label="Username or email"
                icon={ICONS.user}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => form.setFocus('password')}
              />
              <FormPasswordField
                control={form.control}
                name="password"
                label="Password"
                returnKeyType="go"
                onSubmitEditing={onSubmit}
              />
              <FormError message={form.serverError} />
              <Button title="Sign in" size="lg" className="mt-2" onPress={onSubmit} loading={form.isSubmitting} />
              <View className="flex-row flex-wrap items-center justify-center">
                <Text variant="small" tone="secondary">
                  Don&apos;t have an account?{' '}
                </Text>
                <Pressable
                  accessibilityRole="link"
                  hitSlop={8}
                  onPress={() => router.push('/register')}
                  className="active:opacity-70">
                  <Text variant="label" tone="link">
                    Create one now
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View className="gap-3">
            <View className="rounded-xl border border-border bg-surface px-4 py-1 shadow-sm">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Server: ${server || 'not set'}`}
                accessibilityHint="Opens IP Config to change the server"
                onPress={() => router.push('/server-config')}
                className="min-h-12 flex-row items-center gap-3 rounded-md active:opacity-70">
                <Icon icon={ICONS.server} size={20} tone={server ? 'muted' : 'danger'} />
                <View className="flex-1">
                  <Text variant="caption" tone="muted">
                    Server
                  </Text>
                  <Text variant="small" tone={server ? 'secondary' : 'inherit'} className={server ? '' : 'text-field-error'} numberOfLines={1}>
                    {server || 'Not set. Add one to sign in.'}
                  </Text>
                </View>
                <Text variant="label" tone="link">
                  Change
                </Text>
              </Pressable>
            </View>
            <View className="rounded-xl border border-border bg-surface p-3 shadow-sm">
              <ThemeSwitcher />
            </View>
          </View>
        </Animated.View>
      </FormScrollView>
    </Screen>
  );
}
