import { router, type Href } from 'expo-router';
import { useMemo } from 'react';

import { DashboardScreen, toneOf, type DashboardView } from '@/components/dashboard/dashboard-screen';
import { useDashboard } from '@/hooks/use-dashboard';
import { loadClientDashboard, type ClientDashboard, type DashboardRequest } from '@/services/client-dashboard';
import { attentionOf, shiftStaffing, token, when } from '@/utils/dashboard';
import { badgeKindFor } from '@/utils/badge';
import { formatMoney } from '@/utils/format';

const go = (tab: string) => () => router.navigate(`/client/${tab}` as Href);
const openRequest = (id: string) => () => router.push({ pathname: '/request/[id]', params: { id } });

const requestStaffing = (request: DashboardRequest) =>
  `${request.accepted} accepted · ${request.open} open · ${request.expiresAt ? `Expires ${when(request.expiresAt)}` : 'No deadline'}`;

function viewOf(data: ClientDashboard): DashboardView {
  const { spend } = data;
  return {
    attention: attentionOf([
      [data.inMotion, 'request still staffing', 'requests still staffing'],
      [data.clientActionShifts, 'shift needs your action', 'shifts need your action'],
    ]),
    metrics: [
      { label: 'Draft requests', value: data.drafts, hint: `${data.submitted} submitted` },
      { label: 'Requests in motion', value: data.inMotion, hint: `${data.seekingCoverage} need guards` },
      { label: 'Live assignments', value: data.liveAssignments, hint: `${data.inProgress} on shift now` },
      { label: 'Upcoming shifts', value: data.upcomingShifts, hint: `${data.shiftsToday} today` },
      { label: 'Coverage risk', value: data.coverageRisk, hint: `${data.clientActionShifts} need your action`, alert: data.coverageRisk > 0 },
      { label: spend.label, value: formatMoney(spend.amount), hint: spend.hint },
    ],
    sections: [
      {
        key: 'attention',
        title: 'Requests needing attention',
        empty: 'No requests need your attention.',
        action: { label: 'See all', onPress: go('requests') },
        rows: data.needsAttention.map((request) => ({
          key: request.id,
          title: request.title,
          subtitle: `${request.siteName} · ${token(request.staffing)}`,
          meta: requestStaffing(request),
          tone: request.open > 0 ? 'warning' : 'neutral',
          onPress: openRequest(request.id),
        })),
      },
      {
        key: 'risk',
        title: 'Shift coverage at risk',
        empty: 'No upcoming shifts are at risk.',
        action: { label: 'See all', onPress: go('requests') },
        rows: data.atRiskShifts.map((shift) => ({
          key: shift.id,
          title: shift.title,
          subtitle: `${shift.siteName} · ${when(shift.start)}`,
          meta: shiftStaffing(shift),
          tone: 'danger',
          onPress: go('requests'),
        })),
      },
      {
        key: 'activity',
        title: 'Recent job activity',
        empty: 'No one has responded to your requests yet.',
        action: { label: 'See all', onPress: go('requests') },
        rows: data.recentJobs.map((job) => ({
          key: job.id,
          title: job.title,
          subtitle: `${job.siteName} · ${job.assignee === 'service_provider' ? 'Service provider' : 'Guard'}`,
          meta: `Updated ${when(job.updatedAt)}`,
          tone: toneOf(badgeKindFor(job.status)),
          badge: token(job.status),
          onPress: go('requests'),
        })),
      },
      {
        key: 'billing',
        title: 'Billing signals',
        empty: 'No requests carry invoice or billing details yet.',
        action: { label: 'See all', onPress: go('requests') },
        rows: data.billing.map((request) => ({
          key: request.id,
          title: request.title,
          subtitle: `${request.siteName} · ${request.invoiceNumber || 'Invoice ready'}`,
          meta: formatMoney(request.charge),
          tone: toneOf(badgeKindFor(request.invoiceStatus)),
          badge: token(request.invoiceStatus || 'billing ready'),
          onPress: openRequest(request.id),
        })),
      },
    ],
  };
}

/** Home tab of a client: requests that need attention, shift risk, who is covering, and spend. */
export function ClientDashboardScreen() {
  const { data, error, refreshing, refresh } = useDashboard(loadClientDashboard);
  const view = useMemo(() => (data ? viewOf(data) : null), [data]);
  return <DashboardScreen view={view} error={error} refreshing={refreshing} onRefresh={refresh} />;
}
