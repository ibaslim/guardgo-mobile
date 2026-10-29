import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { AreaIcon } from '@/types/roles';

export type ListGroupProps = {
  title?: string;
  children: ReactNode;
};

/** Rows grouped on one surface with dividers between them, like a settings list. */
export function ListGroup({ title, children }: ListGroupProps) {
  const rows = Children.toArray(children);
  return (
    <View className="gap-2">
      {title ? (
        <Text variant="label" tone="muted" className="px-1">
          {title}
        </Text>
      ) : null}
      <View className="overflow-hidden rounded-lg border border-border bg-surface">
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <View className="ml-4 h-px bg-border" /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

export type ListRowProps = {
  title: string;
  description?: string;
  icon?: AreaIcon;
  /** Shown on the right, e.g. a date. Pass a node for badges. */
  value?: ReactNode;
  onPress?: () => void;
};

export function ListRow({ title, description, icon, value, onPress }: ListRowProps) {
  const content = (
    <>
      {icon ? <Icon icon={icon} tone="primary" /> : null}
      <View className="flex-1 gap-0.5">
        <Text variant="label">{title}</Text>
        {description ? (
          <Text variant="small" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      {typeof value === 'string' ? (
        <Text variant="small" tone="secondary">
          {value}
        </Text>
      ) : (
        value
      )}
      {onPress ? (
        <Text variant="heading" tone="muted" accessible={false}>
          ›
        </Text>
      ) : null}
    </>
  );

  const className = 'min-h-14 flex-row items-center gap-3 px-4 py-3';

  if (!onPress) {
    return <View className={className}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={description}
      onPress={onPress}
      className={`${className} active:bg-surface-subtle`}>
      {content}
    </Pressable>
  );
}
