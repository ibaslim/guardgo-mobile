import { createContext, useContext } from 'react';
import { View } from 'react-native';

import { HeaderBackButton } from '@/components/navigation/header-back-button';
import { Text } from '@/components/ui/text';

/**
 * Set inside an edit screen (Account > Profile). There the step's heading gets a back chevron in
 * front of it, because those screens have no header bar, and the short section name from the
 * Profile card instead of the step's own longer title. In onboarding the progress header has its
 * own back arrow and the step's title is used.
 */
export const StepHeadingEditContext = createContext<{ title: string } | null>(null);

/** Title and one line of explanation at the top of an onboarding step (or of an edit screen). */
export function StepHeading({ title, description }: { title: string; description: string }) {
  const edit = useContext(StepHeadingEditContext);

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center">
        {/* Pulled left so the chevron itself lines up with the content's left edge. */}
        {edit ? (
          <View className="-ml-3">
            <HeaderBackButton />
          </View>
        ) : null}
        {/* With the chevron, the title is pulled in so the two read as one heading. */}
        <Text variant="title" accessibilityRole="header" className={`min-w-0 flex-1 ${edit ? '-ml-1.5' : ''}`}>
          {edit?.title ?? title}
        </Text>
      </View>
      <Text tone="secondary">{description}</Text>
    </View>
  );
}
