import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { Invoice } from '@/services/invoices';
import { formatMoney } from '@/utils/format';
import { formatHours, invoicePeriod, invoiceStatusLabel, tokenLabel } from '@/utils/invoice-view';

export type InvoiceRowProps = {
  invoice: Invoice;
  onOpen: () => void;
};

/** What is worth flagging on a row: a revised invoice, or one changed by platform adjustments. */
function flag(invoice: Invoice) {
  if (invoice.status === 'revised') return invoiceStatusLabel(invoice.status);
  if (invoice.adjustmentCount > 0) return invoice.adjustmentCount === 1 ? 'Adjusted' : `${invoice.adjustmentCount} adjustments`;
  return '';
}

/**
 * One invoice as a line in the ledger: the job and where and when on the left, what it pays on the
 * right. Status and contract type are quiet text; only a revision or an adjustment gets a dot.
 */
export function InvoiceRow({ invoice, onOpen }: InvoiceRowProps) {
  const flagged = flag(invoice);
  const detail = [invoice.siteName, invoicePeriod(invoice)].join(' · ');
  const meta = [invoice.contractType ? tokenLabel(invoice.contractType) : '', formatHours(invoice.hours)].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${invoice.title}. ${formatMoney(invoice.amount, invoice.currency)}. ${detail}${flagged ? `. ${flagged}` : ''}`}
      onPress={onOpen}
      className="-mx-2 flex-row items-start gap-4 rounded-lg px-2 py-3 active:bg-surface-muted">
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="label" numberOfLines={1} className="font-sans-semibold text-base">
          {invoice.title}
        </Text>
        <Text variant="small" tone="secondary" numberOfLines={2}>
          {detail}
        </Text>
        <View className="flex-row items-center gap-1.5">
          {flagged ? <View className="size-1.5 rounded-full bg-badge-warning" /> : null}
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {flagged ? `${flagged} · ${meta}` : meta}
          </Text>
        </View>
      </View>
      <Text variant="heading" numberOfLines={1} className="font-sans-semibold tabular-nums">
        {formatMoney(invoice.amount, invoice.currency)}
      </Text>
    </Pressable>
  );
}
