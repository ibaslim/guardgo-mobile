import { View } from 'react-native';

import { Text } from '@/components/ui/text';

/** Title and one line of explanation at the top of an onboarding step. */
export function StepHeading({ title, description }: { title: string; description: string }) {
  return (
    <View className="gap-1.5">
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      <Text tone="secondary">{description}</Text>
    </View>
  );
}
