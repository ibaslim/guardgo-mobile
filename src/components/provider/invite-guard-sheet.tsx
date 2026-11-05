import { useMemo } from 'react';
import { View } from 'react-native';
import { z } from 'zod';

import { FormError } from '@/components/form/form-error';
import { FormTextField } from '@/components/form/form-fields';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { useApiForm } from '@/hooks/use-api-form';
import { inviteGuard } from '@/services/provider-guards';
import { EMAIL } from '@/utils/validation';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter the guard’s email.').regex(EMAIL, 'Enter a valid email address.'),
});

type InviteValues = z.infer<typeof schema>;

export type InviteGuardSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Called after the invite was sent, with the email it went to. */
  onInvited: (email: string) => void;
};

/** Asks for the guard's email and sends them the invite. The guard sets a password from the emailed link. */
export function InviteGuardSheet({ visible, onClose, onInvited }: InviteGuardSheetProps) {
  const defaultValues = useMemo<InviteValues>(() => ({ email: '' }), []);
  const form = useApiForm({ schema, defaultValues });

  const send = form.submit(async ({ email }) => {
    await inviteGuard(email);
    form.reset(defaultValues);
    onInvited(email);
  });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Invite a guard"
      footer={<Button title="Send invite" icon={ICONS.mail} loading={form.isSubmitting} onPress={send} />}>
      <View className="gap-4 px-6">
        <Text tone="secondary">We email the guard a link to set their password. The link works for 30 days.</Text>
        <FormTextField
          control={form.control}
          name="email"
          label="Guard email"
          placeholder="name@example.com"
          icon={ICONS.mail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={send}
        />
        <FormError message={form.serverError} />
      </View>
    </Sheet>
  );
}
