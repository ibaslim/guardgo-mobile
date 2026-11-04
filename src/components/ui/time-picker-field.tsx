import { Pressable, View } from 'react-native';

import { TimeFieldShell, type TimeFieldProps } from '@/components/ui/time-field-shell';
import { Text } from '@/components/ui/text';
import { twoDigits } from '@/utils/time-draft';

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);

type ChipProps = { label: string; selected: boolean; onPress: () => void; accessibilityLabel: string };

/** One choice in a grid: filled when chosen. */
function Chip({ label, selected, onPress, accessibilityLabel }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={`h-11 w-[15%] grow items-center justify-center rounded-xl border active:opacity-80 ${
        selected ? 'border-primary bg-primary' : 'border-field-border bg-field'
      }`}>
      <Text variant="label" tone="inherit" className={selected ? 'text-on-primary' : 'text-content'}>
        {label}
      </Text>
    </Pressable>
  );
}

export type TimePickerFieldProps = TimeFieldProps;

/**
 * A time field with a 12-hour picker made of buttons: hour, minute (every 5 minutes) and AM or PM,
 * all visible at once. The native spinner follows the phone's clock setting and hides AM/PM on
 * 24-hour phones. For a scrolling wheel like the iPhone's, see `WheelTimePickerField`.
 */
export function TimePickerField(props: TimePickerFieldProps) {
  return (
    <TimeFieldShell {...props}>
      {(draft, setDraft) => {
        // A saved time that is not on a 5-minute step still shows, and stays selectable.
        const minutes = MINUTES.includes(draft.minute) ? MINUTES : [...MINUTES, draft.minute].sort((a, b) => a - b);
        return (
          <>
            <View className="gap-2">
              <Text variant="label" tone="secondary">
                Hour
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {HOURS.map((hour) => (
                  <Chip
                    key={hour}
                    label={String(hour)}
                    accessibilityLabel={`${hour} o'clock`}
                    selected={draft.hour === hour}
                    onPress={() => setDraft({ ...draft, hour })}
                  />
                ))}
              </View>
            </View>

            <View className="gap-2">
              <Text variant="label" tone="secondary">
                Minutes
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {minutes.map((minute) => (
                  <Chip
                    key={minute}
                    label={twoDigits(minute)}
                    accessibilityLabel={`${minute} minutes`}
                    selected={draft.minute === minute}
                    onPress={() => setDraft({ ...draft, minute })}
                  />
                ))}
              </View>
            </View>

            <View className="flex-row gap-3">
              {(['AM', 'PM'] as const).map((period) => (
                <Pressable
                  key={period}
                  accessibilityRole="radio"
                  accessibilityLabel={period === 'AM' ? 'AM, morning' : 'PM, afternoon or night'}
                  accessibilityState={{ checked: draft.period === period }}
                  onPress={() => setDraft({ ...draft, period })}
                  className={`h-12 flex-1 items-center justify-center rounded-xl border active:opacity-80 ${
                    draft.period === period ? 'border-primary bg-primary' : 'border-field-border bg-field'
                  }`}>
                  <Text variant="heading" tone="inherit" className={draft.period === period ? 'text-on-primary' : 'text-content'}>
                    {period}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        );
      }}
    </TimeFieldShell>
  );
}
