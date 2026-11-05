import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

export type CardProps = {
  /** Shown above the content, separated from it by a divider. */
  title?: string;
  children: ReactNode;
  className?: string;
};

/** A surface with a border and soft shadow, like the cards on the form screens. */
export function Card({ title, children, className }: CardProps) {
  return (
    <View className={`overflow-hidden rounded-xl border border-border bg-surface shadow-sm ${className ?? ''}`}>
      {title ? (
        <View className="border-b border-border px-4 py-3">
          <Text variant="label" accessibilityRole="header" className="font-sans-semibold">
            {title}
          </Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}
