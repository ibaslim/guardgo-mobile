import type { ReactNode } from 'react';
import { useController, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { FormSelect, FormWheelDateField, FormWheelTimePicker } from '@/components/form/form-fields';
import type { RequestForm } from '@/components/requests/form/request-form-type';
import { ChipSelect } from '@/components/ui/chip-select';
import { FormSection } from '@/components/ui/form-section';
import { Text } from '@/components/ui/text';
import { WEEKDAYS } from '@/utils/request-form';

const REPEATS = [
  { value: 'none', label: "Doesn't repeat" },
  { value: 'date_range', label: 'Every day until a date' },
  { value: 'recurring_weekly', label: 'On chosen weekdays' },
] as const;

/** Two fields side by side: a date and its time. */
function Pair({ children }: { children: ReactNode }) {
  return <View className="flex-row items-start gap-3">{children}</View>;
}

function Weekdays({ form }: { form: RequestForm }) {
  const { field, fieldState } = useController({ control: form.control, name: 'repeat_days' });
  return (
    <View className="gap-2">
      <Text variant="label">Repeat on</Text>
      <ChipSelect
        options={WEEKDAYS}
        value={field.value}
        onChange={field.onChange}
        accessibilityLabel="Weekdays"
        error={fieldState.error?.message}
      />
    </View>
  );
}

/**
 * When the job runs, and whether it repeats. For a repeating job the start and end describe the first
 * shift. Also when guards have to answer by, which is needed to publish.
 */
export function WhenSection({ form, allowRepeat = true }: { form: RequestForm; allowRepeat?: boolean }) {
  const repeat = useWatch({ control: form.control, name: 'repeat' });
  const today = new Date();

  return (
    <FormSection
      title="When"
      description={repeat === 'none' ? 'When the job starts and ends.' : 'The first shift. The rest follow the pattern below.'}>
      <Pair>
        <View className="flex-1">
          <FormWheelDateField control={form.control} name="start_date" label="Starts" minimumDate={today} />
        </View>
        <View className="flex-1">
          <FormWheelTimePicker control={form.control} name="start_time" label="Time" placeholder="Start" />
        </View>
      </Pair>
      <Pair>
        <View className="flex-1">
          <FormWheelDateField control={form.control} name="end_date" label="Ends" minimumDate={today} />
        </View>
        <View className="flex-1">
          <FormWheelTimePicker control={form.control} name="end_time" label="Time" placeholder="End" />
        </View>
      </Pair>

      {allowRepeat ? <FormSelect control={form.control} name="repeat" label="Repeat" options={REPEATS} /> : null}
      {allowRepeat && repeat !== 'none' ? (
        <View className="gap-4">
          <FormWheelDateField control={form.control} name="repeat_until" label="Last day" minimumDate={today} />
          {repeat === 'recurring_weekly' ? <Weekdays form={form} /> : null}
        </View>
      ) : null}

      <Pair>
        <View className="flex-1">
          <FormWheelDateField
            control={form.control}
            name="expiry_date"
            label="Respond by"
            optional
            minimumDate={today}
            hint="Guards must answer before this. Needed to publish."
          />
        </View>
        <View className="flex-1">
          <FormWheelTimePicker control={form.control} name="expiry_time" label="Time" placeholder="Time" optional />
        </View>
      </Pair>
    </FormSection>
  );
}
