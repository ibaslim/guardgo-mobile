import { useState, type ReactNode } from 'react';

import { JobReasonSheet } from '@/components/jobs/job-reason-sheet';
import { JobSlotsSheet } from '@/components/jobs/job-slots-sheet';
import { jobsErrorMessage, respondToJob } from '@/services/guard-jobs';
import { toast } from '@/services/toast';
import type { GuardJob, JobAction } from '@/types/job';

type Ask = { job: GuardJob; action: JobAction };

/**
 * Answers or moves on a job (accept, decline, start, complete...). An answer that needs a reason opens a
 * sheet first; the others are sent at once. `onDone` runs after the server accepted the change, so the
 * screen can reload. Render the returned `sheet` somewhere on the screen.
 */
export function useJobResponder(onDone: () => void): {
  respond: (job: GuardJob, action: JobAction) => void;
  /** The job being sent right now, to disable its buttons. */
  busyId: string | null;
  sheet: ReactNode;
} {
  const [busyId, setBusyId] = useState<string | null>(null);
  // Kept after the sheet closes, so its text doesn't blank during the fade.
  const [ask, setAsk] = useState<Ask | null>(null);
  const [open, setOpen] = useState(false);

  const send = async (job: GuardJob, action: JobAction, reason?: string, slots?: number) => {
    const message = await respondToJob(job.id, action.status, reason, slots);
    toast.success(message);
    onDone();
  };

  const respond = (job: GuardJob, action: JobAction) => {
    if (action.needsReason || action.slots) {
      setAsk({ job, action });
      setOpen(true);
      return;
    }
    setBusyId(job.id);
    send(job, action)
      .catch((failure) => toast.failure(jobsErrorMessage(failure, "Couldn't update this job.")))
      .finally(() => setBusyId(null));
  };

  const declining = ask?.action.status === 'declined';

  const slotsSheet = (
    <JobSlotsSheet
      visible={open && Boolean(ask?.action.slots)}
      onClose={() => setOpen(false)}
      title={ask?.action.label ?? 'Accept'}
      message={ask ? `How many guard positions can your team cover on "${ask.job.title}"?` : ''}
      confirmLabel={ask?.action.label ?? 'Accept'}
      min={ask?.action.slots?.min ?? 1}
      max={ask?.action.slots?.max ?? 1}
      onConfirm={async (slots) => {
        if (ask) await send(ask.job, ask.action, undefined, slots);
      }}
    />
  );

  const sheet = (
    <>
      {slotsSheet}
      <JobReasonSheet
      visible={open && !ask?.action.slots}
      onClose={() => setOpen(false)}
      title={declining ? 'Decline this job' : 'Cancel this job'}
      message={
        ask
          ? declining
            ? `You will not be offered "${ask.job.title}" again. Tell the sender why.`
            : `"${ask.job.title}" will be cancelled. Tell the sender why.`
          : ''
      }
      confirmLabel={declining ? 'Decline' : 'Cancel job'}
      onConfirm={async (reason) => {
        if (ask) await send(ask.job, ask.action, reason);
      }}
      />
    </>
  );

  return { respond, busyId, sheet };
}
