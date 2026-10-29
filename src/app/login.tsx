import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { ApiError, getApiUrl } from '@/services/api';
import { AuthError, login } from '@/services/auth';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [server, setServer] = useState(getApiUrl);

  // The server may have changed on the IP Config screen.
  useFocusEffect(
    useCallback(() => {
      setServer(getApiUrl());
    }, [])
  );

  const canSubmit = username.trim().length > 0 && password.length > 0;

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
      // On success the session guard in _layout.tsx switches to the home screen.
    } catch (e) {
      setError(e instanceof ApiError || e instanceof AuthError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="grow justify-center gap-6 p-6" keyboardShouldPersistTaps="handled">
          <View className="gap-1">
            <Text variant="title">GuardGo</Text>
            <Text tone="muted">Sign in to continue.</Text>
          </View>

          <View className="gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
            <TextField
              label="Username or email"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => canSubmit && submit()}
            />

            {error ? (
              <View className="rounded-md bg-danger-soft p-3" accessibilityLiveRegion="polite">
                <Text variant="small" tone="inherit" className="text-danger-soft-content">
                  {error}
                </Text>
              </View>
            ) : null}

            <Button title="Sign in" onPress={submit} loading={busy} disabled={!canSubmit} />
          </View>

          <View className="items-center gap-3">
            <Text variant="caption" tone="muted" numberOfLines={1}>
              Server: {server || 'not set'}
            </Text>
            <Button title="IP Config" variant="secondary" className="self-stretch" onPress={() => router.push('/server-config')} />
            <View className="self-stretch">
              <ThemeSwitcher />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
