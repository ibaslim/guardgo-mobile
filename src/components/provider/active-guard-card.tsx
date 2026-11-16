import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { guardPhoto } from '@/services/provider-guards';
import type { SymbolIcon } from '@/types/ui';

const AVATAR_SIZE = 68;

function ContactLine({ icon, text }: { icon: SymbolIcon; text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Icon icon={icon} size={15} tone="muted" />
      <Text variant="small" tone="secondary" numberOfLines={1} className="min-w-0 flex-1">
        {text}
      </Text>
    </View>
  );
}

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/[\s._@-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || '?';

export type ActiveGuardCardProps = {
  id: string;
  /** The guard's name, or their email while they have no name yet. */
  title: string;
  /** The email under the name. Leave out when the title already is the email. */
  email?: string;
  phone?: string;
  /** True while this guard is being deactivated: the actions wait. */
  busy?: boolean;
  onDetails: () => void;
  onDeactivate: () => void;
};

/**
 * A guard on the provider's staff: round photo (or initials) with a green presence dot, name, email and phone on top, and a footer
 * split in two, Details on the left and Deactivate on the right.
 */
export function ActiveGuardCard({ id, title, email, phone, busy, onDetails, onDeactivate }: ActiveGuardCardProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo = photoFailed ? null : guardPhoto(id);

  return (
    <View className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <View className="flex-row items-center gap-4 px-4 py-4">
        {/* The green dot says "active" on the photo itself, so the card needs no status badge. */}
        <View accessible={false} style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}>
          <View
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }}
            className="items-center justify-center overflow-hidden bg-primary-soft">
            {photo ? (
              <Image
                source={{ uri: photo.uri, headers: photo.headers }}
                contentFit="cover"
                transition={150}
                onError={() => setPhotoFailed(true)}
                accessibilityIgnoresInvertColors
                style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
              />
            ) : (
              <Text variant="heading" tone="inherit" className="font-sans-bold text-primary-soft-content">
                {initialsOf(title)}
              </Text>
            )}
          </View>
          <View className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-[3px] border-surface bg-badge-success" />
        </View>

        <View className="min-w-0 flex-1 gap-1.5">
          <Text variant="body" className="font-sans-semibold" numberOfLines={1}>
            {title}
          </Text>
          {email ? <ContactLine icon={ICONS.mail} text={email} /> : null}
          {phone ? <ContactLine icon={ICONS.phone} text={phone} /> : null}
        </View>
      </View>

      <View className="flex-row border-t border-border">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Details for ${title}`}
          disabled={busy}
          onPress={onDetails}
          className="h-10 flex-1 items-center justify-center active:bg-surface-muted">
          <Text variant="label" tone="secondary" className={busy ? 'opacity-50' : ''}>
            Details
          </Text>
        </Pressable>

        <View className="w-px bg-border" accessible={false} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Deactivate ${title}`}
          accessibilityState={{ busy: Boolean(busy) }}
          disabled={busy}
          onPress={onDeactivate}
          className="h-10 flex-1 items-center justify-center active:bg-surface-muted">
          {busy ? (
            <ActivityIndicator colorClassName="accent-primary" />
          ) : (
            <Text variant="label" tone="danger" className="font-sans-semibold">
              Deactivate
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
