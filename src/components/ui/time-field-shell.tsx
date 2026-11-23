import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { PickerTrigger } from '@/components/ui/picker-trigger';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import type { TimeDraft } from '@/types/time';
import type { FieldMeta } from '@/types/ui';
import { DEFAULT_TIME_DRAFT, draftToLabel, draftToText, textToDraft } from '@/utils/time-draft';

export type TimeFieldProps = FieldMeta & {
  /** "09:30 AM", or an empty string when no time is chosen. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

type TimeFieldShellProps = TimeFieldProps & {
  /** The picker itself. It edits the draft; Done saves it. */
  children: (draft: TimeDraft, setDraft: (next: TimeDraft) => void) => ReactNode;
};

/**
 * What every time picker shares: the field showing the chosen time ("9:30 PM"), and a sheet with a live readout and Done / Clear buttons. A picker supplies the
 * controls that change the draft.
 */
export function TimeFieldShell({ value, onChange, placeholder = 'Select', children, ...meta }: TimeFieldShellProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TimeDraft>(DEFAULT_TIME_DRAFT);
  const current = textToDraft(value);

  function openPicker() {
    setDraft(current ?? DEFAULT_TIME_DRAFT);
    setOpen(true);
  }

  return (
    <View>
      <PickerTrigger
        {...meta}
        valueLabel={current ? draftToLabel(current) : null}
        placeholder={placeholder}
        icon={ICONS.clock}
        open={open}
        onPress={openPicker}
      />

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={meta.label}
        footer={
          <>
            <Button
              title="Done"
              onPress={() => {
                onChange(draftToText(draft));
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
            {draftToLabel(draft)}
          </Text>
          {children(draft, setDraft)}
        </View>
      </Sheet>
    </View>
  );
}
