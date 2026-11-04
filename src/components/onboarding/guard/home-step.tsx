import { useMemo } from 'react';
import { View } from 'react-native';
import { useWatch } from 'react-hook-form';

import { CoordinatesField } from '@/components/form/coordinates-field';
import { FormSelect, FormTextField } from '@/components/form/form-fields';
import type { GuardStepProps } from '@/components/onboarding/guard/guard-form';
import { StepHeading } from '@/components/onboarding/step-heading';
import { ICONS } from '@/constants/icons';
import { useOnChange } from '@/hooks/use-on-change';
import { cityBelongsTo } from '@/utils/profile';

/** Where the guard lives. The coordinates help match them with nearby shifts. */
export function HomeStep({ form, metadata }: GuardStepProps) {
  const province = useWatch({ control: form.control, name: 'province' });

  // A new province makes the old city meaningless (unless the city belongs to it, like saved data loading in).
  useOnChange(province, (next) => {
    if (!cityBelongsTo(metadata.canadianCitiesByProvince, next, form.getValues('city'))) form.setValue('city', null);
  });

  const cities = useMemo(
    () => (province ? (metadata.canadianCitiesByProvince[province] ?? []) : []),
    [metadata, province]
  );

  return (
    <View className="gap-6">
      <StepHeading title="Home address" description="Used to line you up with shifts close to you." />

      <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <FormTextField
          control={form.control}
          name="street"
          label="Street address"
          placeholder="123 Main Street"
          icon={ICONS.location}
          autoCapitalize="words"
          autoComplete="street-address"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => form.setFocus('postal_code')}
        />
        <FormSelect
          control={form.control}
          name="province"
          label="Province"
          options={metadata.canadianProvinces}
          searchable
          placeholder="Choose a province"
        />
        <FormSelect
          control={form.control}
          name="city"
          label="City"
          options={cities}
          searchable
          disabled={!province}
          hint={province ? undefined : 'Choose a province first.'}
          placeholder="Choose a city"
        />
        <FormTextField
          control={form.control}
          name="postal_code"
          label="Postal code"
          placeholder="A1A 1A1"
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="postal-code"
          returnKeyType="done"
        />
      </View>

      <View className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <CoordinatesField
          control={form.control}
          latitudeName="latitude"
          longitudeName="longitude"
          description="Where your home or base is. Stand there and use your location, pick it on the map, or type it."
          onPick={(latitude, longitude) => {
            const options = { shouldValidate: true, shouldDirty: true } as const;
            form.setValue('latitude', latitude, options);
            form.setValue('longitude', longitude, options);
          }}
        />
      </View>
    </View>
  );
}
