import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { fieldBoxClassName, FieldFrame } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import type { FieldMeta } from '@/types/ui';
import { parseTime } from '@/utils/availability';

type Period = 'AM' | 'PM';
type Draft = { hour: number; minute: number; period: Period };

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);
const DEFAULT_DRAFT: Draft = { hour: 9, minute: 0, period: 'AM' };

const two = (value: number) => String(value).padStart(2, '0');

/** "09:30 AM" (the text the server uses) from a draft. */
const toText = ({ hour, minute, period }: Draft) => `${two(hour)}:${two(minute)} ${period}`;
/** "9:30 PM", for showing. */
const toLabel = ({ hour, minute, period }: Draft) => `${hour}:${two(minute)} ${period}`;

function toDraft(text: string): Draft | null {
  const minutes = parseTime(text);
  if (minutes === null) return null;
  const hours = Math.floor(minutes / 60);
  return { hour: hours % 12 === 0 ? 12 : hours % 12, minute: minutes % 60, period: hours >= 12 ? 'PM' : 'AM' };
}

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

export type TimePickerFieldProps = FieldMeta & {
  /** "09:30 AM", or an empty string when no time is chosen. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

/**
 * A time field with its own 12-hour picker in a sheet: hour, minute (every 5 minutes) and AM or PM,
 * all visible at once. The native spinner follows the phone's clock setting and hides AM/PM on
 * 24-hour phones, and in half-width fields the chosen time did not fit.
 */
export function TimePickerField({ value, onChange, placeholder = 'Select', ...meta }: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const current = toDraft(value);

  function openPicker() {
    setDraft(current ?? DEFAULT_DRAFT);
    setOpen(true);
  }

  // A saved time that is not on a 5-minute step still shows, and stays selectable.
  const minutes = MINUTES.includes(draft.minute) ? MINUTES : [...MINUTES, draft.minute].sort((a, b) => a - b);

  return (
    <View>
      <FieldFrame label={meta.label} hint={meta.hint} error={meta.error} optional={meta.optional}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={meta.label}
          accessibilityValue={{ text: current ? toLabel(current) : placeholder }}
          accessibilityState={{ expanded: open }}
          onPress={openPicker}
          className={`${fieldBoxClassName({ focused: open, error: meta.error })} justify-center active:opacity-80`}>
          <Text variant="heading" tone={current ? 'default' : 'muted'} numberOfLines={1} adjustsFontSizeToFit>
            {current ? toLabel(current) : placeholder}
          </Text>
        </Pressable>
      </FieldFrame>

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={meta.label}
        footer={
          <>
            <Button
              title="Done"
              onPress={() => {
                onChange(toText(draft));
                setOpen(false);
              }}
            />
            {meta.optional && current ? (
              <Button
                title="Clear time"
                variant="link"
                onPress={() => {
                  onChange('');
                  setOpen(false);
                }}
              />
            ) : null}
          </>
        }>
        <View className="gap-5 px-6 pb-2">
          <Text variant="display" className="text-center" accessibilityLiveRegion="polite">
            {toLabel(draft)}
          </Text>

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
                  label={two(minute)}
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
        </View>
      </Sheet>
    </View>
  );
}
