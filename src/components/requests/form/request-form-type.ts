import type { UseFormReturn } from 'react-hook-form';

import type { RequestFormValues } from '@/types/request-form';

/** The one form shared by all the sections of the request form. */
export type RequestForm = UseFormReturn<RequestFormValues, unknown, RequestFormValues>;
