import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { useWatch } from 'react-hook-form';

import { CoordinatesField } from '@/components/form/coordinates-field';
import { FormSelect, FormTextField } from '@/components/form/form-fields';
import type { RequestForm } from '@/components/requests/form/request-form-type';
import { FilterPills } from '@/components/ui/filter-pills';
import { FormSection } from '@/components/ui/form-section';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import type { ClientMetadata } from '@/types/onboarding';
import type { SavedSite } from '@/types/request';
import type { SiteSource } from '@/types/request-form';

const SOURCES: readonly { value: SiteSource; label: string }[] = [
  { value: 'saved', label: 'Saved site' },
  { value: 'manual', label: 'New address' },
];

export type SiteSectionProps = {
  form: RequestForm;
  metadata: ClientMetadata | null;
  /** The client's saved sites. With none, only a new address can be entered. */
  savedSites: readonly SavedSite[];
};

/** Where the job is: one of the client's saved sites, or an address typed in for this job. */
export function SiteSection({ form, metadata, savedSites }: SiteSectionProps) {
  const source = useWatch({ control: form.control, name: 'site_source' });
  const province = useWatch({ control: form.control, name: 'province' });

  // A new province makes the old city meaningless. Only reset on a real change, not on first show.
  const previousProvince = useRef(province);
  useEffect(() => {
    if (previousProvince.current !== province) form.setValue('city', null);
    previousProvince.current = province;
  }, [province, form]);

  const cities = useMemo(() => (province ? (metadata?.canadianCitiesByProvince[province] ?? []) : []), [metadata, province]);
  const savedOptions = savedSites.map((site) => ({
    value: String(site.index),
    label: site.hasCoordinates ? site.name : `${site.name} (no location)`,
    description: site.address || undefined,
  }));

  return (
    <FormSection title="Site" description="Where the guards will work.">
      {savedSites.length > 0 ? (
        <FilterPills options={SOURCES} value={source} onChange={(next) => form.setValue('site_source', next, { shouldDirty: true })} />
      ) : null}

      {source === 'saved' ? (
        <View className="gap-2">
          <FormSelect
            control={form.control}
            name="saved_site"
            label="Saved site"
            icon={ICONS.building}
            options={savedOptions}
            placeholder="Choose a site"
          />
          <Text variant="small" tone="muted">
            Sites come from your profile. A site without a location can&apos;t be used: add one in your profile first.
          </Text>
        </View>
      ) : (
        <View className="gap-4">
          <FormTextField
            control={form.control}
            name="site_name"
            label="Site name"
            placeholder="Downtown warehouse"
            icon={ICONS.building}
            autoCapitalize="words"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => form.setFocus('site_manager')}
          />
          <FormTextField
            control={form.control}
            name="site_manager"
            label="Site manager"
            optional
            placeholder="Alex Morgan"
            icon={ICONS.user}
            autoCapitalize="words"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => form.setFocus('manager_email')}
          />
          <FormTextField
            control={form.control}
            name="manager_email"
            label="Manager email"
            optional
            placeholder="name@example.com"
            icon={ICONS.mail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => form.setFocus('street')}
          />
          <FormTextField
            control={form.control}
            name="street"
            label="Street address"
            optional
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
            options={metadata?.canadianProvinces ?? []}
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
            optional
            placeholder="A1A 1A1"
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="postal-code"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => form.setFocus('latitude')}
          />
          <CoordinatesField
            control={form.control}
            latitudeName="latitude"
            longitudeName="longitude"
            description="Guards are matched by how close they are. Stand at the site and use your location, pick it on the map, or type it."
            onPick={(latitude, longitude) => {
              const options = { shouldValidate: true, shouldDirty: true } as const;
              form.setValue('latitude', latitude, options);
              form.setValue('longitude', longitude, options);
            }}
          />
        </View>
      )}
    </FormSection>
  );
}
