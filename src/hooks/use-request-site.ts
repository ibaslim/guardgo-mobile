import { useEffect, useState } from 'react';

import { getRequest, type RequestDetail } from '@/services/requests';

/**
 * The request behind a job or a shift. It holds the site's address and position, which the job and the
 * shift themselves only carry as a name. Null until loaded, and stays null if it can't be loaded (the
 * screen then simply leaves the site card out).
 */
export function useRequestSite(requestId: string | undefined, reloads = 0): RequestDetail | null {
  const [loaded, setLoaded] = useState<{ id: string; request: RequestDetail } | null>(null);

  useEffect(() => {
    if (!requestId) return;
    let active = true;
    getRequest(requestId)
      .then((request) => active && setLoaded({ id: requestId, request }))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [requestId, reloads]);

  return loaded && loaded.id === requestId ? loaded.request : null;
}
