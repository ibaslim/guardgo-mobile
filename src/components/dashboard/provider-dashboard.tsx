import { router, type Href } from 'expo-router';
import { useMemo } from 'react';

import { DashboardScreen, toneOf, type DashboardView } from '@/components/dashboard/dashboard-screen';
import { useDashboard } from '@/hooks/use-dashboard';
import { SECTION_SIZE, within24Hours } from '@/services/dashboard-data';
import { loadProviderDashboard } from '@/services/provider-dashboard';
import type { ProviderDashboard } from '@/types/dashboard';
import { attentionOf, invoiceMeta, offerMeta, shiftStaffing, when } from '@/utils/dashboard';
import { badgeKindFor } from '@/utils/badge';
import { formatMoney } from '@/utils/format';

const go = (tab: string) => () => router.navigate(`/provider/${tab}` as Href);

function viewOf(data: ProviderDashboard): DashboardView {
  const { payout } = data;
  return {
    attention: attentionOf([
      [data.actionableOffers.length, 'offer to answer', 'offers to answer'],
      [data.atRiskShifts.length, 'shift at risk', 'shifts at risk'],
    ]),
    metrics: [
      { label: 'Actionable offers', value: data.actionableOffers.length, hint: `${data.dueSoonOffers} due within 24h`, alert: data.dueSoonOffers > 0 },
      { label: 'Reconfirmations', value: data.reconfirmations, hint: `${data.accepted} accepted` },
      { label: 'Committed coverage', value: data.committed, hint: `${data.inProgress} in progress` },
      { label: 'Shifts at risk', value: data.atRiskShifts.length, hint: `${data.clientActionShifts} need follow-up`, alert: data.atRiskShifts.length > 0 },
      { label: 'Active guards', value: data.activeGuards, hint: `${data.pendingGuards} pending` },
      {
        label: 'Average payout rate',
        value: data.averageRate === null ? '—' : formatMoney(data.averageRate, payout.currency),
        hint: `${data.invoiceCount} invoice${data.invoiceCount === 1 ? '' : 's'}`,
      },
      { label: payout.label, value: formatMoney(payout.amount, payout.currency), hint: payout.hint },
    ],
    sections: [
      {
        key: 'offers',
        title: 'Offers to answer',
        empty: 'No offers are waiting for your answer.',
        action: { label: 'See all', onPress: go('requests') },
        rows: data.actionableOffers.slice(0, SECTION_SIZE).map((job) => ({
          key: job.id,
          title: job.title,
          subtitle: `${job.siteName}${job.status === 'reconfirmation_required' ? ' · Reconfirm' : ''}`,
          meta: offerMeta(job),
          tone: within24Hours(job.dueAt) ? 'warning' : 'neutral',
          onPress: go('requests'),
        })),
      },
      {
        key: 'risk',
        title: 'Coverage at risk',
        empty: 'No upcoming shifts are at risk.',
        action: { label: 'See all', onPress: go('requests') },
        rows: data.atRiskShifts.slice(0, SECTION_SIZE).map((shift) => ({
          key: shift.id,
          title: shift.title,
          subtitle: `${shift.siteName} · ${when(shift.start)}`,
          meta: shiftStaffing(shift),
          tone: 'danger',
          onPress: go('requests'),
        })),
      },
      {
        key: 'guards',
        title: 'Guard roster',
        empty: 'No guards are linked or invited yet.',
        action: { label: 'See all', onPress: go('guards') },
        rows: data.recentGuards.map((guard) => ({
          key: guard.id,
          title: guard.name || guard.email,
          subtitle: guard.name ? guard.email : guard.invite && guard.invite !== 'accepted' ? `Invite ${guard.invite}` : 'Profile not finished',
          tone: toneOf(badgeKindFor(guard.status)),
          badge: guard.status || 'invited',
          onPress: go('guards'),
        })),
      },
      {
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
      },
    ],
  };
}

/** Home tab of a service provider: offers to answer, shifts at risk, the guard roster and payouts. */
export function ProviderDashboardScreen() {
  const { data, error, refreshing, refresh } = useDashboard(loadProviderDashboard);
  const view = useMemo(() => (data ? viewOf(data) : null), [data]);
  return <DashboardScreen view={view} error={error} refreshing={refreshing} onRefresh={refresh} />;
}
