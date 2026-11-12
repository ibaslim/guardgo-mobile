import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { WheelDateField } from '@/components/ui/wheel-date-field';
import { WheelTimePickerField } from '@/components/ui/wheel-time-picker-field';
import { combineDateTime, localStamp } from '@/utils/request-form';

export type AddCoverageSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** When the job starts: guards have to respond before it. */
  startsAt: Date | null;
  /** Asks the server for the extra guards. Rejects with the reason to show; the sheet stays open. */
  onSubmit: (extraGuards: number, respondBy: string | null) => Promise<void>;
};

/**
 * Ask for more guards on a request that is already out: how many more, and optionally a new time to
 * answer by. Used by a client; a guard or provider never sees it.
 */
export function AddCoverageSheet({ visible, onClose, startsAt, onSubmit }: AddCoverageSheetProps) {
  const [count, setCount] = useState('1');
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState('');
  const [errors, setErrors] = useState<{ count?: string; respondBy?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const found: typeof errors = {};
    const extra = Number(count);
    if (!Number.isInteger(extra) || extra < 1) found.count = 'Enter a whole number of at least 1.';

    const anyCutoff = Boolean(date) || time.trim() !== '';
    const respondBy = combineDateTime(date, time);
    if (anyCutoff && !respondBy) found.respondBy = 'Choose both a date and a time.';
    else if (respondBy && respondBy <= new Date()) found.respondBy = 'The response time has to be in the future.';
    else if (respondBy && startsAt && respondBy > startsAt) found.respondBy = 'Guards have to respond before the job starts.';

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      await onSubmit(extra, localStamp(respondBy));
      setCount('1');
      setDate(null);
      setTime('');
    } catch {
      // The caller has already told the user why.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={() => !busy && onClose()}
      title="Ask for more guards"
      footer={<Button title="Ask for more guards" loading={busy} onPress={submit} />}>
      <View className="gap-4 px-6 pb-2">
        <Text variant="small" tone="muted">
          The extra positions are offered to matching guards. The ones already covered stay as they are.
        </Text>
        <TextField
          label="Extra guards"
          value={count}
          onChangeText={setCount}
          keyboardType="number-pad"
          maxLength={3}
          error={errors.count}
        />
        <View className="flex-row items-start gap-3">
          <View className="flex-1">
            <WheelDateField label="Respond by" optional value={date} onChange={setDate} minimumDate={new Date()} error={errors.respondBy} />
          </View>
          <View className="flex-1">
            <WheelTimePickerField label="Time" optional value={time} onChange={setTime} placeholder="Time" />
          </View>
        </View>
      </View>
    </Sheet>
  );
}
