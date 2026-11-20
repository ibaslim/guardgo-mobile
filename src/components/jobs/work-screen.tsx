import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { JobCard } from '@/components/jobs/job-card';
import { ShiftsPanel } from '@/components/shifts/shifts-panel';
import { FilterPills } from '@/components/ui/filter-pills';
import { SearchBar } from '@/components/ui/search-bar';
import { TabScreen } from '@/components/ui/tab-screen';
import { Tabs } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { useGuardJobs } from '@/hooks/use-guard-jobs';
import { useGuardShifts } from '@/hooks/use-guard-shifts';
import { useJobResponder } from '@/hooks/use-job-responder';
import type { JobStatus } from '@/services/guard-jobs';

type Section = 'offers' | 'jobs' | 'shifts';

const SECTIONS: readonly { value: Section; label: string }[] = [
  { value: 'offers', label: 'Offers' },
  { value: 'jobs', label: 'Jobs' },
  { value: 'shifts', label: 'Shifts' },
];

type JobsTab = Exclude<JobStatus, 'offered'>;

const JOB_TABS: readonly { value: JobsTab; label: string }[] = [
  { value: 'accepted', label: 'Accepted' },
  { value: 'reconfirmation_required', label: 'Reconfirm' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
];

const EMPTY: Record<string, string> = {
  offered: 'No offers right now. New work sent to your team shows up here.',
  reconfirmation_required: 'Nothing to reconfirm.',
  accepted: 'No accepted jobs yet.',
  in_progress: 'No jobs in progress.',
  completed: 'No completed jobs yet.',
  declined: 'You have not declined any jobs.',
};

/**
 * The Jobs tab of a guard or service provider: offers to answer, the jobs taken on, and the shifts. A guard
 * owned by a service provider gets no offers (the provider rosters them), so it passes `shiftsOnly`.
 */
export function WorkScreen({ shiftsOnly = false }: { shiftsOnly?: boolean }) {
  const [chosen, setSection] = useState<Section>('offers');
  const section: Section = shiftsOnly ? 'shifts' : chosen;
  const [jobsTab, setJobsTab] = useState<JobsTab>('reconfirmation_required');
  const [query, setQuery] = useState('');
  const tab: JobStatus = section === 'jobs' ? jobsTab : 'offered';
  const { data, error, counts, refreshing, loadingMore, refresh, reload, loadMore } = useGuardJobs(tab, query);
  const { respond, busyId, sheet } = useJobResponder(reload);
  const shifts = useGuardShifts(shiftsOnly || section === 'shifts');

  // Offers and reconfirmations wait on an answer, so they carry how many are waiting.
  const sections = SECTIONS.map((item) => {
    const count = item.value === 'offers' ? counts.offered : item.value === 'jobs' ? counts.reconfirmation_required : undefined;
    return count ? { ...item, count } : item;
  });
  const jobTabs = JOB_TABS.map((item) => {
    const count = item.value === 'reconfirmation_required' ? counts[item.value] : undefined;
    return count ? { ...item, count } : item;
  });

  const jobs = data?.items ?? [];
  const searching = query.trim() !== '';

  return (
    <TabScreen
      title="Jobs"
      hideHeader
      refreshing={section === 'shifts' ? shifts.refreshing : refreshing}
      onRefresh={section === 'shifts' ? shifts.refresh : refresh}
      onEndReached={section === 'shifts' ? undefined : loadMore}>
      <View className="h-3" />
      {shiftsOnly ? null : <FilterPills options={sections} value={section} onChange={setSection} />}

      {section === 'shifts' ? (
        <ShiftsPanel shifts={shifts} />
      ) : (
        <>
          <SearchBar value={query} onChangeText={setQuery} placeholder={section === 'offers' ? 'Search offers' : 'Search jobs'} />

          {section === 'jobs' ? <Tabs scrollable bleed={20} options={jobTabs} value={jobsTab} onChange={setJobsTab} /> : null}

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

          {data !== null && jobs.length === 0 ? (
            <View className="rounded-xl border border-dashed border-border bg-surface-muted p-5">
              <Text tone="secondary">{searching ? `No jobs match "${query.trim()}".` : EMPTY[tab]}</Text>
            </View>
          ) : null}

          {jobs.length > 0 ? (
            <View className="gap-3">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  busy={busyId === job.id}
                  onOpen={() => router.push(`/job/${job.id}` as Href)}
                  onAct={(action) => respond(job, action)}
                />
              ))}
            </View>
          ) : null}

          {loadingMore ? (
            <View className="items-center py-4" accessibilityLiveRegion="polite">
              <ActivityIndicator colorClassName="accent-primary" />
            </View>
          ) : null}
        </>
      )}

      {sheet}
    </TabScreen>
  );
}
