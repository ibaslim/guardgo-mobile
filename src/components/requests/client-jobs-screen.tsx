import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { JobCard } from '@/components/jobs/job-card';
import { RequestCard } from '@/components/requests/request-card';
import { ShiftsPanel } from '@/components/shifts/shifts-panel';
import { Button } from '@/components/ui/button';
import { Fab } from '@/components/ui/fab';
import { FilterPills } from '@/components/ui/filter-pills';
import { SearchBar } from '@/components/ui/search-bar';
import { TabScreen } from '@/components/ui/tab-screen';
import { Tabs } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { useGuardJobs } from '@/hooks/use-guard-jobs';
import { useGuardShifts } from '@/hooks/use-guard-shifts';
import { useRequests } from '@/hooks/use-requests';
import type { JobStatus } from '@/types/job';
import type { RequestGroup, RequestSummary } from '@/types/request';
import { inGroup } from '@/utils/request-status';

type Section = 'requests' | 'jobs' | 'calendar';

const SECTIONS: readonly { value: Section; label: string }[] = [
  { value: 'requests', label: 'Requests' },
  { value: 'jobs', label: 'Jobs' },
  { value: 'calendar', label: 'Calendar' },
];

const GROUPS: readonly { value: RequestGroup; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'draft', label: 'Drafts' },
  { value: 'done', label: 'Done' },
];

const EMPTY_REQUESTS: Record<RequestGroup, string> = {
  live: 'No live requests. Create one to start finding guards.',
  draft: 'No drafts. Unfinished requests are kept here.',
  done: 'Cancelled and closed requests will show here.',
};

/** What happened to the offers sent for the client's requests, one tab per outcome. */
const JOB_TABS: readonly { value: JobStatus; label: string }[] = [
  { value: 'offered', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
];

const EMPTY_JOBS: Record<string, string> = {
  offered: 'No offers are waiting for an answer.',
  accepted: 'No guards have accepted yet.',
  in_progress: 'No jobs are in progress.',
  completed: 'No completed jobs yet.',
  declined: 'No offers were declined.',
  expired: 'No offers ran out of time without an answer.',
};

export type ClientJobsScreenProps = {
  /** Shown above the sections, e.g. a banner that needs the user right now. */
  banner?: ReactNode;
};

/**
 * The Jobs tab of a client, in three sections: the requests it made (live, drafts, done), the jobs offered
 * for them and how each was answered (pending to expired), and a calendar of the shifts, the same one a guard has.
 * A request, a job and a shift each open on their own screen.
 */
export function ClientJobsScreen({ banner }: ClientJobsScreenProps) {
  const [section, setSection] = useState<Section>('requests');

  const [keyword, setKeyword] = useState('');
  const [group, setGroup] = useState<RequestGroup>('live');
  const requests = useRequests(keyword);

  const [jobsTab, setJobsTab] = useState<JobStatus>('offered');
  const [jobQuery, setJobQuery] = useState('');
  const jobs = useGuardJobs(jobsTab, jobQuery);

  const shifts = useGuardShifts(section === 'calendar');

  const refreshing = section === 'requests' ? requests.refreshing : section === 'jobs' ? jobs.refreshing : shifts.refreshing;
  const refresh = section === 'requests' ? requests.refresh : section === 'jobs' ? jobs.refresh : shifts.refresh;

  const openRequest = (request: RequestSummary) => router.push({ pathname: '/request/[id]', params: { id: request.id } });

  const shownRequests = requests.items.filter((request) => inGroup(request, group));
  const jobTabs = JOB_TABS.map((tab) => (tab.value === 'offered' && jobs.counts.offered ? { ...tab, count: jobs.counts.offered } : tab));
  const jobItems = jobs.data?.items ?? [];

  return (
    <TabScreen
      title="Jobs"
      subtitle="Requests, offers and shifts"
      refreshing={refreshing}
      onRefresh={refresh}
      onEndReached={section === 'jobs' ? jobs.loadMore : undefined}
      floating={section === 'requests' ? <Fab label="New request" onPress={() => router.push('/request-form')} /> : undefined}>
      {banner}
      <FilterPills options={SECTIONS} value={section} onChange={setSection} />

      {section === 'requests' ? (
        <>
          <SearchBar value={keyword} onChangeText={setKeyword} placeholder="Search requests" />
          <Tabs options={GROUPS} value={group} onChange={setGroup} />

          {requests.error ? (
            <Text tone="danger" accessibilityRole="alert">
              {requests.error}
            </Text>
          ) : null}

          {requests.loading ? (
            <View className="items-center py-10" accessibilityLiveRegion="polite">
              <ActivityIndicator colorClassName="accent-primary" />
            </View>
          ) : null}

          {!requests.loading && !requests.error && shownRequests.length === 0 ? (
            <View className="rounded-xl border border-dashed border-border bg-surface-muted p-5">
              <Text tone="secondary">{keyword.trim() ? 'No requests match your search.' : EMPTY_REQUESTS[group]}</Text>
            </View>
          ) : null}

          {shownRequests.length > 0 ? (
            <View className="gap-3">
              {shownRequests.map((request) => (
                <RequestCard key={request.id} request={request} onPress={() => openRequest(request)} />
              ))}
            </View>
          ) : null}

          {requests.hasMore ? (
            <Button title="Load more" variant="secondary" loading={requests.loadingMore} onPress={requests.loadMore} />
          ) : null}
        </>
      ) : null}

      {section === 'jobs' ? (
        <>
          <SearchBar value={jobQuery} onChangeText={setJobQuery} placeholder="Search jobs" />
          <Tabs scrollable bleed={20} options={jobTabs} value={jobsTab} onChange={setJobsTab} />

          {jobs.error ? (
            <Text tone="danger" accessibilityRole="alert">
              {jobs.error}
            </Text>
          ) : null}

          {jobs.data === null && !jobs.error ? (
            <View className="items-center py-10" accessibilityLiveRegion="polite">
              <ActivityIndicator colorClassName="accent-primary" />
            </View>
          ) : null}

          {jobs.data !== null && jobItems.length === 0 ? (
            <View className="rounded-xl border border-dashed border-border bg-surface-muted p-5">
              <Text tone="secondary">{jobQuery.trim() ? `No jobs match "${jobQuery.trim()}".` : EMPTY_JOBS[jobsTab]}</Text>
            </View>
          ) : null}

          {jobItems.length > 0 ? (
            <View className="gap-3">
              {jobItems.map((job) => (
                <JobCard key={job.id} job={job} readOnly onOpen={() => router.push(`/job/${job.id}` as Href)} />
              ))}
            </View>
          ) : null}

          {jobs.loadingMore ? (
            <View className="items-center py-4" accessibilityLiveRegion="polite">
              <ActivityIndicator colorClassName="accent-primary" />
            </View>
          ) : null}
        </>
      ) : null}

      {section === 'calendar' ? <ShiftsPanel shifts={shifts} /> : null}
    </TabScreen>
  );
}
