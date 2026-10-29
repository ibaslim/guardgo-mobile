import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { useCSSVariable, useUniwind } from 'uniwind';

import { Button } from '@/components/ui/button';
import { PickerTrigger } from '@/components/ui/picker-trigger';
import { Sheet } from '@/components/ui/sheet';
import { ICONS } from '@/constants/icons';
import type { FieldMeta } from '@/types/ui';
import { formatDate, formatTime } from '@/utils/format';

export type DateFieldProps = FieldMeta & {
  value: Date | null;
  onChange: (value: Date | null) => void;
  /** Called when the picker closes, so form validation can run. */
  onBlur?: () => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
};

type DateTimeFieldProps = DateFieldProps & { mode: 'date' | 'time' };

const MODES = {
  date: { icon: ICONS.calendar, format: formatDate, placeholder: 'Select date', display: 'inline' },
  time: { icon: ICONS.clock, format: formatTime, placeholder: 'Select time', display: 'spinner' },
} as const;

function DateTimeField({ mode, value, onChange, onBlur, placeholder, minimumDate, maximumDate, ...meta }: DateTimeFieldProps) {
  const { theme } = useUniwind();
  const accent = useCSSVariable('--color-primary');
  const [open, setOpen] = useState(false);
  // iOS edits a draft in the sheet and saves it with Done; the Android dialog has its own buttons.
  const [draft, setDraft] = useState(() => value ?? new Date());
  const config = MODES[mode];

  function openPicker() {
    setDraft(value ?? new Date());
    setOpen(true);
  }

  function close() {
    setOpen(false);
    onBlur?.();
  }

  function save(date: Date) {
    onChange(date);
    close();
  }

  const pickerProps = {
    mode,
    minimumDate,
    maximumDate,
    accentColor: typeof accent === 'string' ? accent : undefined,
  };

  return (
    <View>
      <PickerTrigger
        {...meta}
        valueLabel={value ? config.format(value) : null}
        placeholder={placeholder ?? config.placeholder}
        icon={config.icon}
        open={open}
        onPress={openPicker}
      />

      {Platform.OS === 'android' ? (
        // The Android picker is a dialog that opens on mount; unmount it when it closes.
        open ? (
          <DateTimePicker
            {...pickerProps}
            value={draft}
            presentation="dialog"
            positiveButton={{ label: 'Done' }}
            onValueChange={(_, date) => save(date)}
            onDismiss={close}
          />
        ) : null
      ) : (
        <Sheet
          visible={open}
          onClose={close}
          title={meta.label}
          footer={
            <>
              <Button title="Done" onPress={() => save(draft)} />
              {meta.optional && value ? (
                <Button title={`Clear ${mode}`} variant="link" onPress={() => {
                  onChange(null);
                  close();
                }} />
              ) : null}
            </>
          }>
          <View className="items-center px-3">
            <DateTimePicker
              {...pickerProps}
              value={draft}
              display={config.display}
              themeVariant={theme === 'dark' ? 'dark' : 'light'}
              onValueChange={(_, date) => setDraft(date)}
            />
          </View>
        </Sheet>
      )}
    </View>
  );
}

/** Date field with the platform's native date picker. */
export function DateField(props: DateFieldProps) {
  return <DateTimeField {...props} mode="date" />;
}

/** Time field with the platform's native time picker. The value is a Date; use its hours and minutes. */
export function TimeField(props: DateFieldProps) {
  return <DateTimeField {...props} mode="time" />;
}
