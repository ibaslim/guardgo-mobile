import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FormScrollView } from '@/components/ui/form-scroll-view';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useIsLoggedIn } from '@/hooks/use-session';
import { ApiError, DEFAULT_API_URL, getApiUrl } from '@/services/api';
import { logout } from '@/services/auth';
import { resetServerUrl, saveServerUrl, testServer } from '@/services/server-config';
import { toast } from '@/services/toast';
import { normalizeServerUrl } from '@/utils/server-url';

export default function ServerConfigScreen() {
  const signedIn = useIsLoggedIn();
  const [address, setAddress] = useState(getApiUrl);
  const [inputError, setInputError] = useState<string | undefined>();
  const [busy, setBusy] = useState<'test' | 'save' | null>(null);

  function parseAddress() {
    const url = normalizeServerUrl(address);
    setInputError(url ? undefined : 'Enter an IP or host, e.g. 192.168.1.236:8080');
    return url;
  }

  async function check(url: string) {
    try {
      await testServer(url);
      toast.success(`Connected to ${url}`);
      return true;
    } catch (e) {
      const reason = e instanceof ApiError ? e.message : 'Unknown error';
      toast.failure(`Could not reach ${url}: ${reason}`);
      return false;
    }
  }

  async function onTest() {
    const url = parseAddress();
    if (!url) return;
    setBusy('test');
    await check(url);
    setBusy(null);
  }

  /** A session belongs to one server, so after switching servers a signed-in user signs in again. */
  async function leaveIfSwitched(previous: string) {
    if (!signedIn || getApiUrl() === previous) return false;
    await logout();
    router.replace('/login');
    return true;
  }

  async function save(url: string) {
    const previous = getApiUrl();
    await saveServerUrl(url);
    if (await leaveIfSwitched(previous)) return;
    toast.success('Server saved.');
    // Nothing to go back to when this screen was the first one opened (e.g. after a reload),
    // so fall back to the app's start instead of dispatching an unhandled GO_BACK.
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function onSave() {
    const url = parseAddress();
    if (!url) return;
    setBusy('save');
    const reachable = await check(url);
    setBusy(null);
    if (reachable) {
      await save(url);
      return;
    }
    Alert.alert('Server not reachable', `The app could not connect to ${url}. Save it anyway?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save anyway', onPress: () => save(url) },
    ]);
  }

  async function onReset() {
    const previous = getApiUrl();
    resetServerUrl();
    if (await leaveIfSwitched(previous)) return;
    setAddress(DEFAULT_API_URL);
    setInputError(undefined);
    toast.success('Server reset to default.');
  }

  return (
    <Screen edges={['bottom']}>
      <FormScrollView contentContainerStyle={{ gap: 16, padding: 24 }}>
        <Text tone="muted">Enter the API server&apos;s IP address and port. All app traffic will go to this server.</Text>
        {signedIn ? <Text tone="muted">Switching to another server signs you out.</Text> : null}

        <View className="gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
          <TextField
            label="Server address"
            value={address}
            onChangeText={setAddress}
            placeholder="192.168.1.236:8080"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={onTest}
            error={inputError}
          />

          <View className="gap-2">
            <Button
              title="Test connection"
              variant="secondary"
              onPress={onTest}
              loading={busy === 'test'}
              disabled={busy !== null}
            />
            <Button title="Save" onPress={onSave} loading={busy === 'save'} disabled={busy !== null} />
          </View>
        </View>

        {DEFAULT_API_URL ? (
          <View className="items-center">
            <Text variant="caption" tone="muted">
              Default: {DEFAULT_API_URL}
            </Text>
            <Button title="Reset to default" variant="link" onPress={onReset} disabled={busy !== null} />
          </View>
        ) : null}
      </FormScrollView>
    </Screen>
  );
}
