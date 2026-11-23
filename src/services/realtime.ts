import { AppState } from 'react-native';

import { env } from '@/config/env';
import { ENDPOINTS } from '@/constants/endpoints';
import { api, getAccessToken, getApiUrl } from '@/services/api';
import { ensureFreshToken } from '@/services/api/session';
import type { RealtimeEvent } from '@/types/realtime';

/**
 * Live updates from Pusher Channels. The server publishes a tiny event to the user's private channel
 * whenever it saves a notification (a new job offer, a change to a request...). The event carries only
 * an id and where it came from; the app then re-fetches the real data through the API, so MongoDB stays
 * the source of truth and a missed event costs nothing.
 *
 * Nothing here is required for the app to work: when Pusher is not configured, not installed in the
 * running build, or not connected, screens poll instead (see hooks/use-realtime.ts).
 */

type Channel = { name: string; bind: (event: string, callback: (data: unknown) => void) => void; unbind_all: () => void };
type PusherClient = {
  subscribe: (name: string) => Channel;
  unsubscribe: (name: string) => void;
  connect: () => void;
  disconnect: () => void;
  connection: { bind: (event: string, callback: (states: { current: string }) => void) => void };
};
type PusherConstructor = new (key: string, options: Record<string, unknown>) => PusherClient;

const RETRY_MS = [5_000, 10_000, 20_000, 60_000] as const;

let client: PusherClient | null = null;
let starting = false;
// Bumped by stop(), so work that was waiting on the network when the user signed out is dropped.
let generation = 0;
let connected = false;
let retries = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let appStateSubscription: { remove: () => void } | null = null;

const eventListeners = new Set<(event: RealtimeEvent) => void>();
const stateListeners = new Set<() => void>();

export const isRealtimeConfigured = () => Boolean(env.pusherKey && env.pusherCluster);
export const isRealtimeConnected = () => connected;

export function subscribeRealtimeEvents(listener: (event: RealtimeEvent) => void) {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

export function subscribeRealtimeState(listener: () => void) {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

function setConnected(next: boolean) {
  if (connected === next) return;
  connected = next;
  stateListeners.forEach((listener) => listener());
}

const emit = (event: RealtimeEvent) => {
  if (__DEV__) console.log('[realtime] event', event.type, event.sourceModule || '-', event.id || '-', `(${eventListeners.size} listeners)`);
  eventListeners.forEach((listener) => listener(event));
};

/**
 * The Pusher client, or null when it can't be loaded. It is loaded on demand because its React Native
 * build needs the netinfo native module: a build made before netinfo was added doesn't have it, and
 * importing it up front would crash the app at launch instead of just leaving it on polling.
 */
function loadPusher(): PusherConstructor | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require('pusher-js');
    return loaded?.default ?? loaded?.Pusher ?? loaded;
  } catch {
    return null;
  }
}

function bindChannel(instance: PusherClient, name: string) {
  const channel = instance.subscribe(name);
  const forward = (type: RealtimeEvent['type']) => (data: unknown) => {
    const payload = (data ?? {}) as { id?: unknown; source_module?: unknown };
    emit({ type, id: String(payload.id ?? ''), sourceModule: String(payload.source_module ?? '').toLowerCase() });
  };
  channel.bind('notification-created', forward('created'));
  channel.bind('notification-updated', forward('updated'));
  channel.bind('notifications-read-all', forward('read-all'));
  // A request's coverage changed (more guards asked for, a slot filled or freed): no notification is saved
  // for it, so the event itself tells the jobs, shifts and requests screens to reload.
  channel.bind('request-updated', (data: unknown) => {
    const payload = (data ?? {}) as { request_id?: unknown };
    emit({ type: 'updated', id: String(payload.request_id ?? ''), sourceModule: 'requests' });
  });
  channel.bind('pusher:subscription_succeeded', () => {
    retries = 0;
    setConnected(true);
    // Whatever arrived while disconnected was saved on the server; screens re-fetch it now.
    emit({ type: 'restored', id: '', sourceModule: '' });
  });
  channel.bind('pusher:subscription_error', () => {
    setConnected(false);
    scheduleRetry(instance, name);
  });
}

/** Subscribes again after a failed authorisation (an expired token, a server hiccup), with growing waits. */
function scheduleRetry(instance: PusherClient, name: string) {
  clearTimeout(retryTimer);
  const wait = RETRY_MS[Math.min(retries, RETRY_MS.length - 1)];
  retries += 1;
  const mine = generation;
  retryTimer = setTimeout(async () => {
    // A call through the API client refreshes an expired token, which the library's own auth call cannot do.
    await ensureFreshToken().catch(() => undefined);
    if (mine !== generation || client !== instance) return;
    instance.unsubscribe(name);
    bindChannel(instance, name);
  }, wait);
}

/** Connects when the app is open and disconnects in the background, so a sleeping app holds no socket. */
function watchAppState() {
  if (appStateSubscription) return;
  appStateSubscription = AppState.addEventListener('change', (state) => {
    const instance = client;
    if (!instance) return;
    if (state === 'active') {
      ensureFreshToken()
        .catch(() => undefined)
        .finally(() => instance.connect());
    } else if (state === 'background') {
      instance.disconnect();
      setConnected(false);
    }
  });
}

/**
 * Connects to the user's private channel. Safe to call again at any time: it does nothing while already
 * connected or connecting, and does nothing when Pusher isn't configured or can't be loaded.
 */
export async function startRealtime() {
  if (client || starting || !isRealtimeConfigured() || getAccessToken() === null) return;
  const Pusher = loadPusher();
  if (!Pusher) return;

  starting = true;
  const mine = generation;
  try {
    const { channel_name: name } = await api.get<{ channel_name?: string }>(ENDPOINTS.pusher.channel);
    if (mine !== generation || !name) return;

    const instance = new Pusher(env.pusherKey, {
      cluster: env.pusherCluster,
      channelAuthorization: {
        endpoint: `${getApiUrl()}${ENDPOINTS.pusher.auth}`,
        transport: 'ajax',
        // Read when each subscription is signed, so it uses the token as it is then.
        headersProvider: () => ({ Authorization: `Bearer ${getAccessToken() ?? ''}` }),
      },
    });
    instance.connection.bind('state_change', (states) => {
      if (states.current !== 'connected') setConnected(false);
    });
    client = instance;
    watchAppState();
    bindChannel(instance, name);
  } catch {
    // The server is unreachable or Pusher is off there. Screens poll, and the next start() tries again.
  } finally {
    starting = false;
  }
}

/** Disconnects and forgets everything, e.g. on sign-out. */
export function stopRealtime() {
  generation += 1;
  clearTimeout(retryTimer);
  retries = 0;
  client?.disconnect();
  client = null;
  starting = false;
  setConnected(false);
}
