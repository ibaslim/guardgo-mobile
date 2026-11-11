import { useLocalSearchParams } from "expo-router";
import { Fragment, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

import { EditHeading } from "@/components/account/edit-step-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useGuardMetadata } from "@/hooks/use-guard-metadata";
import { getAccount, type AccountInfo } from "@/services/account";
import { parseAvailability, parseGuardProfile } from "@/services/guard-tenant";
import { WEEK_DAYS, type GuardMetadata } from "@/types/guard-onboarding";
import { cityLabelFor } from "@/utils/profile";

type Section = "area" | "availability";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-h-12 flex-row items-center justify-between gap-4 px-4 py-3">
      <Text variant="label" className="shrink-0">
        {label}
      </Text>
      <Text
        variant="small"
        tone={value ? undefined : "muted"}
        className="min-w-0 flex-1 text-right"
      >
        {value || "Not set"}
      </Text>
    </View>
  );
}

function Rows({ children }: { children: React.ReactNode[] }) {
  return (
    <>
      {children.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? <View className="ml-4 h-px bg-border" /> : null}
          {child}
        </Fragment>
      ))}
    </>
  );
}

/** The read-only content, once the account and the option lists have loaded. */
function Schedule({
  account,
  metadata,
  section,
}: {
  account: AccountInfo;
  metadata: GuardMetadata;
  section: Section;
}) {
  const saved = parseGuardProfile(account.tenant.profile, metadata) ?? {};
  const availability = parseAvailability(
    account.tenant.profile.weekly_availability,
  );
  const provider =
    account.tenant.service_provider?.name || "your service provider";

  const province = saved.operational_province
    ? (metadata.canadianProvinces.find(
        (option) => option.value === saved.operational_province,
      )?.label ?? saved.operational_province)
    : "";
  const city =
    saved.operational_province && saved.operational_city
      ? cityLabelFor(
          metadata.canadianCitiesByProvince,
          saved.operational_province,
          saved.operational_city,
        )
      : "";
  const radius = saved.radius_km ? `${saved.radius_km} km` : "";
  const anyDay = WEEK_DAYS.some((name) => availability[name].enabled);

  return (
    <ScrollView
      contentContainerStyle={{ gap: 20, padding: 24, paddingBottom: 40 }}
    >
      <Text variant="small" tone="muted">
        {`Set by ${provider}. You can see it here, but only they can change it.`}
      </Text>

      {section === "area" ? (
        <Card title="Operational area">
          <Rows>
            {[
              <InfoRow key="province" label="Province" value={province} />,
              <InfoRow key="city" label="City" value={city} />,
              <InfoRow key="radius" label="Travel radius" value={radius} />,
            ]}
          </Rows>
        </Card>
      ) : (
        <Card title="Weekly availability">
          {anyDay ? (
            <Rows>
              {WEEK_DAYS.map((name) => {
                const day = availability[name];
                return (
                  <View
                    key={name}
                    className="min-h-12 flex-row items-start justify-between gap-4 px-4 py-3"
                  >
                    <Text variant="label" className="shrink-0">
                      {name}
                    </Text>
                    {day.enabled ? (
                      <View className="items-end gap-0.5">
                        {day.ranges.map((range, index) => (
                          <Text key={index} variant="small">
                            {`${range.start} – ${range.end}`}
                          </Text>
                        ))}
                      </View>
                    ) : (
                      <Text variant="small" tone="muted">
                        Not available
                      </Text>
                    )}
                  </View>
                );
              })}
            </Rows>
          ) : (
            <View className="p-4">
              <Text tone="secondary">
                Your service provider hasn&apos;t set your availability yet.
              </Text>
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

/**
 * A service provider's guard sees one thing the provider set for them: the operational area or the
 * weekly availability (`section`). Read only: the provider changes them, from its review of the guard.
 */
export default function AssignedScheduleScreen() {
  const {
    metadata,
    failed: metadataFailed,
    retry: retryMetadata,
  } = useGuardMetadata();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getAccount()
      .then((result) => {
        if (!active) return;
        setAccount(result);
        setLoadFailed(false);
      })
      .catch(() => active && setLoadFailed(true));
    return () => {
      active = false;
    };
  }, [attempt]);

  const { section: param } = useLocalSearchParams<{ section?: string }>();
  const section: Section = param === "availability" ? "availability" : "area";
  const title = section === "area" ? "Operational area" : "Availability";

  if (loadFailed || metadataFailed) {
    return (
      <Screen>
        <EditHeading title={title} />
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text variant="heading" className="text-center">
            Could not load this
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

  return (
    <Screen>
      <EditHeading title={title} />
      {account && metadata ? (
        <Schedule account={account} metadata={metadata} section={section} />
      ) : (
        <View
          className="flex-1 items-center justify-center gap-3"
          accessibilityLiveRegion="polite"
        >
          <ActivityIndicator colorClassName="accent-primary" />
          <Text tone="muted">Loading…</Text>
        </View>
      )}
    </Screen>
  );
}
