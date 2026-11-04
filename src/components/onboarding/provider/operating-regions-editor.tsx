import { useMemo } from 'react';
import { View } from 'react-native';
import { useFieldArray, useWatch } from 'react-hook-form';

import { CoordinatesField } from '@/components/form/coordinates-field';
import { FormSelect, FormTextField } from '@/components/form/form-fields';
import { ListError } from '@/components/onboarding/guard/document-card';
import type { ProviderForm, ProviderStepProps } from '@/components/onboarding/provider/provider-form';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { useOnChange } from '@/hooks/use-on-change';
import { emptyCity, emptyRegion, MIN_RADIUS_KM } from '@/schemas/provider-onboarding';
import type { OperatingCityValues } from '@/types/provider-onboarding';
import { cityBelongsTo } from '@/utils/profile';

/** The radius a city gets when it is filled in from the head office. */
const HEAD_OFFICE_RADIUS_KM = '10';

type CityRowProps = {
  form: ProviderForm;
  regionIndex: number;
  index: number;
  cities: { value: string; label: string }[];
  onRemove?: () => void;
};

function CityRow({ form, regionIndex, index, cities, onRemove }: CityRowProps) {
  const base = `operating_regions.${regionIndex}.cities.${index}` as const;

  return (
    <View className="gap-4 rounded-xl border border-border bg-surface-muted p-4">
      <View className="flex-row items-center justify-between gap-3">
        <Text variant="label">City {index + 1}</Text>
        {onRemove ? <Button title="Remove" variant="danger" size="sm" icon={ICONS.trash} onPress={onRemove} /> : null}
      </View>
      <FormSelect
        control={form.control}
        name={`${base}.city`}
        label="City"
        options={cities}
        searchable
        placeholder="Choose a city"
        disabled={cities.length === 0}
      />
      <FormTextField
        control={form.control}
        name={`${base}.radius_km`}
        label="Coverage radius (km)"
        placeholder="25"
        hint={`How far from the map point you can send guards. At least ${MIN_RADIUS_KM} km.`}
        keyboardType="decimal-pad"
        returnKeyType="done"
      />
      <CoordinatesField
        control={form.control}
        latitudeName={`${base}.latitude`}
        longitudeName={`${base}.longitude`}
        description="The exact point this city is covered from."
        onPick={(latitude, longitude) => {
          const options = { shouldValidate: true, shouldDirty: true } as const;
          form.setValue(`${base}.latitude`, latitude, options);
          form.setValue(`${base}.longitude`, longitude, options);
        }}
      />
    </View>
  );
}

type RegionCardProps = ProviderStepProps & {
  index: number;
  /** Provinces another region already uses, which this one cannot pick. */
  takenProvinces: readonly string[];
  onRemove?: () => void;
};

function RegionCard({ form, metadata, index, takenProvinces, onRemove }: RegionCardProps) {
  const province = useWatch({ control: form.control, name: `operating_regions.${index}.province` });
  const cities = useFieldArray({ control: form.control, name: `operating_regions.${index}.cities` });

  // A new province makes the cities picked before meaningless (unless they belong to it, like saved data loading in).
  useOnChange(province, (next) => {
    const name = `operating_regions.${index}.cities` as const;
    const current = form.getValues(name);
    const cleared = current.map((entry) =>
      cityBelongsTo(metadata.canadianCitiesByProvince, next, entry.city) ? entry : { ...entry, city: null }
    );
    form.setValue(name, cleared);
  });

  const options = useMemo(
    () => (province ? (metadata.canadianCitiesByProvince[province] ?? []) : []),
    [metadata, province]
  );
  // `takenProvinces` is a new array on every render, so the list is keyed by its contents instead.
  const takenKey = takenProvinces.join(',');
  const provinces = useMemo(
    () => metadata.canadianProvinces.filter((option) => option.value === province || !takenKey.split(',').includes(option.value)),
    [metadata, province, takenKey]
  );

  return (
    <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <View className="flex-row items-center justify-between gap-3">
        <Text variant="heading" className="flex-1">
          Region {index + 1}
        </Text>
        {onRemove ? <Button title="Remove" variant="danger" size="sm" icon={ICONS.trash} onPress={onRemove} /> : null}
      </View>

      <FormSelect
        control={form.control}
        name={`operating_regions.${index}.province`}
        label="Province"
        options={provinces}
        searchable
        placeholder="Choose a province"
      />

      {cities.fields.map((field, cityIndex) => (
        <CityRow
          key={field.id}
          form={form}
          regionIndex={index}
          index={cityIndex}
          cities={options}
          onRemove={cities.fields.length > 1 ? () => cities.remove(cityIndex) : undefined}
        />
      ))}
      {!province ? <Text tone="muted">Choose a province, then pick the cities you cover in it.</Text> : null}
      <Button
        title="Add a city"
        variant="outline"
        icon={ICONS.location}
        disabled={!province}
        // No automatic focus: the new radius field is not laid out yet, and focusing it scrolls the page to the top.
        onPress={() => cities.append(emptyCity(), { shouldFocus: false })}
      />
    </View>
  );
}

const isBlankCity = (entry: OperatingCityValues) => !entry.city && !entry.radius_km && !entry.latitude && !entry.longitude;

/**
 * The provinces and cities the company covers. Each city has its own radius and map point, because
 * the server uses them to match requests with the provider. One card per province.
 */
export function OperatingRegionsEditor(props: ProviderStepProps) {
  const { form } = props;
  const regions = useFieldArray({ control: form.control, name: 'operating_regions' });
  const watched = useWatch({ control: form.control, name: 'operating_regions' });
  const province = useWatch({ control: form.control, name: 'province' });
  const city = useWatch({ control: form.control, name: 'city' });

  const picked = watched.map((region) => region.province).filter((value): value is string => Boolean(value));
  const headOfficeReady = Boolean(province && city);

  // Adds the head office city to the list, with its coordinates, so the usual case takes one tap.
  function useHeadOffice() {
    const { province: officeProvince, city: officeCity, latitude, longitude } = form.getValues();
    if (!officeProvince || !officeCity) return;
    const entry: OperatingCityValues = { city: officeCity, radius_km: HEAD_OFFICE_RADIUS_KM, latitude, longitude };
    const all = form.getValues('operating_regions');

    const same = all.findIndex((region) => region.province === officeProvince);
    if (same >= 0) {
      const region = all[same];
      if (region.cities.some((existing) => existing.city === officeCity)) return;
      regions.update(same, { province: officeProvince, cities: [...region.cities.filter((existing) => !isBlankCity(existing)), entry] });
      return;
    }

    const blank = all.findIndex((region) => !region.province && region.cities.every(isBlankCity));
    const next = { province: officeProvince, cities: [entry] };
    if (blank >= 0) regions.update(blank, next);
    else regions.append(next, { shouldFocus: false });
  }

  return (
    <View className="gap-6">
      <ListError form={form} name="operating_regions" />

      <Button
        title="Use head office as a region"
        variant="secondary"
        icon={ICONS.building}
        disabled={!headOfficeReady}
        onPress={useHeadOffice}
      />

      {regions.fields.map((field, index) => (
        <RegionCard
          key={field.id}
          {...props}
          index={index}
          takenProvinces={picked.filter((_, pickedIndex) => pickedIndex !== index)}
          onRemove={regions.fields.length > 1 ? () => regions.remove(index) : undefined}
        />
      ))}

      <Button title="Add another province" variant="outline" icon={ICONS.location} onPress={() => regions.append(emptyRegion(), { shouldFocus: false })}
      />
    </View>
  );
}
