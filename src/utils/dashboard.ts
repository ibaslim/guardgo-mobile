import type { DashboardInvoice, DashboardJob, DashboardShift } from '@/services/dashboard-data';
import { formatDate, formatMoney, formatTime } from '@/utils/format';

/** "reconfirmation_required" -> "Reconfirmation required" */
export const token = (value: string) => value.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase());

/** "12 Mar 2026, 9:30 AM" */
export const when = (value: Date | null, empty = 'No date') => (value ? `${formatDate(value)}, ${formatTime(value)}` : empty);

export const hours = (value: number) => `${Math.round(value * 100) / 100} hrs`;

/** The hourly pay on an offer and when to answer it. `payout` replaces the pay for guards a provider pays. */
export function offerMeta(job: DashboardJob, payout?: string) {
  const pay = payout ?? (job.hourlyPay === null ? 'Pay pending' : `${formatMoney(job.hourlyPay)} / hr`);
  return `${pay} · Reply by ${when(job.dueAt, 'no deadline')}`;
}

/** How many are staffed on a shift, and why it counts as at risk. */
export function shiftStaffing(shift: DashboardShift) {
  const reasons: string[] = [];
  if (shift.staffed < shift.required) reasons.push('coverage gap');
  if (shift.status === 'partially_staffed') reasons.push('partially staffed');
  if (shift.clientActionRequired) reasons.push('client action needed');
  return `${shift.staffed}/${shift.required} staffed${reasons.length ? ` · ${reasons.join(' · ')}` : ''}`;
}

export function invoiceMeta(invoice: DashboardInvoice) {
  return `${formatMoney(invoice.amount, invoice.currency)} · ${hours(invoice.hours)}`;
}

/** What needs action, as a total and a line each: `[2, 'offer to answer', 'offers to answer']`. Zero counts are left out. */
export function attentionOf(parts: readonly (readonly [count: number, one: string, many: string])[]) {
  const present = parts.filter(([count]) => count > 0);
  return {
    count: present.reduce((total, [count]) => total + count, 0),
    items: present.map(([count, one, many]) => `${count} ${count === 1 ? one : many}`),
  };
}
