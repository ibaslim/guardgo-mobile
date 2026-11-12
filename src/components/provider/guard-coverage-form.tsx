import { useMemo } from 'react';
import { View } from 'react-native';

import { DayRow } from '@/components/onboarding/guard/availability-step';
import { Select } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { WEEK_DAYS, type GuardMetadata, type WeeklyAvailabilityValues } from '@/types/guard-onboarding';
import { cityLabelFor } from '@/utils/profile';
import type { CoverageRegion } from '@/utils/provider-coverage';

/** What the service provider sets for its guard. */
export type CoverageValues = {
  province: string | null;
  city: string | null;
  radius: string;
  availability: WeeklyAvailabilityValues;
};

export type CoverageErrors = Partial<Record<'province' | 'city' | 'radius' | 'availability', string>>;

export type GuardCoverageFormProps = {
  /** The provinces and cities the provider covers: the guard's work area has to be one of them. */
  regions: CoverageRegion[];
  metadata: GuardMetadata;
  value: CoverageValues;
  onChange: (next: CoverageValues) => void;
  errors: CoverageErrors;
};

/**
 * The work area and weekly availability a service provider sets for one of its guards. The area can
 * only be somewhere the provider operates, and the radius can't be more than the provider allows there.
 */
export function GuardCoverageForm({ regions, metadata, value, onChange, errors }: GuardCoverageFormProps) {
  const provinceOptions = useMemo(
    () =>
      regions.map((region) => ({
        value: region.code,
        label: metadata.canadianProvinces.find((option) => option.value === region.code)?.label ?? region.code,
      })),
    [regions, metadata]
  );

  const region = regions.find((item) => item.code === value.province);
  const cityOptions = (region?.cities ?? []).map((city) => ({
    value: city.code,
    label: cityLabelFor(metadata.canadianCitiesByProvince, region?.code ?? '', city.code),
  }));
  const limit = region?.cities.find((city) => city.code === value.city)?.radiusKm ?? null;

  function pickProvince(province: string | null) {
    // A new province makes the old city meaningless.
    onChange({ ...value, province, city: null, radius: '' });
  }

  function pickCity(city: string | null) {
    const allowed = region?.cities.find((item) => item.code === city)?.radiusKm ?? null;
    // Start at the most the provider allows there; the provider can lower it.
    onChange({ ...value, city, radius: allowed ? String(allowed) : value.radius });
  }

  return (
    <View className="gap-5">
      <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <Select
          label="Operational province"
          options={provinceOptions}
          value={value.province}
          onChange={pickProvince}
          placeholder="Choose a province"
          error={errors.province}
          hint={regions.length === 0 ? 'Add operating regions to your company profile first.' : undefined}
          disabled={regions.length === 0}
        />
        <Select
          label="Operational city"
          options={cityOptions}
          value={value.city}
          onChange={pickCity}
          placeholder="Choose a city"
          searchable
          error={errors.city}
          disabled={!value.province}
          hint={value.province ? undefined : 'Choose a province first.'}
        />
        <TextField
          label="Travel radius (km)"
          value={value.radius}
          onChangeText={(radius) => onChange({ ...value, radius })}
          placeholder="25"
          keyboardType="decimal-pad"
          returnKeyType="done"
          error={errors.radius}
          hint={limit ? `At least 1 km, at most ${limit} km (your coverage here).` : 'At least 1 km.'}
        />
      </View>

      <View className="gap-1">
        <Text variant="heading">Weekly availability</Text>
        <Text variant="small" tone="muted">
          The days and hours this guard can work. Each day runs from 6:00 AM to 6:00 AM.
        </Text>
        {errors.availability ? (
          <Text variant="small" tone="danger" accessibilityRole="alert">
            {errors.availability}
          </Text>
        ) : null}
      </View>

      {WEEK_DAYS.map((name) => (
        <DayRow
          key={name}
          name={name}
          value={value.availability[name]}
          onChange={(next) => onChange({ ...value, availability: { ...value.availability, [name]: next } })}
        />
      ))}
    </View>
  );
}
