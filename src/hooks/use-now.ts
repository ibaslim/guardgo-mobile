import { useEffect, useState } from 'react';

/**
 * The current time in milliseconds, updated every `intervalMs` while `enabled`, so a countdown on screen
 * keeps running down. Stops ticking when disabled or unmounted.
 */
export function useNow(enabled = true, intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs]);

  return now;
}
