import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

export type FormSectionProps = {
  title: string;
  /** One line under the title saying what the section is for. */
  description?: string;
  children: ReactNode;
};

/** A titled card that groups related fields on a long form. */
export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <View className="gap-1">
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
        {description ? (
          <Text variant="small" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
