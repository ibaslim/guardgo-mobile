import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useWatch } from 'react-hook-form';

import { FormSelect, FormTextField } from '@/components/form/form-fields';
import type { ClientForm } from '@/components/onboarding/client/client-form';
import { StepHeading } from '@/components/onboarding/step-heading';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { useClientMetadata } from '@/hooks/use-client-metadata';

const CARD_METHODS = [
  { value: 'credit_card', label: 'Credit card' },
  { value: 'debit_card', label: 'Debit card' },
];

const MONTHS = Array.from({ length: 12 }, (_, index) => {
  const month = String(index + 1).padStart(2, '0');
  return { value: month, label: month };
});

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, index) => {
  const year = String(THIS_YEAR + index);
  return { value: year, label: year };
});

/** Billing address and the card on file. Province and city lists come from the server. */
export function BillingStep({ form }: { form: ClientForm }) {
  const { metadata, loading, failed, retry } = useClientMetadata();
  const country = useWatch({ control: form.control, name: 'billing_country' });
  const province = useWatch({ control: form.control, name: 'billing_province' });
  const canada = country === 'CA';

  // A new country or province makes the old province or city meaningless. Only reset on a real
  // change, not when the step opens again with values already filled in.
  const previous = useRef({ country, province });
  useEffect(() => {
    if (previous.current.country !== country) {
      form.setValue('billing_province', null);
      form.setValue('billing_city', null);
    } else if (previous.current.province !== province) {
      form.setValue('billing_city', null);
    }
    previous.current = { country, province };
  }, [country, province, form]);

  const cities = useMemo(
    () => (province ? (metadata?.canadianCitiesByProvince[province] ?? []) : []),
    [metadata, province]
  );

  if (loading) {
    return (
      <View className="items-center gap-3 py-16" accessibilityLiveRegion="polite">
        <ActivityIndicator colorClassName="accent-primary" />
        <Text tone="muted">Loading billing options…</Text>
      </View>
    );
  }

  if (failed || !metadata) {
    return (
      <View className="items-center gap-4 py-16">
        <Text variant="heading" className="text-center">
          Could not load billing options
        </Text>
        <Text tone="secondary" className="text-center">
          Check your connection and try again.
        </Text>
        <Button title="Try again" variant="secondary" onPress={retry} />
      </View>
    );
  }

  return (
    <View className="gap-6">
      <StepHeading title="Billing" description="Where we send invoices, and the card on file. We only ask for the last 4 digits." />

      <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <Text variant="heading">Billing address</Text>
        <FormTextField
          control={form.control}
          name="billing_street"
          label="Street address"
          placeholder="123 Main Street"
          icon={ICONS.location}
          autoCapitalize="words"
          autoComplete="street-address"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => form.setFocus('billing_postal_code')}
        />
        <FormSelect
          control={form.control}
          name="billing_country"
          label="Country"
          options={metadata.countries}
          searchable
          placeholder="Choose a country"
        />
        {canada ? (
          <>
            <FormSelect
              control={form.control}
              name="billing_province"
              label="Province"
              options={metadata.canadianProvinces}
              searchable
              placeholder="Choose a province"
            />
            <FormSelect
              control={form.control}
              name="billing_city"
              label="City"
              options={cities}
              searchable
              disabled={!province}
              hint={province ? undefined : 'Choose a province first.'}
              placeholder="Choose a city"
            />
          </>
        ) : (
          <FormTextField
            control={form.control}
            name="billing_city"
            label="City"
            autoCapitalize="words"
            autoComplete="postal-address-locality"
          />
        )}
        <FormTextField
          control={form.control}
          name="billing_postal_code"
          label="Postal code"
          placeholder={canada ? 'A1A 1A1' : undefined}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="postal-code"
          returnKeyType="done"
        />
      </View>

      <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <Text variant="heading">Card on file</Text>
        <FormSelect control={form.control} name="card_method" label="Card type" options={CARD_METHODS} placeholder="Choose a card type" />
        <FormTextField
          control={form.control}
          name="card_holder"
          label="Cardholder name"
          placeholder="Alex Morgan"
          icon={ICONS.user}
          autoCapitalize="words"
          autoComplete="cc-name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => form.setFocus('card_last4')}
        />
        <FormTextField
          control={form.control}
          name="card_last4"
          label="Last 4 digits"
          placeholder="4242"
          icon={ICONS.lock}
          keyboardType="number-pad"
          maxLength={4}
          returnKeyType="done"
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormSelect control={form.control} name="card_expiry_month" label="Expiry month" options={MONTHS} placeholder="MM" />
          </View>
          <View className="flex-1">
            <FormSelect control={form.control} name="card_expiry_year" label="Expiry year" options={YEARS} placeholder="YYYY" />
          </View>
        </View>
      </View>
    </View>
  );
}
