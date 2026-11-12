import { View } from 'react-native';
import { useFieldArray, useWatch } from 'react-hook-form';

import { FormWheelDateField, FormSelect, FormTextField } from '@/components/form/form-fields';
import { DocumentCard, ListError } from '@/components/onboarding/guard/document-card';
import { FormDocumentFile } from '@/components/onboarding/guard/document-file-field';
import type { GuardStepProps } from '@/components/onboarding/guard/guard-form';
import { StepHeading } from '@/components/onboarding/step-heading';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { useOnChange } from '@/hooks/use-on-change';
import { EMPTY_TRAINING_CERTIFICATE, MAX_DOCUMENTS_PER_LIST } from '@/schemas/guard-onboarding';

function CertificateCard({ form, metadata, onUploading, index, onRemove }: GuardStepProps & { index: number; onRemove: () => void }) {
  const certificate = useWatch({ control: form.control, name: `training_certificates.${index}.certificate_name` });
  const organization = useWatch({ control: form.control, name: `training_certificates.${index}.issuing_organization` });

  // The list of organizations depends on the certificate. Keep the chosen one if it is still listed.
  useOnChange(certificate, (next) => {
    const name = `training_certificates.${index}.issuing_organization` as const;
    const chosen = form.getValues(name);
    const listed = next ? metadata.trainingIssuerOptionsMap[next]?.some((option) => option.value === chosen) : false;
    if (!listed) form.setValue(name, null);
  });

  const organizations = certificate ? (metadata.trainingIssuerOptionsMap[certificate] ?? []) : [];

  return (
    <DocumentCard title={`Certificate ${index + 1}`} onRemove={onRemove}>
      <FormSelect
        control={form.control}
        name={`training_certificates.${index}.certificate_name`}
        label="Certificate"
        options={metadata.trainingCertificateTypes}
        searchable
        placeholder="Choose a certificate"
      />
      <FormSelect
        control={form.control}
        name={`training_certificates.${index}.issuing_organization`}
        label="Issuing organization"
        options={organizations}
        searchable
        disabled={!certificate}
        hint={certificate ? undefined : 'Choose a certificate first.'}
        placeholder="Choose an organization"
      />
      {organization === 'other' ? (
        <FormTextField
          control={form.control}
          name={`training_certificates.${index}.issuing_organization_other`}
          label="Issuing organization (specify)"
          autoCapitalize="words"
          returnKeyType="done"
        />
      ) : null}
      <FormWheelDateField
        control={form.control}
        name={`training_certificates.${index}.issue_date`}
        label="Issue date"
        placeholder="Select date"
        maximumDate={new Date()}
      />
      <FormWheelDateField
        control={form.control}
        name={`training_certificates.${index}.expiry_date`}
        label="Expiry date"
        optional
        placeholder="Select date"
      />
      <FormDocumentFile
        control={form.control}
        name={`training_certificates.${index}.file`}
        kind="trainingCertificate"
        label="Picture of the certificate"
        onUploading={onUploading}
      />
    </DocumentCard>
  );
}

/** Training certificates. Optional: skip this step if there is nothing to add. */
export function TrainingStep(props: GuardStepProps) {
  const { form } = props;
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'training_certificates' });

  return (
    <View className="gap-6">
      <StepHeading title="Training" description="Add certificates you have, like first aid or basic security training. This step is optional." />

      <ListError form={form} name="training_certificates" />
      {fields.length === 0 ? (
        <View className="rounded-xl border border-dashed border-border bg-surface-muted p-5">
          <Text tone="secondary">No certificates yet. Add one, or continue without.</Text>
        </View>
      ) : null}
      {fields.map((field, index) => (
        <CertificateCard key={field.id} {...props} index={index} onRemove={() => remove(index)} />
      ))}
      {fields.length < MAX_DOCUMENTS_PER_LIST ? (
        <Button
          title="Add a certificate"
          variant="outline"
          icon={ICONS.shield}
          onPress={() => append({ ...EMPTY_TRAINING_CERTIFICATE }, { shouldFocus: false })}
        />
      ) : null}
    </View>
  );
}
