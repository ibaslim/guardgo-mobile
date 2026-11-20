import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { jobsErrorMessage } from '@/services/guard-jobs';

export type JobSlotsSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  min: number;
  max: number;
  /** Sends the answer with the number of positions. A thrown error is shown in the sheet and keeps it open. */
  onConfirm: (slots: number) => Promise<void>;
};

/** Asks a service provider how many guard positions it can cover before it accepts a job. */
export function JobSlotsSheet({ visible, onClose, title, message, confirmLabel, min, max, onConfirm }: JobSlotsSheetProps) {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Until the provider types, offer the smallest allowed number.
  const shown = value ?? String(min);

  const close = () => {
    if (busy) return;
    setValue(null);
    setError(null);
    onClose();
  };

  const submit = async () => {
    const slots = Number(shown);
    if (!Number.isInteger(slots) || slots < min || slots > max) {
      setError(min === max ? `Enter ${min}.` : `Enter a whole number from ${min} to ${max}.`);
      return;
    }
    setBusy(true);
    try {
      await onConfirm(slots);
      setValue(null);
      setError(null);
      onClose();
    } catch (failure) {
      setError(jobsErrorMessage(failure, "Couldn't send your answer. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={close} title={title} footer={<Button title={confirmLabel} loading={busy} onPress={submit} />}>
      <View className="gap-4 px-6">
        <Text tone="secondary">{message}</Text>
        <TextField
          label="Guard positions you can cover"
          value={shown}
          onChangeText={(text) => {
            setValue(text.replace(/[^0-9]/g, ''));
            if (error) setError(null);
          }}
          keyboardType="number-pad"
          error={error ?? undefined}
        />
      </View>
    </Sheet>
  );
}
