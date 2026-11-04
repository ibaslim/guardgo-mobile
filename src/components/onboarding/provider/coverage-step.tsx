import { View } from 'react-native';

import { GuardTypeChips } from '@/components/onboarding/guard/guard-type-chips';
import { OperatingRegionsEditor } from '@/components/onboarding/provider/operating-regions-editor';
import type { ProviderStepProps } from '@/components/onboarding/provider/provider-form';
import { StepHeading } from '@/components/onboarding/step-heading';

/** Where the company can send guards, and what kinds of guards it offers. */
export function CoverageStep(props: ProviderStepProps) {
  const { form, metadata } = props;

  return (
    <View className="gap-6">
      <StepHeading
        title="Coverage"
        description="The provinces and cities you can deploy guards in, and the kinds of guards you offer."
      />

      <OperatingRegionsEditor {...props} />

      <View className="gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <GuardTypeChips
          control={form.control}
          name="guard_categories"
          label="Guard categories offered"
          options={metadata.guardTypeOptions}
        />
      </View>
    </View>
  );
}
