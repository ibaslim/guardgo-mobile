import type { UseFormReturn } from 'react-hook-form';

import type { ClientOnboardingValues } from '@/types/onboarding';

/** The one form shared by all client onboarding steps. */
export type ClientForm = UseFormReturn<ClientOnboardingValues, unknown, ClientOnboardingValues>;
