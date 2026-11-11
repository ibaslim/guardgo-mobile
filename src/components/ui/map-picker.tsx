import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Button } from '@/components/ui/button';
import { buildMapPickerHtml } from '@/components/ui/map-picker-html';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ToastHost } from '@/components/ui/toast-host';
import { getApiUrl } from '@/services/api';
import { getMapsConfig, type MapsConfig } from '@/services/maps-config';

type Pin = { latitude: number; longitude: number };

type MapPickerProps = {
  visible: boolean;
  /** Where the pin starts, if the site already has coordinates. */
  initial?: Pin | null;
  onClose: () => void;
  onConfirm: (coordinate: Pin) => void;
};

type ConfigState = { status: 'loading' } | { status: 'off' } | { status: 'failed' } | { status: 'ready'; config: MapsConfig };

function MapPickerContent({ initial, onClose, onConfirm }: Omit<MapPickerProps, 'visible'>) {
  const [state, setState] = useState<ConfigState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [pin, setPin] = useState<Pin | null>(initial ?? null);
  const [error, setError] = useState<string>();

  // The key comes from the server each time the picker opens, like the web client.
  useEffect(() => {
    let active = true;
    getMapsConfig()
      .then((config) => active && setState(config ? { status: 'ready', config } : { status: 'off' }))
      .catch(() => active && setState({ status: 'failed' }));
    return () => {
      active = false;
    };
  }, [attempt]);

  // Built once per open, so the page isn't reloaded while the pin moves.
  const [startPin] = useState(initial ?? null);
  const html = useMemo(
    () => (state.status === 'ready' ? buildMapPickerHtml(state.config, startPin) : null),
    [state, startPin]
  );

  function onMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as
        | { type: 'pin'; latitude: number; longitude: number }
        | { type: 'error'; message: string }
        | { type: 'ready' };
      if (message.type === 'pin') {
        setPin({ latitude: message.latitude, longitude: message.longitude });
        setError(undefined);
      } else if (message.type === 'error') {
        setError(message.message);
      }
    } catch {
      // Not a message from our page.
    }
  }

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text variant="heading">Choose on map</Text>
        <Button title="Cancel" variant="link" onPress={onClose} />
      </View>

      {state.status === 'loading' ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator colorClassName="accent-primary" />
          <Text tone="muted">Loading map…</Text>
        </View>
      ) : null}

      {state.status === 'off' || state.status === 'failed' ? (
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text variant="heading" className="text-center">
            {state.status === 'off' ? 'Map not available' : 'Could not load the map'}
          </Text>
          <Text tone="secondary" className="text-center">
            {state.status === 'off'
              ? 'Google Maps is not set up on the server. Type the coordinates instead.'
              : 'Check your connection and try again.'}
          </Text>
          {state.status === 'failed' ? (
            <Button
              title="Try again"
              variant="secondary"
              onPress={() => {
                setState({ status: 'loading' });
                setAttempt((value) => value + 1);
              }}
            />
          ) : null}
        </View>
      ) : null}

      {html ? (
        <View className="flex-1">
          <WebView
            // The origin is the API server's, so the key's web-address restriction can be matched to it.
            source={{ html, baseUrl: getApiUrl() }}
            originWhitelist={['*']}
            javaScriptEnabled
            geolocationEnabled
            onMessage={onMessage}
            onError={() => setError('The map could not be shown.')}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}

      <View className="gap-2 p-4">
        {error ? (
          <Text tone="secondary" accessibilityRole="alert">
            {error}
          </Text>
        ) : (
          <Text tone="secondary">
            {pin ? `${pin.latitude.toFixed(6)}, ${pin.longitude.toFixed(6)}` : 'Search or tap the map to place the pin.'}
          </Text>
        )}
        <Button title="Use this location" size="lg" disabled={!pin} onPress={() => pin && onConfirm(pin)} />
      </View>
    </Screen>
  );
}

/** Full-screen Google map in a WebView: search an address or tap the map to drop a pin, then confirm. */
export function MapPicker({ visible, ...props }: MapPickerProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={props.onClose}>
      {visible ? <MapPickerContent {...props} /> : null}
      <ToastHost />
    </Modal>
  );
}
