import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ImageSourceSheet } from '@/components/ui/image-source-sheet';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { pickImage, type ImageSource, type PickedImage } from '@/services/image-picker';

const SIZES = { md: 84, lg: 112 } as const;
const SQUARE_RADIUS = { md: 18, lg: 24 } as const;

export type ImageUploadCardProps = {
  /** What the picture is, e.g. "Profile photo" or "Company logo". Shown as the card title. */
  label: string;
  /** The current image: a picked one, or `{ uri }` of one already on the server. `null` shows the empty state. */
  value: { uri: string; headers?: Record<string, string> } | null;
  /** A new image was chosen, or `null` when the user removed it. Upload it from here. */
  onChange: (value: PickedImage | null) => void;
  /** `circle` for people (profile photo), `square` for companies (logo). */
  shape?: 'circle' | 'square';
  size?: keyof typeof SIZES;
  /** Text the empty state takes its initials from, e.g. a person's or company's name. */
  fallbackText?: string;
  /** Help text under the title, e.g. "PNG or JPG, at least 400 × 400." */
  hint?: string;
  /** Message shown under the card, e.g. a failed upload. */
  error?: string;
  /** Shows a spinner over the picture while it uploads or is removed, and blocks the buttons. */
  loading?: boolean;
  disabled?: boolean;
  /** Offer "Take photo" as well as the library. */
  allowCamera?: boolean;
  /** Let the user crop the image. Defaults to on, with a square crop. */
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  /** Ask before removing. */
  confirmRemove?: boolean;
};

const initialsOf = (text?: string) =>
  (text ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

/**
 * Card for a single picture such as a client's profile photo or a company logo: shows it (or an
 * empty state), and lets the user add, change or remove it. It does not upload anything itself;
 * handle `onChange` and send the image to the server.
 */
export function ImageUploadCard({
  label,
  value,
  onChange,
  shape = 'circle',
  size = 'md',
  fallbackText,
  hint,
  error,
  loading = false,
  disabled = false,
  allowCamera = true,
  allowsEditing = true,
  aspect = [1, 1],
  quality = 0.8,
  confirmRemove = true,
}: ImageUploadCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const busy = loading || disabled;
  const dimension = SIZES[size];
  const radius = shape === 'circle' ? dimension / 2 : SQUARE_RADIUS[size];
  const initials = initialsOf(fallbackText);

  async function launch(source: ImageSource) {
    const picked = await pickImage(source, { allowsEditing, aspect, quality });
    if (picked) onChange(picked);
  }

  function startPick() {
    if (allowCamera) {
      setSheetOpen(true);
    } else {
      launch('library');
    }
  }

  function remove() {
    if (!confirmRemove) {
      onChange(null);
      return;
    }
    Alert.alert('Remove photo?', `This removes your current ${label.toLowerCase()}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onChange(null) },
    ]);
  }

  return (
    <View className="gap-2">
      <View
        className={`flex-row items-center gap-4 rounded-xl border bg-surface p-4 shadow-sm ${
          error ? 'border-field-error' : 'border-border'
        } ${disabled ? 'opacity-60' : ''}`}>
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={value ? `${label}: change` : `${label}: add`}
          accessibilityState={{ disabled: busy, busy: loading }}
          disabled={busy}
          onPress={startPick}
          className="active:opacity-80">
          <View
            style={{ width: dimension, height: dimension, borderRadius: radius }}
            className={`items-center justify-center overflow-hidden ${
              value ? 'bg-surface-muted' : 'border-[1.5px] border-dashed border-field-dashed bg-primary-soft'
            }`}>
            {value ? (
              <Image
                source={{ uri: value.uri, headers: value.headers }}
                contentFit="cover"
                transition={150}
                accessibilityIgnoresInvertColors
                style={{ width: dimension, height: dimension }}
              />
            ) : initials ? (
              <Text variant="heading" tone="inherit" className="font-sans-bold text-primary-soft-content">
                {initials}
              </Text>
            ) : (
              <Icon icon={ICONS.camera} size={size === 'lg' ? 32 : 26} tone="primary-soft" />
            )}
            {loading ? (
              <View className="absolute inset-0 items-center justify-center bg-black/45">
                <ActivityIndicator color="#ffffff" />
              </View>
            ) : null}
          </View>
        </Pressable>

        <View className="min-w-0 flex-1 gap-3">
          <View className="gap-0.5">
            <Text variant="label" className="font-sans-semibold">
              {label}
            </Text>
            <Text variant="small" tone="muted">
              {hint ?? (value ? 'Looks good. You can change or remove it.' : 'Add a photo so people can recognise you.')}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <Button
              title={value ? 'Change' : 'Upload photo'}
              variant={value ? 'secondary' : 'primary'}
              size="sm"
              icon={value ? ICONS.camera : ICONS.library}
              disabled={busy}
              onPress={startPick}
            />
            {value ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${label.toLowerCase()}`}
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={remove}
                className={`min-h-9 flex-row items-center gap-1.5 rounded-[10px] border border-field-error px-3.5 active:opacity-70 ${
                  busy ? 'opacity-50' : ''
                }`}>
                <Icon icon={ICONS.trash} size={15} tone="danger" />
                <Text variant="label" tone="inherit" className="font-sans-semibold text-[13px] text-field-error">
                  Remove
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {error ? (
        <View className="flex-row gap-1.5 px-0.5" accessibilityLiveRegion="polite">
          <View className="pt-px">
            <Icon icon={ICONS.error} size={15} tone="danger" />
          </View>
          <Text variant="small" tone="inherit" className="flex-1 text-[13px] text-field-error">
            {error}
          </Text>
        </View>
      ) : null}

      <ImageSourceSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={label}
        allowCamera={allowCamera}
        onPick={launch}
      />
    </View>
  );
}
