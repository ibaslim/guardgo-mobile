import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FormScrollView } from '@/components/ui/form-scroll-view';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { ApiError, DEFAULT_API_URL, getApiUrl } from '@/services/api';
import { resetServerUrl, saveServerUrl, testServer } from '@/services/server-config';
import type { ConnectionStatus } from '@/types/server-config';
import { normalizeServerUrl } from '@/utils/server-url';

export default function ServerConfigScreen() {
  const [address, setAddress] = useState(getApiUrl);
  const [inputError, setInputError] = useState<string | undefined>();
  const [status, setStatus] = useState<ConnectionStatus>({ kind: 'idle' });
  const [busy, setBusy] = useState<'test' | 'save' | null>(null);

  function parseAddress() {
    const url = normalizeServerUrl(address);
    setInputError(url ? undefined : 'Enter an IP or host, e.g. 192.168.1.236:8080');
    return url;
  }

  async function check(url: string) {
    try {
      await testServer(url);
      setStatus({ kind: 'ok', message: `Connected to ${url}` });
      return true;
    } catch (e) {
      const reason = e instanceof ApiError ? e.message : 'Unknown error';
      setStatus({ kind: 'error', message: `Could not reach ${url}: ${reason}` });
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

  async function save(url: string) {
    await saveServerUrl(url);
    router.back();
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

  function onReset() {
    resetServerUrl();
    setAddress(DEFAULT_API_URL);
    setInputError(undefined);
    setStatus({ kind: 'idle' });
  }

  return (
    <Screen edges={['bottom']}>
      <FormScrollView contentContainerStyle={{ gap: 16, padding: 24 }}>
        <Text tone="muted">Enter the API server&apos;s IP address and port. All app traffic will go to this server.</Text>

        <View className="gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
          <TextField
            label="Server address"
            value={address}
            onChangeText={(text) => {
              setAddress(text);
              setStatus({ kind: 'idle' });
            }}
            placeholder="192.168.1.236:8080"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={onTest}
            error={inputError}
          />

          {status.kind !== 'idle' ? (
            <View
              className={`rounded-md p-3 ${status.kind === 'ok' ? 'bg-surface-muted' : 'bg-danger-soft'}`}
              accessibilityLiveRegion="polite">
              <Text
                variant="small"
                tone={status.kind === 'ok' ? 'success' : 'inherit'}
                className={status.kind === 'error' ? 'text-danger-soft-content' : ''}>
                {status.message}
              </Text>
            </View>
          ) : null}

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
