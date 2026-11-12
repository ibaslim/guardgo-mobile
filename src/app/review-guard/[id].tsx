import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { EditHeading } from '@/components/account/edit-step-shell';
import {
  GuardCoverageForm,
  type CoverageErrors,
  type CoverageValues,
} from '@/components/provider/guard-coverage-form';
import { GuardProfileSummary } from '@/components/provider/guard-profile-summary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormScrollView } from '@/components/ui/form-scroll-view';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useGuardMetadata } from '@/hooks/use-guard-metadata';
import { getAccount } from '@/services/account';
import { availabilityPayload, parseGuardProfile } from '@/services/guard-tenant';
import {
  approveGuard,
  getProviderGuard,
  guardsErrorMessage,
  saveGuardCoverage,
  type ProviderGuardDetail,
} from '@/services/provider-guards';
import { EMPTY_AVAILABILITY } from '@/schemas/guard-onboarding';
import { fetchTenantLogo, type TenantImage } from '@/services/tenant';
import { toast } from '@/services/toast';
import { WEEK_DAYS, type GuardMetadata } from '@/types/guard-onboarding';
import { providerCoverage, type CoverageRegion } from '@/utils/provider-coverage';

const IN_REVIEW = 'pending activation';

/** The problems with what the provider entered, or an empty object when it can be saved. */
function validate(value: CoverageValues, regions: CoverageRegion[]): CoverageErrors {
  const errors: CoverageErrors = {};
  if (!value.province) errors.province = 'Choose a province.';
  if (!value.city) errors.city = 'Choose a city.';

  const radius = Number(value.radius);
  const limit = regions.find((region) => region.code === value.province)?.cities.find((city) => city.code === value.city)?.radiusKm;
  if (!value.radius.trim() || !Number.isFinite(radius) || radius < 1) errors.radius = 'Enter a radius of at least 1 km.';
  else if (limit && radius > limit) errors.radius = `The radius can't be more than ${limit} km, your coverage in this city.`;

  const days = WEEK_DAYS.map((name) => value.availability[name]).filter((day) => day.enabled);
  if (days.length === 0) errors.availability = 'Choose at least one day.';
  else if (days.some((day) => day.ranges.some((range) => !range.start || !range.end))) {
    errors.availability = 'Fill in both times for every range, or remove it.';
  }
  return errors;
}

type ReviewFormProps = {
  guard: ProviderGuardDetail;
  photo: TenantImage | null;
  regions: CoverageRegion[];
  metadata: GuardMetadata;
};

/** The review itself, once the guard, the provider's coverage and the option lists have loaded. */
function ReviewForm({ guard, photo, regions, metadata }: ReviewFormProps) {
  const saved = useMemo(() => parseGuardProfile(guard.profile, metadata) ?? {}, [guard, metadata]);

  // Start from what is already saved, as long as it is somewhere the provider covers.
  const [value, setValue] = useState<CoverageValues>(() => {
    const inCoverage = regions.some(
      (region) => region.code === saved.operational_province && region.cities.some((city) => city.code === saved.operational_city)
    );
    return {
      province: inCoverage ? (saved.operational_province ?? null) : null,
      city: inCoverage ? (saved.operational_city ?? null) : null,
      radius: inCoverage ? (saved.radius_km ?? '') : '',
      availability: saved.weekly_availability ?? structuredClone(EMPTY_AVAILABILITY),
    };
  });
  const [errors, setErrors] = useState<CoverageErrors>({});
  const [busy, setBusy] = useState<'save' | 'approve' | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const title = saved.full_name || guard.email || 'Guard';
  const inReview = guard.status === IN_REVIEW;

  /** Checks and saves the work area and availability. Returns false when something is wrong. */
  async function saveCoverage() {
    const found = validate(value, regions);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.warning('Some details need your attention.');
      return false;
    }
    try {
      await saveGuardCoverage(guard.id, {
        regionCode: value.province!,
        cityCode: value.city!,
        radiusKm: Number(value.radius),
        weeklyAvailability: availabilityPayload(value.availability),
      });
      return true;
    } catch (failure) {
      toast.failure(guardsErrorMessage(failure, "Couldn't save the work area."));
      return false;
    }
  }

  async function onSave() {
    setBusy('save');
    if (await saveCoverage()) toast.success('Changes saved.');
    setBusy(null);
  }

  async function onApprove() {
    setBusy('approve');
    try {
      // Saved first: the server won't approve a guard without a work area and availability.
      if (!(await saveCoverage())) return;
      await approveGuard(guard.id);
      toast.success(`${title} approved.`);
      router.back();
    } catch (failure) {
      toast.failure(guardsErrorMessage(failure, "Couldn't approve this guard."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <EditHeading title={title} />
      <FormScrollView contentContainerStyle={{ gap: 24, padding: 24, paddingBottom: 40 }}>
        <View className="flex-row flex-wrap items-center gap-3">
          <Badge label={guard.status || 'unknown'} kind={inReview ? 'warning' : undefined} />
          {guard.email ? (
            <Text variant="small" tone="muted" className="shrink">
              {guard.email}
            </Text>
          ) : null}
        </View>

        <View className="gap-3">
          <Text variant="heading">What the guard entered</Text>
          <GuardProfileSummary values={saved} metadata={metadata} photo={photo} />
        </View>

        <View className="gap-3">
          <View className="gap-1">
            <Text variant="heading">Set by you</Text>
            <Text variant="small" tone="muted">
              As their service provider, you choose where this guard works and when. Both are needed before approval.
            </Text>
          </View>
          <GuardCoverageForm
            regions={regions}
            metadata={metadata}
            value={value}
            onChange={(next) => {
              setValue(next);
              setErrors({});
            }}
            errors={errors}
          />
        </View>

        <View className="gap-3">
          <Button
            title="Save changes"
            variant={inReview ? 'secondary' : 'primary'}
            size="lg"
            onPress={onSave}
            loading={busy === 'save'}
            disabled={busy !== null}
          />
          {inReview ? (
            <Button title="Approve guard" size="lg" onPress={() => setConfirmOpen(true)} loading={busy === 'approve'} disabled={busy !== null} />
          ) : null}
        </View>
      </FormScrollView>

      <ConfirmDialog
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Approve guard?"
        message={`${title} will become active and can be rostered on shifts.`}
        confirmLabel="Approve"
        onConfirm={onApprove}
      />
    </Screen>
  );
}

type Loaded = { guard: ProviderGuardDetail; photo: TenantImage | null; regions: CoverageRegion[] };

/**
 * Review of a guard waiting for approval, for the service provider that owns them. It shows what the
 * guard entered in onboarding, and lets the provider set the work area and weekly availability the
 * server requires before the guard can be approved.
 */
export default function ReviewGuardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { metadata, failed: metadataFailed, retry: retryMetadata } = useGuardMetadata();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([getProviderGuard(id), getAccount(), fetchTenantLogo(id)])
      .then(([guard, account, photo]) => {
        if (!active) return;
        setLoaded({ guard, photo, regions: providerCoverage(account.tenant.profile) });
        setLoadFailed(false);
      })
      .catch(() => active && setLoadFailed(true));
    return () => {
      active = false;
    };
  }, [id, attempt]);

  if (loadFailed || metadataFailed) {
    return (
      <Screen>
        <EditHeading title="Guard details" />
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text variant="heading" className="text-center">
            Could not load this guard
          </Text>
          <Text tone="secondary" className="text-center">
            Check your connection and try again.
          </Text>
          <Button
            title="Try again"
            variant="secondary"
            onPress={() => {
              if (metadataFailed) retryMetadata();
              setAttempt((count) => count + 1);
            }}
          />
        </View>
      </Screen>
    );
  }

  if (!loaded || !metadata) {
    return (
      <Screen>
        <EditHeading title="Guard details" />
        <View className="flex-1 items-center justify-center gap-3" accessibilityLiveRegion="polite">
          <ActivityIndicator colorClassName="accent-primary" />
          <Text tone="muted">Loading…</Text>
        </View>
      </Screen>
    );
  }

  return <ReviewForm guard={loaded.guard} photo={loaded.photo} regions={loaded.regions} metadata={metadata} />;
}
