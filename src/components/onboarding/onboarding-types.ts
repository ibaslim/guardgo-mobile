import type { UseFormReturn } from 'react-hook-form';

import type { ClientOnboardingValues } from '@/types/onboarding';

/** The one form shared by all onboarding steps. */
export type OnboardingForm = UseFormReturn<ClientOnboardingValues, unknown, ClientOnboardingValues>;
