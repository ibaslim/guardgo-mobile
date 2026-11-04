import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Entrance } from '@/components/ui/entrance';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';

const REASONS = [
  { title: 'A policy or compliance review', detail: 'An administrator turned off access to this account.' },
  { title: 'Nothing is deleted', detail: 'Your profile and documents are kept while the account is blocked.' },
] as const;

/**
 * Shown when sign-in is refused with "account blocked" (the account or its company was banned).
 * There is nothing to retry here, so the only way out is back to the sign-in screen.
 */
export default function AccountBlockedScreen() {
  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-7 px-6 pb-6 pt-8" showsVerticalScrollIndicator={false}>
        {/* A GuardGo pass that has been switched off: same card as the review screen, in the danger colours. */}
        <Entrance step={0}>
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <View className="flex-row items-center gap-3 bg-danger-soft px-4 py-3.5">
              <View className="size-9 items-center justify-center rounded-full bg-danger" accessible={false}>
                <Icon icon={ICONS.blocked} size={18} colorVar="--color-on-primary" />
              </View>
              <Text variant="label" tone="inherit" className="flex-1 text-danger-soft-content">
                Access turned off
              </Text>
            </View>
            <View className="gap-1 p-4 opacity-60">
              <Text variant="caption" tone="muted">
                GuardGo pass
              </Text>
              <View className="h-2.5 w-2/3 rounded-full bg-border" />
              <View className="mt-1 h-2.5 w-1/2 rounded-full bg-border" />
            </View>
          </View>
        </Entrance>

        <Entrance step={1}>
          <View className="gap-2">
            <Text variant="title" accessibilityRole="header">
              Account blocked
            </Text>
            <Text tone="secondary">You can&apos;t sign in with this account right now.</Text>
          </View>
        </Entrance>

        <Entrance step={2}>
          <View>
            {REASONS.map((reason, index) => (
              <View key={reason.title} className="flex-row gap-4">
                <View className="items-center">
                  <View className="mt-1.5 size-2.5 rounded-full bg-danger" accessible={false} />
                  {index < REASONS.length - 1 ? <View className="w-0.5 flex-1 bg-border" /> : null}
                </View>
                <View className={`flex-1 gap-0.5 ${index < REASONS.length - 1 ? 'pb-5' : ''}`}>
                  <Text variant="label">{reason.title}</Text>
                  <Text variant="small" tone="muted">
                    {reason.detail}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Entrance>

        <View className="gap-3">
          <Text variant="small" tone="muted">
            Think this is a mistake? Contact GuardGo support from the email address on this account.
          </Text>
          <Button title="Back to sign in" size="lg" onPress={() => router.replace('/login')} />
        </View>
      </ScrollView>
    </Screen>
  );
}
