import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { isRealtimeConnected, subscribeRealtimeEvents, subscribeRealtimeState } from '@/services/realtime';

/** How long to wait for more events before refreshing, so a burst of them causes one refresh. */
const EVENT_DEBOUNCE_MS = 300;
/** How often to refresh while not connected to Pusher, like the web app. */
const POLL_MS = 10_000;

/** True while the live connection to Pusher is up. */
export function useRealtimeConnected() {
  return useSyncExternalStore(subscribeRealtimeState, isRealtimeConnected, isRealtimeConnected);
}

/**
 * True while the calling screen is the one in front. Tab screens stay mounted when the user leaves them,
 * so a screen that refreshes itself uses this to stop doing it while hidden.
 */
export function useScreenFocused() {
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );
  return focused;
}

export type RealtimeRefreshOptions = {
  /** Refresh only for events from these parts of the product (e.g. "requests"). Leave out for any event. */
  sources?: readonly string[];
  /** Set false to turn it all off, e.g. while the screen is hidden. */
  active?: boolean;
  /** Set false to skip the event refresh and keep only the polling fallback, for a screen that handles events elsewhere. */
  events?: boolean;
  pollMs?: number;
};

/**
 * Keeps a screen's data current. When something changes on the server, Pusher tells the app and `refresh`
 * runs (once per burst of events, and again after a reconnect to pick up what was missed). While Pusher
 * is not connected - not set up, not in this build, or the connection dropped - it runs `refresh` every
 * 10 seconds instead, but only while the app is open. Pass a refresh that reloads quietly.
 */
export function useRealtimeRefresh(refresh: () => void, options: RealtimeRefreshOptions = {}) {
  const { sources, active = true, events = true, pollMs = POLL_MS } = options;
  const connected = useRealtimeConnected();
  const sourceKey = sources?.join(',') ?? '';

  // The newest refresh is used without restarting the timers whenever the screen re-renders.
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  });

  useEffect(() => {
    if (!active || !events) return;
    const wanted = sourceKey ? sourceKey.split(',') : null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeRealtimeEvents((event) => {
      if (event.type !== 'restored' && wanted && !wanted.includes(event.sourceModule)) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (__DEV__) console.log('[realtime] refresh for', sourceKey || 'any source', event.type);
        latest.current();
      }, EVENT_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [active, events, sourceKey]);

  useEffect(() => {
    if (!active || connected) return;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') latest.current();
    }, pollMs);
    return () => clearInterval(timer);
  }, [active, connected, pollMs]);
}
