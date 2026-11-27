import { useSyncExternalStore } from 'react';

import { getJobAttention, subscribeJobAttention } from '@/services/job-attention';

/** True while the guard has an offer to answer, a job under way, or an accepted job or shift to come. */
export function useJobAttention() {
  return useSyncExternalStore(subscribeJobAttention, getJobAttention, getJobAttention);
}
