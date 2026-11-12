import { useEffect } from 'react';

import { toast } from '@/services/toast';

/**
 * The form-level error from the last submit (`serverError` from useApiForm), shown as a failure
 * toast at the bottom of the screen. Renders nothing itself.
 */
export function FormError({ message }: { message?: string }) {
  useEffect(() => {
    if (message) toast.failure(message);
  }, [message]);

  return null;
}
