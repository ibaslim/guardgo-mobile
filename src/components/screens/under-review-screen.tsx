import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, RefreshControl, ScrollView, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import { Button } from '@/components/ui/button';
import { Entrance } from '@/components/ui/entrance';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { useLogout } from '@/hooks/use-logout';
import { useSession } from '@/hooks/use-session';
import { syncTenantReview } from '@/services/tenant-review';
import type { TenantReview } from '@/types/auth';

const WINDOW_WIDTH = 84;
const WINDOW_HEIGHT = 104;
const SCAN_TRAVEL = WINDOW_HEIGHT - 3;
const SCAN_LINE_GAP = 5;
const TRAIL_STEPS = 12;
const TRAIL_STEP_HEIGHT = 2;

function initialsOf(name: string | undefined) {
  const parts = (name ?? '').split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? '').slice(0, 2);
  return letters.toUpperCase() || 'G';
}

/**
 * The photo window of the pass, being scanned. A bright beam with a fading trail makes one pass down
 * the window and lights up what it has covered with fine scan lines, like a document scanner. Then
 * the pass fades out, rests a moment and starts again. Four corner marks frame it like a viewfinder.
 * With reduced motion it stands still, part-way through a scan.
 */
function PassWindow({ initials }: { initials: string }) {
  const reduceMotion = useReducedMotion();
  const glowColor = useCSSVariable('--color-primary');
  // 0 to 1 is the beam travelling down; 1 to 1.3 is the scan fading out.
  const t = useSharedValue(0.55);

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1 }),
        withDelay(450, withTiming(1, { duration: 2100, easing: Easing.inOut(Easing.quad) })),
        withTiming(1.3, { duration: 420, easing: Easing.linear }),
      ),
      -1,
    );
    return () => cancelAnimation(t);
  }, [reduceMotion, t]);

  const beamStyle = useAnimatedStyle(() => ({
    opacity: t.value > 1 ? Math.max(0, 1 - (t.value - 1) / 0.3) : 1,
    transform: [{ translateY: Math.min(t.value, 1) * SCAN_TRAVEL }],
  }));
  const trailStyle = useAnimatedStyle(() => ({
    opacity: t.value > 1 ? Math.max(0, 1 - (t.value - 1) / 0.3) : 1,
    transform: [{ translateY: Math.min(t.value, 1) * SCAN_TRAVEL - TRAIL_STEPS * TRAIL_STEP_HEIGHT }],
  }));
  // Everything the beam has passed shows the scanned look until the scan fades out.
  const scannedStyle = useAnimatedStyle(() => ({
    opacity: t.value > 1 ? Math.max(0, 1 - (t.value - 1) / 0.3) : 1,
    height: Math.min(t.value, 1) * SCAN_TRAVEL + 2,
  }));

  return (
    <View
      className="overflow-hidden rounded-xl bg-surface-muted"
      style={{ width: WINDOW_WIDTH, height: WINDOW_HEIGHT }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View className="absolute inset-0 items-center justify-center">
        <Text variant="title" tone="muted">
          {initials}
        </Text>
      </View>

      <Animated.View className="absolute left-0 right-0 top-0 overflow-hidden" style={scannedStyle}>
        <View className="absolute left-0 right-0 top-0 bg-primary/15" style={{ height: WINDOW_HEIGHT }}>
          {Array.from({ length: Math.floor(WINDOW_HEIGHT / SCAN_LINE_GAP) }, (_, index) => (
            <View
              key={index}
              className="absolute left-0 right-0 h-px bg-primary/20"
              style={{ top: index * SCAN_LINE_GAP }}
            />
          ))}
          <View className="absolute inset-0 items-center justify-center">
            <Text variant="title" tone="inherit" className="text-primary">
              {initials}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* The trail is a stack of thin bars that get fainter away from the beam. */}
      <Animated.View className="absolute left-0 right-0 top-0" style={trailStyle}>
        {Array.from({ length: TRAIL_STEPS }, (_, index) => (
          <View
            key={index}
            className="bg-primary"
            style={{ height: TRAIL_STEP_HEIGHT, opacity: ((index + 1) / TRAIL_STEPS) ** 2 * 0.4 }}
          />
        ))}
      </Animated.View>
      <Animated.View
        className="absolute left-0 right-0 top-0 h-[3px] bg-primary"
        style={[
          beamStyle,
          typeof glowColor === 'string' ? { boxShadow: `0 0 10px 2px ${glowColor}` } : null,
        ]}
      />

      <View className="absolute left-1.5 top-1.5 size-3.5 rounded-tl-md border-l-2 border-t-2 border-primary" />
      <View className="absolute right-1.5 top-1.5 size-3.5 rounded-tr-md border-r-2 border-t-2 border-primary" />
      <View className="absolute bottom-1.5 left-1.5 size-3.5 rounded-bl-md border-b-2 border-l-2 border-primary" />
      <View className="absolute bottom-1.5 right-1.5 size-3.5 rounded-br-md border-b-2 border-r-2 border-primary" />
    </View>
  );
}

/** One segment per approval the profile needs. Filled ones are done. */
function ApprovalMeter({ tenant }: { tenant: TenantReview }) {
  const label = tenant.providerOwned ? 'Service provider approval' : 'Admin approvals';
  const done = Math.min(tenant.approvalsDone, tenant.approvalsRequired);
  return (
    <View
      className="gap-2.5"
      accessible
      accessibilityLabel={`${label}: ${done} of ${tenant.approvalsRequired} done`}>
      <View className="flex-row items-baseline justify-between">
        <Text variant="label" tone="secondary">
          {label}
        </Text>
        <Text variant="label">
          {done} of {tenant.approvalsRequired}
        </Text>
      </View>
      <View className="flex-row gap-1.5">
        {Array.from({ length: tenant.approvalsRequired }, (_, index) => (
          <View key={index} className={`h-1.5 flex-1 rounded-full ${index < done ? 'bg-primary' : 'bg-border'}`} />
        ))}
      </View>
    </View>
  );
}

function PassCard({ name, tenant }: { name: string | undefined; tenant: TenantReview }) {
  return (
    <View className="rounded-3xl border border-border bg-surface px-5 pb-5 pt-3">
      {/* The slot a lanyard would go through. */}
      <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-background" />
      <View className="mb-5 flex-row items-center gap-1.5">
        <Icon icon={ICONS.shield} size={18} tone="primary" />
        <Text variant="label" tone="secondary">
          GuardGo
        </Text>
      </View>
      <View className="flex-row gap-4">
        <PassWindow initials={initialsOf(name)} />
        <View className="flex-1 justify-between">
          <View className="gap-0.5">
            <Text variant="heading" numberOfLines={2}>
              {name || 'Your profile'}
            </Text>
            <Text variant="small" tone="muted">
              Security guard
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5 self-start rounded-full bg-warning-soft px-3 py-1.5">
            <Icon icon={ICONS.clock} size={14} colorVar="--color-warning-soft-content" />
            <Text variant="caption" tone="inherit" className="font-sans-medium text-warning-soft-content">
              Awaiting approval
            </Text>
          </View>
        </View>
      </View>
      <View className="my-5 h-px bg-border" />
      <ApprovalMeter tenant={tenant} />
    </View>
  );
}

type StepState = 'done' | 'current' | 'next';

function TimelineStep({ state, title, detail, last }: { state: StepState; title: string; detail: string; last?: boolean }) {
  return (
    <View className="flex-row gap-4">
      <View className="items-center">
        <View
          className={`size-7 items-center justify-center rounded-full ${
            state === 'done' ? 'bg-success' : state === 'current' ? 'border-2 border-primary bg-surface' : 'border-2 border-border-strong'
          }`}>
          {state === 'done' ? (
            <Icon icon={ICONS.check} size={14} colorVar="--color-white" />
          ) : state === 'current' ? (
            <View className="size-2.5 rounded-full bg-primary" />
          ) : null}
        </View>
        {last ? null : <View className={`w-0.5 flex-1 ${state === 'done' ? 'bg-success' : 'bg-border'}`} />}
      </View>
      <View className={`flex-1 gap-0.5 ${last ? '' : 'pb-6'}`}>
        <Text variant="label" tone={state === 'next' ? 'muted' : 'default'}>
          {title}
        </Text>
        <Text variant="small" tone="muted">
          {detail}
        </Text>
      </View>
    </View>
  );
}

/**
 * Shown to a guard who finished onboarding while an admin reviews the profile (tenant status
 * "pending_activation", like the web app's "Profile Under Review" page). It checks the status again
 * when it opens, when the app returns to the foreground and on pull to refresh. Once the profile is
 * approved the root layout's guard replaces it with the guard's home screen.
 */
export function UnderReviewScreen() {
  const session = useSession();
  const tenant = session?.tenant;
  const { logout, loggingOut } = useLogout();
  const [checking, setChecking] = useState(true);
  const [failed, setFailed] = useState(false);
  const spinnerColor = useCSSVariable('--color-primary');

  const check = useCallback(async () => {
    setChecking(true);
    try {
      await syncTenantReview();
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // `checking` starts true, so the first check doesn't need to set it.
    syncTenantReview()
      .then(() => setFailed(false), () => setFailed(true))
      .finally(() => setChecking(false));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => subscription.remove();
  }, [check]);

  // Right after sign-in the review status is not known yet.
  if (!tenant) {
    return (
      <Screen className="justify-center gap-5 p-6">
        {failed ? (
          <>
            <View className="gap-2">
              <Text variant="heading" accessibilityRole="header">
                Couldn&apos;t check your account
              </Text>
              <Text tone="secondary">Make sure you&apos;re connected to the internet, then try again.</Text>
            </View>
            <Button title="Try again" onPress={check} loading={checking} />
            <Button title="Log out" variant="secondary" onPress={logout} loading={loggingOut} />
          </>
        ) : (
          <View className="items-center gap-3" accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color={typeof spinnerColor === 'string' ? spinnerColor : undefined} />
            <Text tone="secondary">Checking your account</Text>
          </View>
        )}
      </Screen>
    );
  }

  const body = tenant.providerOwned
    ? "Your service provider is checking it. We'll email you once it's approved."
    : "Admins are reviewing it, usually within 24 to 48 hours. We'll email you once it's approved.";

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="gap-8 p-6"
        refreshControl={<RefreshControl refreshing={checking && !!tenant} onRefresh={check} />}>
        <Entrance step={0}>
          <View className="gap-2 pt-2">
            <Text variant="title" accessibilityRole="header">
              Profile under review
            </Text>
            <Text tone="secondary">{body}</Text>
          </View>
        </Entrance>

        <Entrance step={1}>
          <PassCard name={session?.username} tenant={tenant} />
        </Entrance>

        <Entrance step={2}>
          <View>
            <TimelineStep state="done" title="Profile submitted" detail="Your details and documents are saved." />
            <TimelineStep
              state="current"
              title={tenant.providerOwned ? 'Review by your service provider' : 'Admin review'}
              detail="You don't need to do anything right now."
            />
            <TimelineStep state="next" title="Start taking jobs" detail="The app opens up as soon as you're approved." last />
          </View>
        </Entrance>

        <Entrance step={3}>
          <View className="gap-3">
            {failed ? (
              <Text variant="small" tone="danger" accessibilityLiveRegion="polite">
                Couldn&apos;t reach GuardGo. Showing the last status we have.
              </Text>
            ) : null}
            <Button title="Check status" onPress={check} loading={checking} />
            <Button title="Log out" variant="secondary" onPress={logout} loading={loggingOut} />
          </View>
        </Entrance>
      </ScrollView>
    </Screen>
  );
}
