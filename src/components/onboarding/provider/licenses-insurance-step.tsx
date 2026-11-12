import { View } from 'react-native';
import { useFieldArray, useWatch } from 'react-hook-form';

import { FormWheelDateField, FormSelect, FormTextField } from '@/components/form/form-fields';
import { DocumentCard, ListError } from '@/components/onboarding/guard/document-card';
import { FormDocumentFile } from '@/components/onboarding/guard/document-file-field';
import type { ProviderStepProps } from '@/components/onboarding/provider/provider-form';
import { StepHeading } from '@/components/onboarding/step-heading';
import { Button } from '@/components/ui/button';
import { ICONS } from '@/constants/icons';
import { issuingAuthorityFor } from '@/constants/provincial-authorities';
import { useOnChange } from '@/hooks/use-on-change';
import { EMPTY_LICENSE, MAX_LICENSES } from '@/schemas/provider-onboarding';

type LicenseCardProps = ProviderStepProps & { index: number; onRemove?: () => void };

function LicenseCard({ form, metadata, onUploading, index, onRemove }: LicenseCardProps) {
  const province = useWatch({ control: form.control, name: `security_licenses.${index}.issuing_province` });

  // The issuing authority follows the province. Text the user typed themselves is kept.
  useOnChange(province, (next, before) => {
    const name = `security_licenses.${index}.issuing_authority` as const;
    const current = form.getValues(name);
    if (!current || current === issuingAuthorityFor(before)) form.setValue(name, issuingAuthorityFor(next));
  });

  return (
    <DocumentCard title={`Security license ${index + 1}`} onRemove={onRemove}>
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
      <FormWheelDateField
        control={form.control}
        name={`security_licenses.${index}.issue_date`}
        label="Issue date"
        optional
        placeholder="Select date"
        maximumDate={new Date()}
      />
      <FormWheelDateField
        control={form.control}
        name={`security_licenses.${index}.expiry_date`}
        label="Expiry date"
        placeholder="Select date"
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

/** Security licenses (the first is required, a second is optional) and the optional insurance policy. */
export function LicensesInsuranceStep(props: ProviderStepProps) {
  const { form, onUploading } = props;
  const licenses = useFieldArray({ control: form.control, name: 'security_licenses' });

  return (
    <View className="gap-6">
      <StepHeading
        title="Licenses and insurance"
        description="Your company's security license, and your insurance if you have it. Licenses must be active to deploy guards."
      />

      <ListError form={form} name="security_licenses" />
      {licenses.fields.map((field, index) => (
        <LicenseCard
          key={field.id}
          {...props}
          index={index}
          onRemove={index > 0 ? () => licenses.remove(index) : undefined}
        />
      ))}
      {licenses.fields.length < MAX_LICENSES ? (
        <Button
          title="Add another security license"
          variant="outline"
          icon={ICONS.shield}
          onPress={() => licenses.append({ ...EMPTY_LICENSE })}
        />
      ) : null}

      <DocumentCard title="Insurance">
        <FormTextField
          control={form.control}
          name="insurance.policy_number"
          label="Policy number"
          optional
          hint="Needed with the expiry date if you fill in any insurance detail."
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => form.setFocus('insurance.coverage_amount')}
        />
        <FormTextField
          control={form.control}
          name="insurance.coverage_amount"
          label="Coverage amount (CAD)"
          optional
          placeholder="2500000"
          keyboardType="decimal-pad"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => form.setFocus('insurance.coverage_details')}
        />
        <FormWheelDateField
          control={form.control}
          name="insurance.expiry_date"
          label="Policy expiry date"
          optional
          placeholder="Select date"
        />
        <FormTextField
          control={form.control}
          name="insurance.coverage_details"
          label="Coverage details"
          optional
          multiline
          returnKeyType="done"
        />
        <FormDocumentFile
          control={form.control}
          name="insurance.file"
          kind="insurance"
          label="Picture of the policy"
          onUploading={onUploading}
        />
      </DocumentCard>
    </View>
  );
}
