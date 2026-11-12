import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import type { DateFieldProps } from '@/components/ui/date-field';
import { PickerTrigger } from '@/components/ui/picker-trigger';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Wheel } from '@/components/ui/wheel';
import { ICONS } from '@/constants/icons';
import { formatDate } from '@/utils/format';

// Years offered when no earliest or latest date is given, counted from this year.
const YEARS_BACK = 100;
const YEARS_AHEAD = 30;

const DAY_LABELS = Array.from({ length: 31 }, (_, index) => String(index + 1));
// "Jan" to "Dec" in the device's language, like the date shown in the field.
const MONTH_LABELS = Array.from({ length: 12 }, (_, month) =>
  new Date(2000, month, 1).toLocaleDateString(undefined, { month: 'short' }),
);

/** A date being picked. `month` counts from 0, like a Date's. */
type DateDraft = { year: number; month: number; day: number };

const toDraft = (date: Date): DateDraft => ({ year: date.getFullYear(), month: date.getMonth(), day: date.getDate() });
const toDate = ({ year, month, day }: DateDraft) => new Date(year, month, day);
const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

/** The nearest date that exists (no 31 in a 30-day month) and lies between the earliest and latest allowed. */
function nearestAllowed(draft: DateDraft, minimumDate?: Date, maximumDate?: Date): DateDraft {
  const fitted = { ...draft, day: Math.min(draft.day, daysInMonth(draft.year, draft.month)) };
  const time = toDate(fitted).getTime();
  // Compared by day: the limits may carry a time of day, like "now".
  if (minimumDate && time < toDate(toDraft(minimumDate)).getTime()) return toDraft(minimumDate);
  if (maximumDate && time > toDate(toDraft(maximumDate)).getTime()) return toDraft(maximumDate);
  return fitted;
}

export type WheelDateFieldProps = DateFieldProps;

/**
 * A date field with a scrolling wheel picker like the iPhone's: one wheel each for the day, the
 * month and the year. The same on both platforms. Takes the same props as `DateField`, which opens
 * the platform's own calendar instead.
 */
export function WheelDateField({
  value,
  onChange,
  onBlur,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
  ...meta
}: WheelDateFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateDraft>(() => toDraft(value ?? new Date()));

  const thisYear = new Date().getFullYear();
  const firstYear = minimumDate ? minimumDate.getFullYear() : thisYear - YEARS_BACK;
  const lastYear = Math.max(firstYear, maximumDate ? maximumDate.getFullYear() : thisYear + YEARS_AHEAD);
  const yearLabels = useMemo(
    () => Array.from({ length: lastYear - firstYear + 1 }, (_, index) => String(firstYear + index)),
    [firstYear, lastYear],
  );

  const choose = (next: DateDraft) => setDraft(nearestAllowed(next, minimumDate, maximumDate));

  function openPicker() {
    choose(toDraft(value ?? new Date()));
    setOpen(true);
  }

  function close() {
    setOpen(false);
    onBlur?.();
  }

  return (
    <View>
      <PickerTrigger
        {...meta}
        valueLabel={value ? formatDate(value) : null}
        placeholder={placeholder}
        icon={ICONS.calendar}
        open={open}
        onPress={openPicker}
      />

      <Sheet
        visible={open}
        onClose={close}
        title={meta.label}
        footer={
          <>
            <Button
              title="Done"
              onPress={() => {
                onChange(toDate(draft));
                close();
              }}
            />
            {meta.optional && value ? (
              <Button
                title="Clear date"
                variant="link"
                onPress={() => {
                  onChange(null);
                  close();
                }}
              />
            ) : null}
          </>
        }>
        <View className="gap-5 px-6 pb-2">
          <Text variant="display" className="text-center" accessibilityLiveRegion="polite" numberOfLines={1} adjustsFontSizeToFit>
            {formatDate(toDate(draft))}
          </Text>
          <View className="flex-row gap-2">
            <Wheel
              loop
              labels={DAY_LABELS}
              selected={draft.day - 1}
              onSelect={(index) => choose({ ...draft, day: index + 1 })}
              accessibilityLabel="Day"
            />
            <Wheel
              loop
              labels={MONTH_LABELS}
              selected={draft.month}
              onSelect={(index) => choose({ ...draft, month: index })}
              accessibilityLabel="Month"
            />
            <Wheel
              labels={yearLabels}
              selected={Math.min(Math.max(draft.year - firstYear, 0), yearLabels.length - 1)}
              onSelect={(index) => choose({ ...draft, year: firstYear + index })}
              accessibilityLabel="Year"
            />
          </View>
        </View>
      </Sheet>
    </View>
  );
}
