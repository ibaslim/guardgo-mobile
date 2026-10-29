import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFormState, type FieldValues, type UseFormProps } from 'react-hook-form';
import { z } from 'zod';

import { FORM_SERVER_ERROR } from '@/constants/form';
import { applyServerErrors, type ServerFieldMap } from '@/utils/form-errors';

export type UseApiFormOptions<TInput extends FieldValues, TOutput extends FieldValues> = Omit<
  UseFormProps<TInput, unknown, TOutput>,
  'resolver'
> & {
  /** Client-side validation. Its messages show under each field. */
  schema: z.ZodType<TOutput, TInput>;
  /** Server field names that differ from the form's, e.g. `{ user_name: 'username' }`. */
  serverFields?: ServerFieldMap<TInput>;
};

/**
 * React Hook Form with a Zod schema and server error handling.
 *
 * `submit(onSubmit)` validates with the schema, then runs `onSubmit` with the parsed values. If it
 * throws an ApiError, the server's validation errors appear under their fields, and anything else
 * (connection problems, errors for unknown fields, ...) appears in `serverError`. A field's server
 * error clears when the user edits it.
 *
 *   const form = useApiForm({ schema, defaultValues: { name: '' } });
 *   <Button onPress={form.submit((values) => api.post(ENDPOINTS.x, values))} loading={form.isSubmitting} />
 */
export function useApiForm<TInput extends FieldValues, TOutput extends FieldValues = TInput>({
  schema,
  serverFields,
  ...options
}: UseApiFormOptions<TInput, TOutput>) {
  const form = useForm<TInput, unknown, TOutput>({
    mode: 'onTouched',
    ...options,
    resolver: zodResolver<TInput, unknown, TOutput>(schema),
  });

  // Server errors can only go under fields the form knows: the schema's keys plus any default values.
  const formFields = () => [
    ...(schema instanceof z.ZodObject ? Object.keys(schema.shape) : []),
    ...Object.keys(form.getValues() ?? {}),
  ];

  // Returns a plain press handler, so it can go straight to a Button's onPress.
  const submit = (onSubmit: (values: TOutput) => unknown) => () =>
    form.handleSubmit(async (values) => {
      form.clearErrors('root');
      try {
        await onSubmit(values);
      } catch (error) {
        applyServerErrors(form.setError, error, formFields(), serverFields);
      }
    })();

  // useForm returns the same object every render and updates formState inside it, so the React
  // Compiler keeps showing old values (e.g. isSubmitting stays false). useFormState returns a new
  // state object on each change, which the compiler does pick up.
  const formState = useFormState({ control: form.control });

  return {
    ...form,
    formState,
    submit,
    /** True while `submit`'s handler is running, e.g. for a button's `loading`. */
    isSubmitting: formState.isSubmitting,
    /** The form's non-field error from the last submit, if any. */
    serverError: formState.errors.root?.[FORM_SERVER_ERROR]?.message,
  };
}
