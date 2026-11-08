import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { FormError } from '@/components/form/form-error';
import { StepHeadingEditContext } from '@/components/onboarding/step-heading';
import { Button } from '@/components/ui/button';
import { HeaderBackButton } from '@/components/navigation/header-back-button';
import { FormScrollView } from '@/components/ui/form-scroll-view';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export type EditStepShellProps = {
  /** The section's name, as in the Profile card. It replaces the step's own title in the heading. */
  title: string;
  /** The section's form. Its heading (StepHeading) gets the back chevron. */
  children: ReactNode;
  onSave: () => void;
  saving: boolean;
  /** Blocks Save, e.g. while a photo or document is uploading. */
  disabled?: boolean;
  /** The server's error for the section, shown above the button. */
  serverError?: string;
  /** Shown above the button, e.g. "Uploading…" or a problem in another section. */
  notice?: string;
};

/** The heading of an edit screen: a chevron that goes back, and the section's name. */
export function EditHeading({ title }: { title: string }) {
  return (
    <View className="flex-row items-center gap-1 px-3 pb-1 pt-2">
      <HeaderBackButton />
      <Text variant="title" accessibilityRole="header" numberOfLines={1} className="min-w-0 flex-1">
        {title}
      </Text>
    </View>
  );
}

/**
 * The frame of an edit screen: the section's form, then a Save button. There is no header bar; the
 * section's own heading carries the back chevron (see StepHeading).
 */
export function EditStepShell({ title, children, onSave, saving, disabled, serverError, notice }: EditStepShellProps) {
  return (
    <Screen>
      <FormScrollView contentContainerStyle={{ flexGrow: 1, gap: 24, padding: 24, paddingBottom: 32 }}>
        <StepHeadingEditContext.Provider value={{ title }}>{children}</StepHeadingEditContext.Provider>
        <FormError message={serverError} />
        {notice ? (
          <Text variant="small" tone="muted" accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}
        <View className="flex-1 justify-end">
          <Button title="Save changes" size="lg" onPress={onSave} loading={saving} disabled={disabled} />
        </View>
      </FormScrollView>
    </Screen>
  );
}

/** Shown while the saved profile and the option lists load. */
export function EditStepLoading({ title }: { title: string }) {
  return (
    <Screen>
      <EditHeading title={title} />
      <View className="flex-1 items-center justify-center gap-3" accessibilityLiveRegion="polite">
        <ActivityIndicator colorClassName="accent-primary" />
        <Text tone="muted">Loading…</Text>
      </View>
    </Screen>
  );
}

/** Shown when the option lists could not be loaded. */
export function EditStepFailed({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <Screen>
      <EditHeading title={title} />
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Text variant="heading" className="text-center">
          Could not load this section
        </Text>
        <Text tone="secondary" className="text-center">
          Check your connection and try again.
        </Text>
        <Button title="Try again" variant="secondary" onPress={onRetry} />
      </View>
    </Screen>
  );
}
