import { router, type Href } from 'expo-router';
import { useMemo } from 'react';

import { DashboardScreen, toneOf, type DashboardSectionView, type DashboardView } from '@/components/dashboard/dashboard-screen';
import { useDashboard } from '@/hooks/use-dashboard';
import { SECTION_SIZE, within24Hours } from '@/services/dashboard-data';
import { loadGuardDashboard } from '@/services/guard-dashboard';
import type { GuardDashboard } from '@/types/dashboard';
import { attentionOf, invoiceMeta, offerMeta, token, when } from '@/utils/dashboard';
import { badgeKindFor } from '@/utils/badge';
import { formatMoney } from '@/utils/format';

const go = (tab: string) => () => router.navigate(`/guard/${tab}` as Href);
const openJob = (id: string) => () => router.push(`/job/${id}` as Href);

function viewOf(data: GuardDashboard): DashboardView {
  const managed = data.managedBy !== null;
  const { payout } = data;

  const closing: DashboardSectionView = managed
    ? {
        key: 'managed',
        title: 'Managed account',
        empty: 'Provider-managed account details are not available yet.',
        action: { label: 'See all', onPress: go('account') },
        rows: [
          {
            key: 'provider',
            title: data.managedBy ?? 'Service provider',
            subtitle: 'Your service provider',
            meta: 'Weekly availability, coverage and payout invoices are handled by them.',
            onPress: go('account'),
          },
        ],
      }
    : {
        key: 'invoices',
        title: 'Recent invoices',
        empty: 'No payout invoices have been issued yet.',
        action: { label: 'See all', onPress: go('invoices') },
        rows: data.recentInvoices.map((invoice) => ({
          key: invoice.id,
          title: invoice.number || invoice.title,
          subtitle: `${invoice.title}${invoice.period ? ` · ${invoice.period}` : ''}`,
          meta: invoiceMeta(invoice),
          tone: toneOf(badgeKindFor(invoice.status)),
          badge: invoice.status || undefined,
          onPress: go('invoices'),
        })),
      };

  return {
    attention: attentionOf([
      [data.actionableOffers.length, 'offer to answer', 'offers to answer'],
      [data.atRiskShifts, 'shift needs attention', 'shifts need attention'],
    ]),
    metrics: [
      { label: 'Actionable offers', value: data.actionableOffers.length, hint: `${data.dueSoonOffers} due within 24h`, alert: data.dueSoonOffers > 0 },
      { label: 'Reconfirmations', value: data.reconfirmations, hint: `${data.accepted} accepted` },
      { label: 'Committed jobs', value: data.committed, hint: `${data.inProgress} in progress` },
      { label: 'Upcoming shifts', value: data.upcomingShifts.length, hint: `${data.shiftsToday} today` },
      { label: 'Live shift work', value: data.liveShifts, hint: `${data.atRiskShifts} need attention`, alert: data.atRiskShifts > 0 },
      ...(managed
        ? [{ label: 'Managed by provider', value: data.managedBy ?? '', hint: 'Set by your provider' }]
        : [
            {
              label: 'Average payout rate',
              value: data.averageRate === null ? '—' : formatMoney(data.averageRate, payout.currency),
              hint: `${data.invoiceCount} invoice${data.invoiceCount === 1 ? '' : 's'}`,
            },
            { label: payout.label, value: formatMoney(payout.amount, payout.currency), hint: payout.hint },
          ]),
    ],
    sections: [
      {
        key: 'offers',
        title: 'Offers to answer',
        empty: 'No offers are waiting for your answer.',
        action: { label: 'See all', onPress: go('jobs') },
        rows: data.actionableOffers.slice(0, SECTION_SIZE).map((job) => ({
          key: job.id,
          title: job.title,
          subtitle: `${job.siteName}${job.status === 'reconfirmation_required' ? ' · Reconfirm' : ''}`,
          meta: offerMeta(job, managed ? 'Payout managed by provider' : undefined),
          tone: within24Hours(job.dueAt) ? 'warning' : 'neutral',
          onPress: openJob(job.id),
        })),
      },
      {
        key: 'shifts',
        title: 'Upcoming assignments',
        empty: 'No assigned shifts in the next 7 days.',
        action: { label: 'See all', onPress: go('jobs') },
        rows: data.upcomingShifts.map((shift) => ({
          key: shift.id,
          title: shift.title,
          subtitle: `${shift.siteName} · ${when(shift.start)}`,
          meta: `${shift.staffed}/${shift.required} staffed · ${token(shift.status)}`,
          tone: shift.status === 'in_progress' ? 'success' : 'neutral',
          onPress: go('jobs'),
        })),
      },
      {
        key: 'activity',
        title: 'Recent job activity',
        empty: 'No job activity yet.',
        action: { label: 'See all', onPress: go('jobs') },
        rows: data.recentJobs.map((job) => ({
          key: job.id,
          title: job.title,
          subtitle: job.siteName,
          meta: `Updated ${when(job.updatedAt)}`,
          tone: toneOf(badgeKindFor(job.status)),
          badge: token(job.status),
          onPress: openJob(job.id),
        })),
      },
      closing,
    ],
  };
}

/** Home tab of a guard: offers to answer, upcoming shifts, recent jobs, and payouts (or the provider managing them). */
export function GuardDashboardScreen() {
  const { data, error, refreshing, refresh } = useDashboard(loadGuardDashboard);
  const view = useMemo(() => (data ? viewOf(data) : null), [data]);
  return <DashboardScreen view={view} error={error} refreshing={refreshing} onRefresh={refresh} />;
}
