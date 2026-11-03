import { useMemo } from 'react';
import { View } from 'react-native';
import { useWatch } from 'react-hook-form';

import { FormSelect, FormTextField } from '@/components/form/form-fields';
import type { GuardStepProps } from '@/components/onboarding/guard/guard-form';
import { GuardTypeChips } from '@/components/onboarding/guard/guard-type-chips';
import { StepHeading } from '@/components/onboarding/step-heading';
import { Text } from '@/components/ui/text';
import { useOnChange } from '@/hooks/use-on-change';
import { cityBelongsTo } from '@/utils/profile';

/** Where and what kind of work the guard takes. A service provider sets the area for its own guards. */
export function WorkAreaStep({ form, metadata }: GuardStepProps) {
  const managed = useWatch({ control: form.control, name: 'managed_by_provider' });
  const province = useWatch({ control: form.control, name: 'operational_province' });

  // A new province makes the old city meaningless (unless the city belongs to it, like saved data loading in).
  useOnChange(province, (next) => {
    if (!cityBelongsTo(metadata.canadianCitiesByProvince, next, form.getValues('operational_city'))) {
      form.setValue('operational_city', null);
    }
  });

  const cities = useMemo(
    () => (province ? (metadata.canadianCitiesByProvince[province] ?? []) : []),
    [metadata, province]
  );

  return (
    <View className="gap-6">
      <StepHeading title="Work area" description="Where you take shifts, and what kind of work you do." />

      {managed ? (
        <View className="rounded-xl border border-border bg-surface-muted p-5">
          <Text tone="secondary">Your service provider sets your work area and your weekly availability.</Text>
        </View>
      ) : (
        <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <FormSelect
            control={form.control}
            name="operational_province"
            label="Operational province"
            options={metadata.canadianProvinces}
            searchable
            placeholder="Choose a province"
          />
          <FormSelect
            control={form.control}
            name="operational_city"
            label="Operational city"
            options={cities}
            searchable
            disabled={!province}
            hint={province ? undefined : 'Choose a province first.'}
            placeholder="Choose a city"
          />
          <FormTextField
            control={form.control}
            name="radius_km"
            label="Travel radius (km)"
            placeholder="25"
            hint="How far from that city you will travel. At least 1 km."
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        </View>
      )}

      <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <GuardTypeChips control={form.control} options={metadata.guardTypeOptions} />
      </View>
    </View>
  );
}
