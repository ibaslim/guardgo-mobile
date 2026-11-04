import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import type { FieldValues, UseFormGetFieldState, UseFormTrigger } from 'react-hook-form';

export type WizardStep<K extends string> = { key: K; title: string };

export type OnboardingWizardOptions<K extends string, TInput extends FieldValues, TOutput extends FieldValues> = {
  /** The form from `useApiForm`. */
  form: {
    trigger: UseFormTrigger<TInput>;
    getFieldState: UseFormGetFieldState<TInput>;
    submit: (onSubmit: (values: TOutput) => unknown) => () => Promise<void>;
  };
  /** The steps in order. They may change while the flow is open (a step can drop out). */
  steps: readonly WizardStep<K>[];
  /** The form fields a step checks before moving on. A step with none moves on straight away. */
  fieldsOf: (key: K) => readonly string[];
  /** Saves the whole profile. Throw an ApiError to show the server's errors under the fields. */
  save: (values: TOutput) => Promise<unknown>;
};

/**
 * The step logic every onboarding flow shares: which step is showing, the phone's back button going
 * to the previous step, checking a step's fields before moving on, and saving at the end. If the
 * server rejects a field on an earlier step, the wizard goes back to that step so the error is seen.
 */
export function useOnboardingWizard<K extends string, TInput extends FieldValues, TOutput extends FieldValues>({
  form,
  steps,
  fieldsOf,
  save,
}: OnboardingWizardOptions<K, TInput, TOutput>) {
  const [step, setStep] = useState(0);
  const lastStep = steps.length - 1;
  const current = steps[Math.min(step, lastStep)];
  const last = step >= lastStep;

  // The phone's back button goes to the previous step instead of leaving the flow.
  useEffect(() => {
    if (step === 0) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setStep((value) => Math.max(value - 1, 0));
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  const goBack = () => setStep((value) => Math.max(value - 1, 0));

  async function onContinue() {
    const fields = fieldsOf(current.key);
    if (fields.length > 0) {
      const valid = await form.trigger(fields as never, { shouldFocus: true });
      if (!valid) return;
    }
    setStep(step + 1);
  }

  const submit = form.submit(save);

  async function onFinish() {
    await submit();
    // A server error for a field on an earlier step would be invisible here: go to that step.
    const failed = steps.findIndex((item) => fieldsOf(item.key).some((name) => form.getFieldState(name as never).error));
    if (failed >= 0 && failed !== lastStep) setStep(failed);
  }

  return {
    step,
    setStep,
    current,
    last,
    total: steps.length,
    /** Goes to the previous step, or undefined on the first step (there is nothing to go back to). */
    onBack: step > 0 ? goBack : undefined,
    onContinue,
    onFinish,
  };
}
