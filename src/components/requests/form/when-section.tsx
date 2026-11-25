import { useController, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { FormSelect, FormWheelDateField } from '@/components/form/form-fields';
import type { RequestForm } from '@/components/requests/form/request-form-type';
import { ChipSelect } from '@/components/ui/chip-select';
import { FieldFrame } from '@/components/ui/field';
import { FormSection } from '@/components/ui/form-section';
import { Text } from '@/components/ui/text';
import { WheelDateField } from '@/components/ui/wheel-date-field';
import { WheelTimePickerField } from '@/components/ui/wheel-time-picker-field';
import { WEEKDAYS } from '@/utils/request-form';

const REPEATS = [
  { value: 'none', label: "Doesn't repeat" },
  { value: 'date_range', label: 'Every day until a date' },
  { value: 'recurring_weekly', label: 'On chosen weekdays' },
] as const;

type PairProps = {
  form: RequestForm;
  dateName: 'start_date' | 'end_date' | 'expiry_date';
  timeName: 'start_time' | 'end_time' | 'expiry_time';
  /** The label over both fields. */
  label: string;
  /** What each picker is called when it opens, and to a screen reader. */
  dateLabel: string;
  timeLabel: string;
  minimumDate: Date;
  optional?: boolean;
  hint?: string;
};

/**
 * A date and its time under one label. The form reports a problem with the pair on the date, so the
 * message is shown once under both fields at full width, and both boxes turn red. The date gets the
 * wider box, since "23 Nov 2026" is longer than "9:00 PM".
 */
function DateTimePair({ form, dateName, timeName, label, dateLabel, timeLabel, minimumDate, optional, hint }: PairProps) {
  const date = useController({ control: form.control, name: dateName });
  const time = useController({ control: form.control, name: timeName });
  const error = date.fieldState.error?.message ?? time.fieldState.error?.message;

  return (
    <FieldFrame label={label} optional={optional} error={error} hint={hint}>
      <View className="flex-row items-start gap-3">
        <View className="flex-[5]">
          <WheelDateField
            label={dateLabel}
            placeholder="Date"
            hideLabel
            compact
            value={date.field.value ?? null}
            onChange={(next) => {
              date.field.onChange(next);
              if (date.fieldState.error) form.trigger(dateName);
            }}
            onBlur={date.field.onBlur}
            minimumDate={minimumDate}
            optional={optional}
            error={error}
            hideErrorText
          />
        </View>
        <View className="flex-[4]">
          <WheelTimePickerField
            label={timeLabel}
            placeholder="Time"
            hideLabel
            compact
            value={time.field.value ?? ''}
            onChange={(next) => {
              time.field.onChange(next);
              // The pair's error sits on the date, so fixing the time has to re-check it.
              if (date.fieldState.error) form.trigger(dateName);
            }}
            optional={optional}
            error={error}
            hideErrorText
          />
        </View>
      </View>
    </FieldFrame>
  );
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
      <DateTimePair form={form} dateName="start_date" timeName="start_time" label="Starts" dateLabel="Start date" timeLabel="Start time" minimumDate={today} />
      <DateTimePair form={form} dateName="end_date" timeName="end_time" label="Ends" dateLabel="End date" timeLabel="End time" minimumDate={today} />

      {allowRepeat ? <FormSelect control={form.control} name="repeat" label="Repeat" options={REPEATS} /> : null}
      {allowRepeat && repeat !== 'none' ? (
        <View className="gap-4">
          <FormWheelDateField control={form.control} name="repeat_until" label="Last day" minimumDate={today} />
          {repeat === 'recurring_weekly' ? <Weekdays form={form} /> : null}
        </View>
      ) : null}

      <DateTimePair
        form={form}
        dateName="expiry_date"
        timeName="expiry_time"
        label="Respond by"
        dateLabel="Response date"
        timeLabel="Response time"
        minimumDate={today}
        hint="Guards must answer before this. Needed to publish."
      />
    </FormSection>
  );
}
