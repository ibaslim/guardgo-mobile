import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AddCoverageSheet } from '@/components/requests/add-coverage-sheet';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { requestMoreCoverage, requestsErrorMessage, setRequestStatus } from '@/services/requests';
import { toast } from '@/services/toast';
import type { EndStatus, RequestDetail } from '@/types/request';
import { clientPermissions } from '@/utils/request-actions';

const ENDING: Record<EndStatus, { title: string; message: string; confirm: string; done: string; failed: string }> = {
  cancelled: {
    title: 'Cancel this request?',
    message: 'The job is called off and guards stop being offered it. This can\'t be undone.',
    confirm: 'Cancel request',
    done: 'Request cancelled.',
    failed: "Couldn't cancel the request.",
  },
  closed: {
    title: 'Close this request?',
    message: 'Mark the job as finished. This can\'t be undone.',
    confirm: 'Close request',
    done: 'Request closed.',
    failed: "Couldn't close the request.",
  },
};

export type ClientRequestActionsProps = {
  request: RequestDetail;
  /** Called after something changed on the server, so the screen can load the request again. */
  onChanged: () => void;
};

/**
 * What a client can do with one request, depending on where it is: edit a draft, update or add guards
 * to a live one, and cancel or close it. Shows nothing for a request that is over.
 */
export function ClientRequestActions({ request, onChanged }: ClientRequestActionsProps) {
  const can = clientPermissions(request);
  // The dialog's text stays while it fades out, so what is being ended is kept after it closes.
  const [ending, setEnding] = useState<EndStatus>('cancelled');
  const [endingOpen, setEndingOpen] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);

  if (!can.editDraft && !can.updateLive && !can.addCoverage && !can.endRequest) return null;

  const ask = (status: EndStatus) => {
    setEnding(status);
    setEndingOpen(true);
  };

  async function end() {
    try {
      await setRequestStatus(request.id, ending);
      toast.success(ENDING[ending].done);
      onChanged();
    } catch (failure) {
      toast.failure(requestsErrorMessage(failure, ENDING[ending].failed));
    }
  }

  async function addCoverage(extra: number, respondBy: string | null) {
    try {
      await requestMoreCoverage(request.id, extra, respondBy);
      toast.success(extra === 1 ? 'Asked for 1 more guard.' : `Asked for ${extra} more guards.`);
      setCoverageOpen(false);
      onChanged();
    } catch (failure) {
      toast.failure(requestsErrorMessage(failure, "Couldn't ask for more guards."));
      throw failure;
    }
  }

  const edit = (mode?: 'update') =>
    router.push({ pathname: '/request-form', params: mode ? { id: request.id, mode } : { id: request.id } });

  return (
    <View className="gap-3 pt-4">
      {can.editDraft ? <Button title="Edit draft" variant="secondary" size="lg" onPress={() => edit()} /> : null}
      {can.updateLive ? <Button title="Update request" variant="secondary" size="lg" onPress={() => edit('update')} /> : null}
      {can.addCoverage ? <Button title="Ask for more guards" variant="secondary" size="lg" onPress={() => setCoverageOpen(true)} /> : null}
      {can.endRequest ? <Button title="Cancel request" variant="danger" size="lg" onPress={() => ask('cancelled')} /> : null}

      <ConfirmDialog
        visible={endingOpen}
        onClose={() => setEndingOpen(false)}
        tone={ending === 'cancelled' ? 'danger' : 'primary'}
        title={ENDING[ending].title}
        message={ENDING[ending].message}
        confirmLabel={ENDING[ending].confirm}
        onConfirm={end}
      />

      <AddCoverageSheet visible={coverageOpen} onClose={() => setCoverageOpen(false)} startsAt={request.start} onSubmit={addCoverage} />
    </View>
  );
}
