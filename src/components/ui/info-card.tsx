import { Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

export type InfoRow = {
  label: string;
  /** Plain text. A row with no value (and no `node`) is left out. */
  value?: string | null;
  /** Replaces the text, e.g. a badge. */
  node?: ReactNode;
};

export type InfoCardProps = {
  title: string;
  rows: InfoRow[];
};

/**
 * A titled card of read-only facts: the label on the left, the value on the right, one fact per line
 * split by a hairline. Rows without a value are left out, and a card with none is not shown.
 */
export function InfoCard({ title, rows }: InfoCardProps) {
  const shown = rows.filter((row) => row.value || row.node);
  if (shown.length === 0) return null;

  return (
    <Card title={title}>
      {shown.map((row, index) => (
        <Fragment key={row.label}>
          {index > 0 ? <View className="ml-4 h-px bg-border" /> : null}
          <View className="min-h-12 flex-row items-center justify-between gap-4 px-4 py-3">
            <Text variant="label" className="shrink-0">
              {row.label}
            </Text>
            {row.node ?? (
              <Text variant="small" className="min-w-0 flex-1 text-right">
                {row.value}
              </Text>
            )}
          </View>
        </Fragment>
      ))}
    </Card>
  );
}
