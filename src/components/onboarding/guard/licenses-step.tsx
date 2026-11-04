import { useMemo } from 'react';
import { View } from 'react-native';
import { useFieldArray, useWatch } from 'react-hook-form';

import { FormDateField, FormSelect, FormTextField } from '@/components/form/form-fields';
import { DocumentCard, ListError } from '@/components/onboarding/guard/document-card';
import { FormDocumentFile } from '@/components/onboarding/guard/document-file-field';
import type { GuardStepProps } from '@/components/onboarding/guard/guard-form';
import { StepHeading } from '@/components/onboarding/step-heading';
import { Button } from '@/components/ui/button';
import { issuingAuthorityFor } from '@/constants/provincial-authorities';
import { ICONS } from '@/constants/icons';
import { useOnChange } from '@/hooks/use-on-change';
import { cityBelongsTo } from '@/utils/profile';
import { EMPTY_POLICE_CLEARANCE, EMPTY_SECURITY_LICENSE, MAX_DOCUMENTS_PER_LIST } from '@/schemas/guard-onboarding';

type CardProps = GuardStepProps & { index: number; onRemove?: () => void };

function SecurityLicenseCard({ form, metadata, onUploading, index, onRemove }: CardProps) {
  const province = useWatch({ control: form.control, name: `security_licenses.${index}.issuing_province` });

  // The issuing authority follows the province. Text the guard typed themselves is kept.
  useOnChange(province, (next, before) => {
    const name = `security_licenses.${index}.issuing_authority` as const;
    const current = form.getValues(name);
    if (!current || current === issuingAuthorityFor(before)) form.setValue(name, issuingAuthorityFor(next));
  });

  return (
    <DocumentCard title={`Security license ${index + 1}`} onRemove={onRemove}>
      <FormTextField
        control={form.control}
        name={`security_licenses.${index}.full_legal_name`}
        label="Full legal name"
        placeholder="As on the license"
        autoCapitalize="words"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => form.setFocus(`security_licenses.${index}.license_number`)}
      />
      <FormTextField
        control={form.control}
        name={`security_licenses.${index}.license_number`}
        label="License number"
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
      />
      <FormSelect
        control={form.control}
        name={`security_licenses.${index}.license_type`}
        label="License type"
        options={metadata.securityLicenseTypes}
        placeholder="Choose a license type"
      />
      <FormSelect
        control={form.control}
        name={`security_licenses.${index}.issuing_province`}
        label="Issuing province"
        options={metadata.canadianProvinces}
        searchable
        placeholder="Choose a province"
      />
      <FormTextField
        control={form.control}
        name={`security_licenses.${index}.issuing_authority`}
        label="Issuing authority"
        hint="Filled in from the province. You can change it."
        multiline
        returnKeyType="done"
      />
      <FormDateField
        control={form.control}
        name={`security_licenses.${index}.issue_date`}
        label="Issue date"
        placeholder="Select date"
        maximumDate={new Date()}
      />
      <FormDateField
        control={form.control}
        name={`security_licenses.${index}.expiry_date`}
        label="Expiry date"
        placeholder="Select date"
        minimumDate={new Date()}
      />
      <FormDocumentFile
        control={form.control}
        name={`security_licenses.${index}.file`}
        kind="securityLicense"
        label="Picture of the license"
        onUploading={onUploading}
      />
    </DocumentCard>
  );
}

function PoliceClearanceCard({ form, metadata, onUploading, index, onRemove }: CardProps) {
  const authority = useWatch({ control: form.control, name: `police_clearances.${index}.issuing_authority_type` });
  const province = useWatch({ control: form.control, name: `police_clearances.${index}.issuing_province` });

  useOnChange(province, (next) => {
    const name = `police_clearances.${index}.issuing_city` as const;
    if (!cityBelongsTo(metadata.canadianCitiesByProvince, next, form.getValues(name))) form.setValue(name, null);
  });

  const cities = useMemo(
    () => (province ? (metadata.canadianCitiesByProvince[province] ?? []) : []),
    [metadata, province]
  );

  return (
    <DocumentCard title={`Police clearance ${index + 1}`} onRemove={onRemove}>
      <FormSelect
        control={form.control}
        name={`police_clearances.${index}.issuing_authority_type`}
        label="Issuing authority"
        options={metadata.policeClearanceAuthorityTypes}
        placeholder="Choose an authority"
      />
      {authority === 'other' ? (
        <FormTextField
          control={form.control}
          name={`police_clearances.${index}.issuing_authority_other`}
          label="Issuing authority (specify)"
          autoCapitalize="words"
          returnKeyType="done"
        />
      ) : null}
      <FormSelect
        control={form.control}
        name={`police_clearances.${index}.issuing_province`}
        label="Issuing province"
        options={metadata.canadianProvinces}
        searchable
        placeholder="Choose a province"
      />
      <FormSelect
        control={form.control}
        name={`police_clearances.${index}.issuing_city`}
        label="Issuing city"
        optional
        options={cities}
        searchable
        disabled={!province}
        placeholder="Choose a city"
      />
      <FormDateField
        control={form.control}
        name={`police_clearances.${index}.issue_date`}
        label="Issue date"
        placeholder="Select date"
        maximumDate={new Date()}
      />
      <FormTextField
        control={form.control}
        name={`police_clearances.${index}.reference_number`}
        label="Reference number"
        optional
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
      />
      <FormDocumentFile
        control={form.control}
        name={`police_clearances.${index}.file`}
        kind="policeClearance"
        label="Picture of the clearance"
        onUploading={onUploading}
      />
    </DocumentCard>
  );
}

/** Security licenses and police clearances: the first of each is required, a second is optional. */
export function LicensesStep(props: GuardStepProps) {
  const { form } = props;
  const licenses = useFieldArray({ control: form.control, name: 'security_licenses' });
  const clearances = useFieldArray({ control: form.control, name: 'police_clearances' });

  return (
    <View className="gap-6">
      <StepHeading
        title="Licenses and clearance"
        description="Your security license and a police clearance. You can add a second of each."
      />

      <ListError form={form} name="security_licenses" />
      {licenses.fields.map((field, index) => (
        <SecurityLicenseCard
          key={field.id}
          {...props}
          index={index}
          onRemove={index > 0 ? () => licenses.remove(index) : undefined}
        />
      ))}
      {licenses.fields.length < MAX_DOCUMENTS_PER_LIST ? (
        <Button
          title="Add another security license"
          variant="outline"
          icon={ICONS.shield}
          onPress={() => licenses.append({ ...EMPTY_SECURITY_LICENSE })}
        />
      ) : null}

      <ListError form={form} name="police_clearances" />
      {clearances.fields.map((field, index) => (
        <PoliceClearanceCard
          key={field.id}
          {...props}
          index={index}
          onRemove={index > 0 ? () => clearances.remove(index) : undefined}
        />
      ))}
      {clearances.fields.length < MAX_DOCUMENTS_PER_LIST ? (
        <Button
          title="Add another police clearance"
          variant="outline"
          icon={ICONS.shield}
          onPress={() => clearances.append({ ...EMPTY_POLICE_CLEARANCE })}
        />
      ) : null}
    </View>
  );
}
