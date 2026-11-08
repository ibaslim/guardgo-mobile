import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ClientStepEditor } from '@/components/account/client-step-editor';
import { EditHeading } from '@/components/account/edit-step-shell';
import { GuardStepEditor } from '@/components/account/guard-step-editor';
import { ProviderStepEditor } from '@/components/account/provider-step-editor';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import {
  CLIENT_PROFILE_STEPS,
  GUARD_PROFILE_STEPS,
  PROVIDER_PROFILE_STEPS,
  type ClientProfileStep,
  type GuardProfileStep,
  type ProviderProfileStep,
} from '@/constants/profile-steps';
import { useRoleArea } from '@/hooks/use-session';

const isStep = <T extends string>(steps: readonly { key: T }[], value: string | undefined): value is T =>
  steps.some((item) => item.key === value);

/**
 * Opens one section of the signed-in user's profile (listed on the Account screen) to see and update
 * it. The same screens as onboarding, filled in with what was saved: a guard's (and a provider's
 * guard's), a service provider's or a client's, by role.
 */
export default function EditProfileScreen() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const area = useRoleArea();

  if (area === 'guard' && isStep<GuardProfileStep>(GUARD_PROFILE_STEPS, step)) return <GuardStepEditor step={step} />;
  if (area === 'provider' && isStep<ProviderProfileStep>(PROVIDER_PROFILE_STEPS, step)) return <ProviderStepEditor step={step} />;
  if (area === 'client' && isStep<ClientProfileStep>(CLIENT_PROFILE_STEPS, step)) return <ClientStepEditor step={step} />;

  return (
    <Screen>
      <EditHeading title="Edit profile" />
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Text variant="heading" className="text-center">
          Nothing to edit here
        </Text>
        <Text tone="secondary" className="text-center">
          This section is not part of your profile.
        </Text>
        <Button title="Back to account" variant="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
