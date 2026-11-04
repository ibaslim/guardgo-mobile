import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useFormState, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';

/** A card for one document in a list, with its title and a Remove button when it can be removed. */
export function DocumentCard({ title, onRemove, children }: { title: string; onRemove?: () => void; children: ReactNode }) {
  return (
    <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <View className="flex-row items-center justify-between gap-3">
        <Text variant="heading" className="flex-1">
          {title}
        </Text>
        {onRemove ? <Button title="Remove" variant="danger" size="sm" icon={ICONS.trash} onPress={onRemove} /> : null}
      </View>
      {children}
    </View>
  );
}

/** The message for the whole list (like "At least one license is required"), if there is one. */
export function ListError<T extends FieldValues>({
  form,
  name,
}: {
  // `any` for the context and parsed-output types, like the other connected fields.
  form: { control: Control<T, any, any> };
  name: FieldPath<T>;
}) {
  const { errors } = useFormState({ control: form.control, name });
  const error = errors[name] as { message?: string; root?: { message?: string } } | undefined;
  const message = error?.message ?? error?.root?.message;
  if (!message) return null;
  return (
    <Text variant="small" tone="danger" accessibilityRole="alert">
      {message}
    </Text>
  );
}
