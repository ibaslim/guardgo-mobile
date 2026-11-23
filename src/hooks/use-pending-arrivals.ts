import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useRealtimeRefresh, useScreenFocused } from '@/hooks/use-realtime';
import { jobsErrorMessage } from '@/services/guard-jobs';
import { confirmArrival, listPendingArrivals } from '@/services/pending-arrivals';
import { toast } from '@/services/toast';
import type { PendingArrival, PendingArrivals } from '@/types/arrival';

const NONE: PendingArrivals = { items: [], total: 0 };

/**
 * The guards waiting for the client to confirm their arrival. It loads when the screen comes into view,
 * on Pusher events about requests, and every 30 seconds without Pusher. A failed load keeps what was
 * shown, so the banner doesn't flicker away on a bad connection.
 */
export function usePendingArrivals() {
  const [arrivals, setArrivals] = useState<PendingArrivals>(NONE);
  const [busyId, setBusyId] = useState<string | null>(null);
  const loading = useRef(false);

  const reload = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      setArrivals(await listPendingArrivals());
    } catch {
      // A server without the list, or no connection: keep what is shown.
    } finally {
      loading.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const focused = useScreenFocused();
  useRealtimeRefresh(
    () => {
      reload();
    },
    { sources: ['requests'], active: focused, pollMs: 30_000 }
  );

  const confirm = useCallback(
    async (arrival: PendingArrival) => {
      setBusyId(arrival.slotId);
      try {
        await confirmArrival(arrival.slotId);
        toast.success(`${arrival.guardName} confirmed. They can start now.`);
        await reload();
      } catch (failure) {
        toast.failure(jobsErrorMessage(failure, "Couldn't confirm this arrival. Try again."));
      } finally {
        setBusyId(null);
      }
    },
    [reload]
  );

  return { ...arrivals, busyId, confirm, reload };
}

export type PendingArrivalsState = ReturnType<typeof usePendingArrivals>;
