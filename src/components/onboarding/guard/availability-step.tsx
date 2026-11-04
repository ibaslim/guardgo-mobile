import { Switch, View } from 'react-native';
import { useController, useFormState } from 'react-hook-form';

import type { GuardForm } from '@/components/onboarding/guard/guard-form';
import { StepHeading } from '@/components/onboarding/step-heading';
import { Button } from '@/components/ui/button';
import { TimePickerField } from '@/components/ui/time-picker-field';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { WEEK_DAYS, type DayAvailabilityValue, type WeekDay, type WeeklyAvailabilityValues } from '@/types/guard-onboarding';

type DayRowProps = {
  name: WeekDay;
  value: DayAvailabilityValue;
  onChange: (next: DayAvailabilityValue) => void;
};

function DayRow({ name, value, onChange }: DayRowProps) {
  function toggle(enabled: boolean) {
    // Switching a day on starts with one empty range to fill in.
    const ranges = enabled && value.ranges.length === 0 ? [{ start: '', end: '' }] : value.ranges;
    onChange({ enabled, ranges });
  }

  function setTime(index: number, part: 'start' | 'end', time: string) {
    const ranges = value.ranges.map((range, i) => (i === index ? { ...range, [part]: time } : range));
    onChange({ ...value, ranges });
  }

  return (
    <View className="gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text variant="heading">{name}</Text>
        <Switch
          value={value.enabled}
          onValueChange={toggle}
          accessibilityLabel={`${name} availability`}
        />
      </View>

      {value.enabled ? (
        <View className="gap-4">
          {value.ranges.map((range, index) => (
            <View key={index} className="gap-3">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <TimePickerField
                    label="From"
                    value={range.start}
                    onChange={(time) => setTime(index, 'start', time)}
                    placeholder="Start"
                  />
                </View>
                <View className="flex-1">
                  <TimePickerField
                    label="To"
                    value={range.end}
                    onChange={(time) => setTime(index, 'end', time)}
                    placeholder="End"
                  />
                </View>
              </View>
              {index > 0 ? (
                <Button
                  title="Remove range"
                  variant="link"
                  size="sm"
                  icon={ICONS.trash}
                  onPress={() => onChange({ ...value, ranges: value.ranges.filter((_, i) => i !== index) })}
                />
              ) : null}
            </View>
          ))}
          <Button
            title="Add another range"
            variant="secondary"
            size="sm"
            onPress={() => onChange({ ...value, ranges: [...value.ranges, { start: '', end: '' }] })}
          />
        </View>
      ) : null}
    </View>
  );
}

/** Weekly availability: which days, and from when to when. Each day runs 6:00 AM to 6:00 AM. */
export function AvailabilityStep({ form }: { form: GuardForm }) {
  const { field } = useController({ control: form.control, name: 'weekly_availability' });
  const { errors } = useFormState({ control: form.control, name: 'weekly_availability' });
  const value: WeeklyAvailabilityValues = field.value;
  const error = errors.weekly_availability?.message;

  return (
    <View className="gap-6">
      <StepHeading title="Availability" description="Choose the days and hours you can work each week." />

      <View className="gap-1.5 rounded-xl border border-border bg-primary-soft p-4">
        <Text variant="label" tone="inherit" className="text-primary-soft-content">
          Each day runs from 6:00 AM to 6:00 AM
        </Text>
        <Text variant="small" tone="inherit" className="text-primary-soft-content">
          A night shift belongs to the day it starts. For example, 11:00 PM to 3:00 AM under Monday means Monday night
          into Tuesday morning.
        </Text>
      </View>

      {error ? (
        <Text variant="small" tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {WEEK_DAYS.map((name) => (
        <DayRow key={name} name={name} value={value[name]} onChange={(next) => field.onChange({ ...value, [name]: next })} />
      ))}
    </View>
  );
}
