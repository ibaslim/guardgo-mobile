import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { ICONS } from '@/constants/icons';
import { getApiUrl } from '@/services/api';
import type { TenantImage } from '@/services/tenant';
import { sentenceCase, type ProfileStepRow } from '@/utils/account-profile';

const AVATAR_SIZE = 72;

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || '?';

export type AccountHeaderCardProps = {
  name: string;
  role: string;
  /** Account status (for example "active"), shown on the third row. */
  status?: string;
  photo: TenantImage | null;
};

/** Who is signed in: photo (or initials), then name, role and account status on three rows. */
export function AccountHeaderCard({ name, role, status, photo }: AccountHeaderCardProps) {
  return (
    <Card>
      <View className="flex-row items-center gap-4 p-4">
        <View
          accessible={false}
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: 22 }}
          className="items-center justify-center overflow-hidden bg-primary-soft">
          {photo ? (
            <Image
              source={{ uri: photo.uri, headers: photo.headers }}
              contentFit="cover"
              transition={150}
              accessibilityIgnoresInvertColors
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
            />
          ) : (
            <Text variant="title" tone="inherit" className="font-sans-bold text-primary-soft-content">
              {initialsOf(name)}
            </Text>
          )}
        </View>

        <View className="min-w-0 flex-1 gap-1.5">
          <Text variant="heading" numberOfLines={1} className="font-sans-semibold">
            {name}
          </Text>
          <Text variant="small" tone="secondary">
            {role}
          </Text>
          {status ? (
            <Text variant="small" tone="muted">
              Account status: {sentenceCase(status)}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

/**
 * The sections of the profile for this kind of account (see utils/account-profile.ts), under a
 * "Profile" title. A section with a chevron opens its edit screen, where the user sees and updates it.
 */
export function ProfileCard({ rows }: { rows: ProfileStepRow[] }) {
  return (
    <Card title="Profile">
      {rows.map((row, index) => {
        const content = (
          <>
            <Text variant="label" className="shrink-0">
              {row.title}
            </Text>
            <Text variant="small" tone="muted" numberOfLines={1} className="min-w-0 flex-1 text-right">
              {row.summary || 'Not added yet'}
            </Text>
            {row.step ? <Icon icon={ICONS.chevronRight} size={16} tone="muted" /> : null}
          </>
        );
        const className = 'min-h-14 flex-row items-center gap-3 px-4 py-3';
        const step = row.step;

        return (
          <Fragment key={row.title}>
            {index > 0 ? <View className="ml-4 h-px bg-border" /> : null}
            {step ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${row.title}: ${row.summary || 'not added yet'}`}
                accessibilityHint="Opens this section to view and update it"
                onPress={() => router.push({ pathname: '/edit-profile/[step]', params: { step } })}
                className={`${className} active:bg-surface-subtle`}>
                {content}
              </Pressable>
            ) : (
              <View className={className}>{content}</View>
            )}
          </Fragment>
        );
      })}
    </Card>
  );
}

/** The app's own settings: which server it talks to, and the theme. */
export function ConfigurationsCard() {
  const server = getApiUrl().replace(/^https?:\/\//, '');

  return (
    <Card title="Configurations">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Server: ${server || 'not set'}`}
        accessibilityHint="Opens the server settings"
        onPress={() => router.push('/server-config')}
        className="min-h-14 flex-row items-center gap-3 px-4 py-3 active:bg-surface-subtle">
        <View accessible={false} className="size-9 items-center justify-center rounded-[10px] bg-primary-soft">
          <Icon icon={ICONS.server} size={18} tone="primary-soft" />
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="label">Server</Text>
          <Text variant="small" tone={server ? 'muted' : 'danger'} numberOfLines={1}>
            {server || 'Not set. Add one to sign in.'}
          </Text>
        </View>
        <Icon icon={ICONS.chevronRight} size={16} tone="muted" />
      </Pressable>

      <View className="ml-4 h-px bg-border" />

      <View className="gap-3 px-4 py-3">
        <View className="flex-row items-center gap-3">
          <View accessible={false} className="size-9 items-center justify-center rounded-[10px] bg-primary-soft">
            <Icon icon={ICONS.palette} size={18} tone="primary-soft" />
          </View>
          <Text variant="label">Theme</Text>
        </View>
        <ThemeSwitcher />
      </View>
    </Card>
  );
}
