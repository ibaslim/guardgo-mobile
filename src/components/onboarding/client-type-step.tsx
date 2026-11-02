import { Pressable, View } from 'react-native';

import { StepProgress, type StepProgressProps } from '@/components/onboarding/step-progress';
import { Entrance } from '@/components/ui/entrance';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import type { ClientKind } from '@/types/onboarding';
import type { SymbolIcon } from '@/types/ui';

const KINDS: readonly { value: ClientKind; title: string; description: string; icon: SymbolIcon }[] = [
  { value: 'individual', title: "I'm an individual", description: 'I need guards for myself, my home or my own events.', icon: ICONS.user },
  { value: 'company', title: "I'm a company", description: 'I need guards for my business, offices or sites.', icon: ICONS.building },
];

/** Full-screen first step: is this client an individual or a company? Tapping a card moves on. */
export function ClientTypeStep({
  onSelect,
  progress,
  selected,
}: {
  onSelect: (kind: ClientKind) => void;
  progress: Omit<StepProgressProps, 'onBack'>;
  /** The type already chosen or found in the saved profile; its card is highlighted. */
  selected?: ClientKind | null;
}) {
  return (
    <Screen>
      <StepProgress {...progress} />
      <View className="flex-1 justify-center gap-8 px-6 pb-12">
        <Entrance step={0}>
          <View className="gap-1.5">
            <Text variant="title" accessibilityRole="header">
              Who is this account for?
            </Text>
            <Text tone="secondary">We use this to set up your profile.</Text>
          </View>
        </Entrance>

        <View className="gap-4">
          {KINDS.map((option, index) => (
            <Entrance key={option.value} step={index + 1}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={option.title}
                accessibilityHint={option.description}
                accessibilityState={{ selected: selected === option.value }}
                onPress={() => onSelect(option.value)}
                className={`flex-row items-center gap-4 rounded-2xl border bg-surface p-5 shadow-sm active:border-primary active:bg-primary-soft ${
                  selected === option.value ? 'border-primary' : 'border-border'
                }`}>
                <View className="size-14 items-center justify-center rounded-2xl bg-primary-soft" accessible={false}>
                  <Icon icon={option.icon} size={28} tone="primary-soft" />
                </View>
                <View className="min-w-0 flex-1 gap-1">
                  <Text variant="heading">{option.title}</Text>
                  <Text variant="small" tone="muted">
                    {option.description}
                  </Text>
                </View>
                <Icon icon={ICONS.chevronRight} size={18} tone="muted" />
              </Pressable>
            </Entrance>
          ))}
        </View>
      </View>
    </Screen>
  );
}
