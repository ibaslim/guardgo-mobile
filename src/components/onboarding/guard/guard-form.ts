import type { UseFormReturn } from 'react-hook-form';

import type { GuardMetadata, GuardOnboardingValues } from '@/types/guard-onboarding';

/** The one form shared by all guard onboarding steps. */
export type GuardForm = UseFormReturn<GuardOnboardingValues, unknown, GuardOnboardingValues>;

/** What every guard onboarding step receives. */
export type GuardStepProps = {
  form: GuardForm;
  metadata: GuardMetadata;
  /** Called with +1 when a document upload starts and -1 when it ends, so Continue can wait for it. */
  onUploading: (change: 1 | -1) => void;
};
