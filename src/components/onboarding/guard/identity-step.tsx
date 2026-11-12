import { View } from 'react-native';
import { useWatch } from 'react-hook-form';

import { FormWheelDateField, FormSelect, FormTextField } from '@/components/form/form-fields';
import { DocumentCard, ListError } from '@/components/onboarding/guard/document-card';
import { FormDocumentFile } from '@/components/onboarding/guard/document-file-field';
import type { GuardStepProps } from '@/components/onboarding/guard/guard-form';
import { StepHeading } from '@/components/onboarding/step-heading';
import { useOnChange } from '@/hooks/use-on-change';
import { IDENTITY_DOCUMENT_COUNT } from '@/schemas/guard-onboarding';

function IdentityCard({ form, metadata, onUploading, index }: GuardStepProps & { index: number }) {
  const type = useWatch({ control: form.control, name: `identification.${index}.document_type` });
  const option = metadata.identityDocumentTypes.find((item) => item.value === type);
  const requiresProvince = option?.requiresProvince ?? false;
  const requiresExpiry = option?.requiresExpiry ?? true;
  const passport = type === 'passport';

  // A different document type needs different details: clear what no longer applies.
  useOnChange(type, (next) => {
    const nextOption = metadata.identityDocumentTypes.find((item) => item.value === next);
    if (!nextOption?.requiresProvince) form.setValue(`identification.${index}.province`, null);
    if (next !== 'passport') form.setValue(`identification.${index}.passport_country`, null);
  });

  return (
    <DocumentCard title={`Document ${index + 1}`}>
      <FormSelect
        control={form.control}
        name={`identification.${index}.document_type`}
        label="Document type"
        options={metadata.identityDocumentTypes}
        searchable
        placeholder="Choose a document"
      />
      <FormTextField
        control={form.control}
        name={`identification.${index}.number`}
        label="Document number"
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
      />
      {requiresProvince ? (
        <FormSelect
          control={form.control}
          name={`identification.${index}.province`}
          label="Province"
          options={metadata.canadianProvinces}
          searchable
          placeholder="Choose a province"
        />
      ) : null}
      {passport ? (
        <FormSelect
          control={form.control}
          name={`identification.${index}.passport_country`}
          label="Passport country"
          options={metadata.countries}
          searchable
          placeholder="Choose a country"
        />
      ) : null}
      {requiresExpiry ? (
        <FormWheelDateField
          control={form.control}
          name={`identification.${index}.expiry_date`}
          label="Expiry date"
          placeholder="Select date"
          minimumDate={new Date()}
        />
      ) : null}
      <FormDocumentFile
        control={form.control}
        name={`identification.${index}.file`}
        kind="identity"
        label="Picture of the document"
        hint="Optional, but it speeds up verification."
        onUploading={onUploading}
      />
    </DocumentCard>
  );
}

/** Two identification documents (for example a driver's license and a passport). */
export function IdentityStep(props: GuardStepProps) {
  return (
    <View className="gap-6">
      <StepHeading title="Identification" description="We check your identity before approving shifts. Add two different documents." />
      <ListError form={props.form} name="identification" />
      {Array.from({ length: IDENTITY_DOCUMENT_COUNT }, (_, index) => (
        <IdentityCard key={index} {...props} index={index} />
      ))}
    </View>
  );
}
