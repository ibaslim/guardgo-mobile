import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { jobsErrorMessage } from '@/services/guard-jobs';

const MAX_REASON = 500;

export type JobReasonSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** What the guard is about to do, in a sentence. */
  message: string;
  confirmLabel: string;
  /** Sends the answer with the reason. A thrown error is shown in the sheet and keeps it open. */
  onConfirm: (reason: string) => Promise<void>;
};

/** Asks for a reason before a job is declined or cancelled; the server requires one. */
export function JobReasonSheet({ visible, onClose, title, message, confirmLabel, onConfirm }: JobReasonSheetProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    setReason('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!reason.trim()) {
      setError('Enter a reason.');
      return;
    }
    setBusy(true);
    try {
      await onConfirm(reason);
      setReason('');
      setError(null);
      onClose();
    } catch (failure) {
      setError(jobsErrorMessage(failure, "Couldn't send your answer. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={close} title={title} footer={<Button title={confirmLabel} variant="danger" loading={busy} onPress={submit} />}>
      <View className="gap-4 px-6">
        <Text tone="secondary">{message}</Text>
        <TextField
          label="Reason"
          placeholder="Tell the sender why"
          value={reason}
          onChangeText={(value) => {
            setReason(value);
            if (error) setError(null);
          }}
          error={error ?? undefined}
          maxLength={MAX_REASON}
          multiline
          numberOfLines={3}
        />
      </View>
    </Sheet>
  );
}
