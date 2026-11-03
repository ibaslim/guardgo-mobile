import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { useFieldArray, useWatch } from 'react-hook-form';

import { CoordinatesField } from '@/components/form/coordinates-field';
import { FormSelect, FormTextField } from '@/components/form/form-fields';
import type { OnboardingForm } from '@/components/onboarding/onboarding-types';
import { StepHeading } from '@/components/onboarding/step-heading';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { useClientMetadata } from '@/hooks/use-client-metadata';
import { EMPTY_SITE } from '@/schemas/client-onboarding';

// Used when the server sends no site types.
const FALLBACK_SITE_TYPES = [
  { value: 'office', label: 'Office' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'event', label: 'Event' },
  { value: 'residential', label: 'Residential' },
];

type SiteCardProps = { form: OnboardingForm; index: number; onRemove: () => void };

function SiteCard({ form, index, onRemove }: SiteCardProps) {
  const { metadata } = useClientMetadata();
  const province = useWatch({ control: form.control, name: `sites.${index}.province` });

  // A new province makes the old city meaningless. Only reset on a real change, not on first show.
  const previousProvince = useRef(province);
  useEffect(() => {
    if (previousProvince.current !== province) form.setValue(`sites.${index}.city`, null);
    previousProvince.current = province;
  }, [province, form, index]);

  const cities = useMemo(
    () => (province ? (metadata?.canadianCitiesByProvince[province] ?? []) : []),
    [metadata, province]
  );

  return (
    <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text variant="heading">Site {index + 1}</Text>
        <Button title="Remove" variant="danger" size="sm" icon={ICONS.trash} onPress={onRemove} />
      </View>

      <FormTextField
        control={form.control}
        name={`sites.${index}.site_name`}
        label="Site name"
        placeholder="Downtown warehouse"
        icon={ICONS.building}
        autoCapitalize="words"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => form.setFocus(`sites.${index}.manager_contact`)}
      />
      <FormSelect
        control={form.control}
        name={`sites.${index}.site_type`}
        label="Site type"
        options={metadata?.siteTypeOptions?.length ? metadata.siteTypeOptions : FALLBACK_SITE_TYPES}
        placeholder="Choose a site type"
      />
      <FormTextField
        control={form.control}
        name={`sites.${index}.manager_contact`}
        label="Site manager (optional)"
        placeholder="Alex Morgan"
        icon={ICONS.user}
        autoCapitalize="words"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => form.setFocus(`sites.${index}.manager_email`)}
      />
      <FormTextField
        control={form.control}
        name={`sites.${index}.manager_email`}
        label="Manager email (optional)"
        placeholder="name@example.com"
        icon={ICONS.mail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => form.setFocus(`sites.${index}.guards_required`)}
      />
      <FormTextField
        control={form.control}
        name={`sites.${index}.guards_required`}
        label="Recommended guards (optional)"
        hint="A starting point for quick request setup."
        keyboardType="number-pad"
        maxLength={3}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => form.setFocus(`sites.${index}.street`)}
      />

      <Text variant="label">Address</Text>
      <FormTextField
        control={form.control}
        name={`sites.${index}.street`}
        label="Street address"
        placeholder="123 Main Street"
        icon={ICONS.location}
        autoCapitalize="words"
        autoComplete="street-address"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => form.setFocus(`sites.${index}.postal_code`)}
      />
      <FormSelect
        control={form.control}
        name={`sites.${index}.province`}
        label="Province"
        options={metadata?.canadianProvinces ?? []}
        searchable
        placeholder="Choose a province"
      />
      <FormSelect
        control={form.control}
        name={`sites.${index}.city`}
        label="City"
        options={cities}
        searchable
        disabled={!province}
        hint={province ? undefined : 'Choose a province first.'}
        placeholder="Choose a city"
      />
      <FormTextField
        control={form.control}
        name={`sites.${index}.postal_code`}
        label="Postal code"
        placeholder="A1A 1A1"
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="postal-code"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => form.setFocus(`sites.${index}.latitude`)}
      />

      <CoordinatesField
        control={form.control}
        latitudeName={`sites.${index}.latitude`}
        longitudeName={`sites.${index}.longitude`}
        description="Needed to match and dispatch guards. Stand at the site and use your location, or type them."
        onPick={(latitude, longitude) => {
          const options = { shouldValidate: true, shouldDirty: true } as const;
          form.setValue(`sites.${index}.latitude`, latitude, options);
          form.setValue(`sites.${index}.longitude`, longitude, options);
        }}
      />
    </View>
  );
}

/** Operational sites the client wants guards at. Optional; each one added must be complete. */
export function SitesStep({ form }: { form: OnboardingForm }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'sites' });

  return (
    <View className="gap-6">
      <StepHeading
        title="Operational sites"
        description="Save the places you need guards, to reuse them when you make requests. You can also add sites later."
      />

      {fields.length === 0 ? (
        <View className="rounded-xl border border-dashed border-border bg-surface-muted p-5">
          <Text tone="secondary">No sites yet. Add one now, or finish setup and add them later.</Text>
        </View>
      ) : null}

      {fields.map((field, index) => (
        <SiteCard key={field.id} form={form} index={index} onRemove={() => remove(index)} />
      ))}

      <Button title="Add a site" variant="outline" icon={ICONS.building} onPress={() => append({ ...EMPTY_SITE })} />
    </View>
  );
}
