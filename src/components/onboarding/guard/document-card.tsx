import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useFormState } from 'react-hook-form';

import type { GuardForm } from '@/components/onboarding/guard/guard-form';
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

type ListName = 'identification' | 'security_licenses' | 'police_clearances' | 'training_certificates';

/** The message for the whole list (like "At least one license is required"), if there is one. */
export function ListError({ form, name }: { form: GuardForm; name: ListName }) {
  const { errors } = useFormState({ control: form.control, name });
  const message = errors[name]?.message ?? errors[name]?.root?.message;
  if (!message) return null;
  return (
    <Text variant="small" tone="danger" accessibilityRole="alert">
      {message}
    </Text>
  );
}
