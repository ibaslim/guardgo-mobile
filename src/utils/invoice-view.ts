import type { Invoice, InvoiceMonth } from '@/types/invoice';
import { formatDate, formatTime } from '@/utils/format';

/** "Long Term" from "long_term". */
export function tokenLabel(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** "8 hrs", "7.5 hrs". */
export function formatHours(hours: number) {
  const rounded = Math.round(hours * 100) / 100;
  return `${rounded} ${rounded === 1 ? 'hr' : 'hrs'}`;
}

export function invoiceStatusLabel(status: string) {
  return status ? tokenLabel(status) : 'Issued';
}

/** The text under an invoice's title: its period, or how it is billed when it has no period label. */
export function invoicePeriod(invoice: Invoice) {
  return invoice.period || (invoice.billingCycle ? tokenLabel(invoice.billingCycle) : 'Coverage payout');
}

/** "Mon, 12 Mar 2026 · 9:00 PM to 5:00 AM" for one line of an invoice. */
export function lineWhen(line: Invoice['lines'][number]) {
  const day = line.date ? formatDate(line.date) : '';
  if (!line.start || !line.end) return day;
  return `${day}${day ? ' · ' : ''}${formatTime(line.start)} to ${formatTime(line.end)}`;
}

export function isThisMonth(date: Date | null) {
  const now = new Date();
  return date !== null && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

/** The date an invoice is filed under: the start of its billing period. */
export const invoiceDate = (invoice: Invoice) => invoice.periodStart ?? invoice.createdAt;

/** The invoices grouped by the month of their period, in the order given (newest first). */
export function groupByMonth(invoices: Invoice[]): InvoiceMonth[] {
  const months: InvoiceMonth[] = [];
  for (const invoice of invoices) {
    const date = invoiceDate(invoice);
    const key = date ? `${date.getFullYear()}-${date.getMonth()}` : 'unknown';
    let month = months.find((item) => item.key === key);
    if (!month) {
      const label = date ? date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Undated';
      month = { key, label, total: 0, currency: invoice.currency, invoices: [] };
      months.push(month);
    }
    month.total += invoice.amount;
    month.invoices.push(invoice);
  }
  return months;
}

/** The figures at the top of the screen, from the invoices loaded so far. */
export function invoiceTotals(invoices: Invoice[]) {
  const month = invoices.filter((invoice) => isThisMonth(invoiceDate(invoice)));
  const rates = invoices.map((invoice) => invoice.hourlyRate).filter((rate) => rate > 0);
  return {
    monthPay: month.reduce((sum, invoice) => sum + invoice.amount, 0),
    monthHours: month.reduce((sum, invoice) => sum + invoice.hours, 0),
    averageRate: rates.length ? Math.round((rates.reduce((sum, rate) => sum + rate, 0) / rates.length) * 100) / 100 : 0,
    currency: invoices[0]?.currency ?? 'CAD',
  };
}
