import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { LeaderRow } from '@/components/invoices/leader-row';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useRoleArea } from '@/hooks/use-session';
import { getInvoice, invoicesErrorMessage } from '@/services/invoices';
import type { Invoice } from '@/types/invoice';
import { formatDate, formatMoney } from '@/utils/format';
import { formatHours, invoicePeriod, invoiceStatusLabel, lineWhen, tokenLabel } from '@/utils/invoice-view';

export type InvoiceSheetProps = {
  /** The invoice from the list, shown at once while the full one (with its lines) loads. */
  invoice: Invoice | null;
  onClose: () => void;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-1">
      <Text variant="label" accessibilityRole="header" className="border-b border-border pb-2 font-sans-semibold">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** The full invoice, set as a pay stub: what it pays, how that adds up, and the days behind it. */
export function InvoiceSheet({ invoice, onClose }: InvoiceSheetProps) {
  // Keyed by invoice id, so the details of one invoice never show under another.
  const [loaded, setLoaded] = useState<{ id: string; invoice: Invoice } | null>(null);
  const [failed, setFailed] = useState<{ id: string; message: string } | null>(null);
  const id = invoice?.id ?? null;
  // A provider commits guards to a job; a guard commits themselves to a position.
  const provider = useRoleArea() === 'provider';
  const unit = provider ? 'guard' : 'position';

  useEffect(() => {
    if (!id) return;
    let live = true;
    getInvoice(id).then(
      (result) => live && setLoaded({ id, invoice: result }),
      (failure) => live && setFailed({ id, message: invoicesErrorMessage(failure, "Couldn't load the invoice details.") })
    );
    return () => {
      live = false;
    };
  }, [id]);

  const full = loaded && loaded.id === id ? loaded.invoice : null;
  const error = failed && failed.id === id ? failed.message : null;
  const shown = full ?? invoice;
  const money = (value: number) => formatMoney(value, shown?.currency ?? 'CAD');

  const status = shown && shown.status !== 'issued' ? invoiceStatusLabel(shown.status) : '';
  const facts = shown
    ? [status, shown.contractType ? tokenLabel(shown.contractType) : '', shown.coverageStatus ? tokenLabel(shown.coverageStatus) : '']
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <Sheet
      visible={invoice !== null}
      onClose={onClose}
      title={shown?.number || 'Invoice'}
      size="tall"
      footer={<Button title="Close" variant="secondary" onPress={onClose} />}>
      {shown ? (
        <ScrollView contentContainerClassName="gap-6 px-6 pb-4" showsVerticalScrollIndicator={false}>
          <View className="gap-1">
            <Text variant="small" tone="secondary">
              Expected payment
            </Text>
            <Text variant="display" numberOfLines={1} adjustsFontSizeToFit className="font-sans-semibold tabular-nums">
              {money(shown.amount)}
            </Text>
            <Text variant="label" className="pt-2">
              {shown.title}
            </Text>
            <Text variant="small" tone="secondary">
              {shown.siteName}
            </Text>
            {facts ? (
              <Text variant="caption" tone="muted">
                {facts}
              </Text>
            ) : null}
          </View>

          <Section title="How it adds up">
            <LeaderRow label="Schedule pay" value={money(shown.baseline)} />
            <LeaderRow label="Platform adjustments" value={money(shown.adjustmentTotal)} />
            <View className="my-1 h-px bg-border-strong" />
            <LeaderRow strong label="Expected payment" value={money(shown.amount)} />
          </Section>

          <Section title="Billing">
            <LeaderRow label="Period" value={invoicePeriod(shown)} />
            <LeaderRow label="Planned hours" value={formatHours(shown.hours)} />
            <LeaderRow label="Hourly rate" value={shown.hourlyRate > 0 ? money(shown.hourlyRate) : '—'} />
            {shown.positions !== null ? <LeaderRow label={provider ? 'Guards committed' : 'Committed positions'} value={String(shown.positions)} /> : null}
            {shown.createdAt ? <LeaderRow label="Issued" value={formatDate(shown.createdAt)} /> : null}
          </Section>

          {shown.note ? (
            <Text variant="small" tone="secondary">
              {shown.note}
            </Text>
          ) : null}

          {error ? (
            <Text tone="danger" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          {full === null && !error ? (
            <View className="items-center py-4" accessibilityLiveRegion="polite">
              <ActivityIndicator colorClassName="accent-primary" />
            </View>
          ) : null}

          {full && full.adjustments.length > 0 ? (
            <Section title="Platform adjustments">
              {full.adjustments.map((adjustment, index) => (
                <View key={adjustment.id || index} className="gap-0.5 py-1.5">
                  <LeaderRow label={adjustment.reason} value={money(adjustment.amount)} />
                  <Text variant="caption" tone="muted">
                    {adjustment.status === 'approved' ? '' : `${adjustment.status === 'draft' ? 'Waiting for approval, not included' : 'Cancelled, not included'} · `}
                    {adjustment.by}
                    {adjustment.createdAt ? ` · ${formatDate(adjustment.createdAt)}` : ''}
                  </Text>
                </View>
              ))}
            </Section>
          ) : null}

          {full ? (
            <Section title="Days worked">
              {full.lines.length === 0 ? (
                <Text variant="small" tone="secondary" className="pt-2">
                  No payout lines on this invoice yet.
                </Text>
              ) : (
                full.lines.map((line, index) => (
                  <Fragment key={index}>
                    {index > 0 ? <View className="h-px bg-border" /> : null}
                    <View className="py-1.5">
                      <LeaderRow label={line.date ? formatDate(line.date) : line.description} value={money(line.amount)} />
                      <Text variant="caption" tone="muted">
                        {[
                          line.start && line.end ? lineWhen({ ...line, date: null }) : '',
                          formatHours(line.hours),
                          `${money(line.rate)} / hr`,
                          line.positions !== null ? `${line.positions} ${unit}${line.positions === 1 ? '' : 's'}` : '',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                  </Fragment>
                ))
              )}
            </Section>
          ) : null}
        </ScrollView>
      ) : null}
    </Sheet>
  );
}
