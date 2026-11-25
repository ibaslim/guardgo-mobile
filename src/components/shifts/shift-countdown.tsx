import { useEffect, useState } from 'react';

import { Toast } from '@/components/ui/toast';
import { formatCountdown } from '@/utils/format';

export type ShiftCountdownProps = {
  /** When the shift starts. Nothing is shown without it. */
  start: Date | null;
  /** True once the client has confirmed the guard arrived, so the shift can be started now. */
  canStart: boolean;
};

/**
 * What a checked-in guard waits for: a toast-style pill counting down to the shift's start, which reads
 * "Start shift" once the time has come (or says what is still missing, when the client has not confirmed yet).
 */
export function ShiftCountdown({ start, canStart }: ShiftCountdownProps) {
  const [now, setNow] = useState(() => Date.now());
  const remaining = start ? start.getTime() - now : 0;
  const waiting = remaining > 0;

  // Tick once a second until the start time, then stop.
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waiting]);

  if (!start) return null;

  if (waiting) return <Toast variant="warning" announce={false} message={`Shift starts in ${formatCountdown(remaining)}`} />;
  return canStart ? (
    <Toast variant="success" message="Start shift" />
  ) : (
    <Toast variant="warning" message="Start shift once the client confirms" />
  );
}
