import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { deactivateGuard, guardsErrorMessage } from '@/services/provider-guards';

const MAX_REASON = 500;

export type DeactivateGuardSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Shown in the sheet: the guard's name or email. */
  guardName: string;
  guardId: string;
  /** Called after the guard was deactivated. */
  onDeactivated: () => void;
};

/** Asks why a guard is being deactivated (the server requires a reason), then deactivates them. */
export function DeactivateGuardSheet({ visible, onClose, guardName, guardId, onDeactivated }: DeactivateGuardSheetProps) {
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
      setError('Enter a reason for deactivating this guard.');
      return;
    }
    setBusy(true);
    try {
      await deactivateGuard(guardId, reason);
      setReason('');
      setError(null);
      onDeactivated();
    } catch (failure) {
      setError(guardsErrorMessage(failure, "Couldn't deactivate this guard."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Deactivate guard"
      footer={<Button title="Deactivate" variant="danger" loading={busy} onPress={submit} />}>
      <View className="gap-4 px-6">
        <Text tone="secondary">{guardName} will no longer be rostered on shifts. You can activate them again later.</Text>
        <TextField
          label="Reason"
          placeholder="Why is this guard being deactivated?"
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
