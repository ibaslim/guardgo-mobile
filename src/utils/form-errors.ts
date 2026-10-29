import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { FORM_SERVER_ERROR, GENERIC_SUBMIT_ERROR } from '@/constants/form';
import { ApiError } from '@/services/api';

/** Server field name -> form field, for fields the API names differently (e.g. `{ user_name: 'username' }`). */
export type ServerFieldMap<T extends FieldValues> = Readonly<Record<string, Path<T>>>;

/**
 * Shows a failed submit on the form. Server validation errors go under their fields (the first one
 * gets focus); errors for fields the form doesn't have, and failures without field errors, become
 * the form's root error (`errors.root.server`).
 */
export function applyServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: unknown,
  formFields: readonly string[],
  fieldMap: ServerFieldMap<T> = {}
) {
  const setRootError = (message: string) => setError(`root.${FORM_SERVER_ERROR}`, { type: 'server', message });

  if (!(error instanceof ApiError)) {
    setRootError(GENERIC_SUBMIT_ERROR);
    return;
  }

  const unmatched: string[] = [];
  let matched = false;
  for (const [serverField, message] of Object.entries(error.fieldErrors)) {
    const field = fieldMap[serverField] ?? (formFields.includes(serverField) ? (serverField as Path<T>) : undefined);
    if (field) {
      setError(field, { type: 'server', message }, { shouldFocus: !matched });
      matched = true;
    } else {
      unmatched.push(`${serverField}: ${message}`);
    }
  }

  if (unmatched.length > 0) {
    setRootError(unmatched.join('\n'));
  } else if (!matched) {
    setRootError(error.message);
  }
}
