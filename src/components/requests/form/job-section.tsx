import { FormSelect, FormTextField } from '@/components/form/form-fields';
import type { RequestForm } from '@/components/requests/form/request-form-type';
import { FormSection } from '@/components/ui/form-section';
import type { MetadataOption } from '@/types/onboarding';

const WHO_CAN_COVER = [
  { value: 'individual_only', label: 'Direct guards only' },
  { value: 'service_provider_only', label: 'Service provider teams only' },
  { value: 'hybrid', label: 'Guards or service providers' },
] as const;

export type JobSectionProps = {
  form: RequestForm;
  /** The kinds of guard a client can ask for. Left out when the server sent none. */
  guardTypes: readonly MetadataOption[];
  /** The title and guard count can't change once the request is out. */
  locked?: boolean;
};

/** What the job is: its name, who may cover it, and how many guards it needs. */
export function JobSection({ form, guardTypes, locked = false }: JobSectionProps) {
  return (
    <FormSection title="The job" description="Name it, say who can cover it, and how many guards you need.">
      <FormTextField
        control={form.control}
        name="title"
        label="Job title"
        disabled={locked}
        placeholder="Weekend event security"
        autoCapitalize="sentences"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => form.setFocus('guards_required')}
      />
      <FormSelect control={form.control} name="fulfillment_mode" label="Who can cover it" options={WHO_CAN_COVER} />
      {guardTypes.length > 0 ? (
        <FormSelect
          control={form.control}
          name="guard_type"
          label="Type of guard"
          optional
          options={guardTypes}
          placeholder="Any type"
        />
      ) : null}
      <FormTextField
        control={form.control}
        name="guards_required"
        label="Guards needed"
        disabled={locked}
        hint={locked ? 'To add guards, ask for more guards from the request.' : undefined}
        keyboardType="number-pad"
        maxLength={3}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => form.setFocus('instructions')}
      />
      <FormTextField
        control={form.control}
        name="instructions"
        label="Special instructions"
        optional
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        placeholder="Dress code, where to report, who to ask for"
      />
    </FormSection>
  );
}
