import { useEffect, useState } from 'react';

import { getClientMetadata } from '@/services/tenant';
import type { ClientMetadata } from '@/types/onboarding';

// The lists rarely change, so one successful load serves every screen until the app restarts.
let loading: Promise<ClientMetadata> | null = null;
let loaded: ClientMetadata | null = null;

function loadClientMetadata() {
  loading ??= getClientMetadata()
    .then((metadata) => {
      loaded = metadata;
      return metadata;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

type State = { metadata: ClientMetadata | null; failed: boolean };

/**
 * Province, city and country lists for the client profile (`public/client-metadata`).
 * `retry` tries again after a failed load.
 */
export function useClientMetadata() {
  const [state, setState] = useState<State>({ metadata: loaded, failed: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (loaded) return;
    let active = true;
    loadClientMetadata()
      .then((metadata) => active && setState({ metadata, failed: false }))
      .catch(() => active && setState({ metadata: null, failed: true }));
    return () => {
      active = false;
    };
  }, [attempt]);

  return {
    metadata: state.metadata,
    failed: state.failed,
    loading: state.metadata === null && !state.failed,
    retry: () => {
      setState({ metadata: null, failed: false });
      setAttempt((value) => value + 1);
    },
  };
}
