import { View } from 'react-native';

import { TimeFieldShell, type TimeFieldProps } from '@/components/ui/time-field-shell';
import { Wheel } from '@/components/ui/wheel';
import { twoDigits } from '@/utils/time-draft';

const HOUR_LABELS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTE_LABELS = Array.from({ length: 60 }, (_, index) => twoDigits(index));
const PERIOD_LABELS = ['AM', 'PM'];

export type WheelTimePickerFieldProps = TimeFieldProps;

/**
 * A time field with a scrolling wheel picker like the iPhone's: one wheel for hours and one for
 * minutes, both going round without an end, and one for AM or PM. Always 12-hour, whatever the
 * phone's clock setting. For a picker made of buttons, see `TimePickerField`.
 */
export function WheelTimePickerField(props: WheelTimePickerFieldProps) {
  return (
    <TimeFieldShell {...props}>
      {(draft, setDraft) => (
        <View className="flex-row gap-2">
          <Wheel
            loop
            labels={HOUR_LABELS}
            selected={draft.hour - 1}
            onSelect={(index) => setDraft({ ...draft, hour: index + 1 })}
            accessibilityLabel="Hour"
          />
          <Wheel
            loop
            labels={MINUTE_LABELS}
            selected={draft.minute}
            onSelect={(index) => setDraft({ ...draft, minute: index })}
            accessibilityLabel="Minutes"
          />
          <Wheel
            labels={PERIOD_LABELS}
            selected={draft.period === 'AM' ? 0 : 1}
            onSelect={(index) => setDraft({ ...draft, period: index === 0 ? 'AM' : 'PM' })}
            accessibilityLabel="AM or PM"
          />
        </View>
      )}
    </TimeFieldShell>
  );
}
