import type { UseFormReturn } from 'react-hook-form';

import type { GuardMetadata } from '@/types/guard-onboarding';
import type { ProviderOnboardingValues } from '@/types/provider-onboarding';

/** The one form shared by all service provider onboarding steps. */
export type ProviderForm = UseFormReturn<ProviderOnboardingValues, unknown, ProviderOnboardingValues>;

/** What every service provider onboarding step receives. */
export type ProviderStepProps = {
  form: ProviderForm;
  /** The option lists are the guard ones: provinces, cities, license types, guard types. */
  metadata: GuardMetadata;
  /** Called with +1 when a document upload starts and -1 when it ends, so Continue can wait for it. */
  onUploading: (change: 1 | -1) => void;
};
