import { Fragment, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { InvoiceRow } from '@/components/invoices/invoice-row';
import { InvoiceSheet } from '@/components/invoices/invoice-sheet';
import { TabScreen } from '@/components/ui/tab-screen';
import { Text } from '@/components/ui/text';
import { useInvoices } from '@/hooks/use-invoices';
import { useRoleArea } from '@/hooks/use-session';
import type { Invoice } from '@/types/invoice';
import { formatMoney } from '@/utils/format';
import { formatHours, groupByMonth, invoiceTotals } from '@/utils/invoice-view';

/**
 * The Invoices tab of a guard or a service provider, set like a ledger: this month's pay first, then
 * the invoices under the month they belong to, newest first. Tapping one opens its pay stub.
 */
export function InvoicesScreen() {
  const { data, error, refreshing, loadingMore, refresh, loadMore } = useInvoices();
  const [open, setOpen] = useState<Invoice | null>(null);
  const provider = useRoleArea() === 'provider';

  const items = data?.items;
  const totals = useMemo(() => invoiceTotals(items ?? []), [items]);
  const months = useMemo(() => groupByMonth(items ?? []), [items]);

  const monthName = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const facts = [
    { label: 'Hours', value: formatHours(totals.monthHours) },
    { label: 'Average rate', value: totals.averageRate > 0 ? `${formatMoney(totals.averageRate, totals.currency)} / hr` : '—' },
    { label: 'Invoices', value: String(data?.totalItems ?? 0) },
  ];

  return (
    <TabScreen title="Invoices" hideHeader refreshing={refreshing} onRefresh={refresh} onEndReached={loadMore}>
      <View className="h-2" />
      <View className="gap-1 pb-2">
        <Text variant="title" accessibilityRole="header">
          {monthName}
        </Text>
        <Text variant="small" tone="secondary" className="pt-3">
          Expected pay
        </Text>
        <Text
          variant="display"
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityLabel={`Expected pay in ${monthName}: ${formatMoney(totals.monthPay, totals.currency)}`}
          className="font-sans-semibold tabular-nums">
          {data ? formatMoney(totals.monthPay, totals.currency) : '—'}
        </Text>
      </View>

      {data && data.items.length > 0 ? (
        <View className="flex-row border-y border-border py-3">
          {facts.map((fact, index) => (
            <View
              key={fact.label}
              accessible
              accessibilityLabel={`${fact.label}: ${fact.value}`}
              className={`min-w-0 flex-1 gap-0.5 ${index > 0 ? 'border-l border-border pl-4' : ''}`}>
              <Text variant="label" numberOfLines={1} adjustsFontSizeToFit className="font-sans-semibold tabular-nums">
                {fact.value}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {fact.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {error ? (
        <Text tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {data === null && !error ? (
        <View className="items-center py-10" accessibilityLiveRegion="polite">
          <ActivityIndicator colorClassName="accent-primary" />
        </View>
      ) : null}

      {data !== null && data.items.length === 0 ? (
        <Text tone="secondary" className="pt-2">
          {provider ? "No invoices yet. They appear here once your guards' coverage is scheduled or completed." : 'No invoices yet. They appear here once your coverage is scheduled or completed.'}
        </Text>
      ) : null}

      {months.map((month) => (
        <View key={month.key}>
          <View className="flex-row items-baseline justify-between gap-4 border-b border-border pb-2 pt-4">
            <Text variant="label" accessibilityRole="header" className="font-sans-semibold">
              {month.label}
            </Text>
            <Text variant="small" tone="muted" className="tabular-nums">
              {formatMoney(month.total, month.currency)}
            </Text>
          </View>
          {month.invoices.map((invoice, index) => (
            <Fragment key={invoice.id}>
              {index > 0 ? <View className="h-px bg-border" /> : null}
              <InvoiceRow invoice={invoice} onOpen={() => setOpen(invoice)} />
            </Fragment>
          ))}
        </View>
      ))}

      {loadingMore ? (
        <View className="items-center py-4" accessibilityLiveRegion="polite">
          <ActivityIndicator colorClassName="accent-primary" />
        </View>
      ) : null}

      <InvoiceSheet invoice={open} onClose={() => setOpen(null)} />
    </TabScreen>
  );
}
