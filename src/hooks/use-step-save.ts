import { router } from 'expo-router';
import { useState } from 'react';
import type { FieldValues, UseFormGetFieldState, UseFormTrigger } from 'react-hook-form';

import { toast } from '@/services/toast';

type StepSaveOptions<TInput extends FieldValues, TOutput extends FieldValues> = {
  /** The form from `useApiForm`. */
  form: {
    trigger: UseFormTrigger<TInput>;
    getFieldState: UseFormGetFieldState<TInput>;
    submit: (onSubmit: (values: TOutput) => unknown) => () => Promise<void>;
  };
  /** The section being edited. */
  step: string;
  /** The profile's sections, to find one that needs attention. */
  steps: readonly { key: string; title: string }[];
  /** The form fields a section checks. */
  fieldsOf: (key: string) => readonly string[];
  /** Saves the whole profile. Throw an ApiError to show the server's errors under the fields. */
  save: (values: TOutput) => Promise<unknown>;
};

/**
 * Saving one section of an already filled-in profile. The section's own fields are checked first, so
 * their errors show right here; then the whole profile is saved, as the server expects it. The whole
 * profile is checked too, so if something in another section is invalid (say, edited on the web),
 * nothing is saved and `elsewhere` names the section to open instead of failing without a word.
 * On success the screen closes.
 */
export function useStepSave<TInput extends FieldValues, TOutput extends FieldValues>({
  form,
  step,
  steps,
  fieldsOf,
  save,
}: StepSaveOptions<TInput, TOutput>) {
  const [elsewhere, setElsewhere] = useState<string | undefined>();

  const submit = form.submit(async (values) => {
    await save(values);
    toast.success('Changes saved.');
    router.back();
  });

  async function onSave() {
    setElsewhere(undefined);
    const fields = fieldsOf(step);
    if (fields.length > 0) {
      const valid = await form.trigger(fields as never, { shouldFocus: true });
      if (!valid) return;
    }
    await submit();

    const other = steps.find((item) => item.key !== step && fieldsOf(item.key).some((name) => form.getFieldState(name as never).error));
    if (other) setElsewhere(`Some details in "${other.title}" need attention. Open that section and fix them, then try again.`);
  }

  return { onSave, elsewhere };
}
