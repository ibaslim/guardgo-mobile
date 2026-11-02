import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Entrance } from '@/components/ui/entrance';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';

const STEPS = [
  { title: 'Open the email', detail: 'It comes from GuardGo. Check your spam folder if it is not in your inbox.' },
  { title: 'Tap the confirmation link', detail: 'The link opens this app.' },
  { title: 'Sign in', detail: 'Use your username and password once your email is confirmed.' },
] as const;

/** Shown after a client or guard registers, until they confirm their email from the link we sent. */
export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();

  return (
    <Screen>
      <View className="flex-1 justify-between px-6 pb-4 pt-10">
        <View className="gap-8">
          <Entrance step={0}>
            <View className="items-center gap-6">
              {/* Outer ring is decoration only. */}
              <View className="size-32 items-center justify-center rounded-full bg-primary-soft/40" accessible={false}>
                <View className="size-24 items-center justify-center rounded-full bg-primary-soft">
                  <Icon icon={ICONS.mailUnread} size={44} tone="primary-soft" />
                </View>
              </View>
              <View className="items-center gap-2">
                <Text variant="title" accessibilityRole="header" className="text-center">
                  Check your email
                </Text>
                <Text tone="secondary" className="text-center">
                  We sent a confirmation link to
                </Text>
                <Text variant="body" className="text-center font-sans-bold" selectable>
                  {email || 'your email address'}
                </Text>
              </View>
            </View>
          </Entrance>

          <Entrance step={1}>
            <View className="gap-5 rounded-xl border border-border bg-surface p-5 shadow-sm">
              {STEPS.map((step, index) => (
                <View key={step.title} className="flex-row items-start gap-3.5">
                  <View className="size-7 items-center justify-center rounded-full bg-primary-soft" accessible={false}>
                    <Text variant="label" tone="inherit" className="text-primary-soft-content">
                      {index + 1}
                    </Text>
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text variant="label">{step.title}</Text>
                    <Text variant="small" tone="muted">
                      {step.detail}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Entrance>
        </View>

        <Entrance step={2}>
          <View className="gap-3 pt-8">
            <Text variant="small" tone="muted" className="text-center">
              Waiting for confirmation. The link expires after a while, so confirm soon.
            </Text>
            <Button title="Back to sign in" variant="secondary" size="lg" onPress={() => router.replace('/login')} />
          </View>
        </Entrance>
      </View>
    </Screen>
  );
}
