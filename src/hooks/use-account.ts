import { useCallback, useEffect, useState } from 'react';

import { getAccount, type AccountInfo } from '@/services/account';
import { fetchTenantLogo, type TenantImage } from '@/services/tenant';

type Loaded = { account: AccountInfo; photo: TenantImage | null };

async function loadAccount(): Promise<Loaded> {
  const account = await getAccount();
  return { account, photo: await fetchTenantLogo(account.tenant.id || undefined) };
}

/**
 * The signed-in user's account (email, name, tenant profile) and photo, loaded when the screen
 * opens and again on `refresh`. A failed load leaves the last result in place and sets `failed`.
 */
export function useAccount() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    loadAccount()
      .then((result) => active && setLoaded(result))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setLoaded(await loadAccount());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { account: loaded?.account ?? null, photo: loaded?.photo ?? null, failed, refreshing, refresh };
}
