import { useState } from 'react';

import { logout } from '@/services/auth';

/** Logs out and reports progress for a button. The root layout's guard then shows the login screen. */
export function useLogout() {
  const [loggingOut, setLoggingOut] = useState(false);

  async function onLogout() {
    setLoggingOut(true);
    await logout();
  }

  return { logout: onLogout, loggingOut };
}
