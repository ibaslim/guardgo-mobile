import { useEffect, useState } from 'react';

import { getGuardMetadata } from '@/services/guard-tenant';
import type { GuardMetadata } from '@/types/guard-onboarding';

// The lists rarely change, so one successful load serves every screen until the app restarts.
let loading: Promise<GuardMetadata> | null = null;
let loaded: GuardMetadata | null = null;

function loadGuardMetadata() {
  loading ??= getGuardMetadata()
    .then((metadata) => {
      loaded = metadata;
      return metadata;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

type State = { metadata: GuardMetadata | null; failed: boolean };

/**
 * Option lists for the guard profile (`public/guard-metadata`): provinces, cities, document types,
 * license types and so on. `retry` tries again after a failed load.
 */
export function useGuardMetadata() {
  const [state, setState] = useState<State>({ metadata: loaded, failed: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (loaded) return;
    let active = true;
    loadGuardMetadata()
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
