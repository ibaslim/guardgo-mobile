import type { ReactNode } from 'react';
import { View } from 'react-native';

import { FormError } from '@/components/form/form-error';
import { StepProgress } from '@/components/onboarding/step-progress';
import { Button } from '@/components/ui/button';
import { Entrance } from '@/components/ui/entrance';
import { FormScrollView } from '@/components/ui/form-scroll-view';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export type OnboardingShellProps = {
  /** Zero-based index of the current step, the number of steps and the step's title. */
  step: number;
  total: number;
  title: string;
  /** Changes with the step, so each step's content comes in again. */
  stepKey: string;
  onBack?: () => void;
  /** True on the last step: it shows the server error and "Finish setup" instead of "Continue". */
  last: boolean;
  serverError?: string;
  /** True while the profile is being saved. */
  finishing: boolean;
  onContinue: () => void;
  onFinish: () => void;
  continueDisabled?: boolean;
  finishDisabled?: boolean;
  /** A line above the button, e.g. "Uploading…". */
  notice?: string;
  children: ReactNode;
};

/**
 * The frame of an onboarding step: progress header, scrolling content, and the Continue or
 * "Finish setup" button at the bottom. Each flow supplies the step content as children.
 */
export function OnboardingShell({
  step,
  total,
  title,
  stepKey,
  onBack,
  last,
  serverError,
  finishing,
  onContinue,
  onFinish,
  continueDisabled,
  finishDisabled,
  notice,
  children,
}: OnboardingShellProps) {
  return (
    <Screen>
      <StepProgress step={step} total={total} title={title} onBack={onBack} />
      <FormScrollView contentContainerStyle={{ flexGrow: 1, gap: 24, padding: 24, paddingBottom: 32 }}>
        <Entrance key={stepKey}>{children}</Entrance>

        {last ? <FormError message={serverError} /> : null}
        {notice ? (
          <Text variant="small" tone="muted" accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}

        <View className="flex-1 justify-end">
          {last ? (
            <Button title="Finish setup" size="lg" onPress={onFinish} loading={finishing} disabled={finishDisabled} />
          ) : (
            <Button title="Continue" size="lg" onPress={onContinue} disabled={continueDisabled} />
          )}
        </View>
      </FormScrollView>
    </Screen>
  );
}
