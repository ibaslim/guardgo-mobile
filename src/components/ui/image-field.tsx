import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { FieldFrame } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { ImageSourceSheet } from '@/components/ui/image-source-sheet';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { pickImage, type ImageSource, type PickedImage } from '@/services/image-picker';
import type { FieldMeta } from '@/types/ui';
import { formatFileSize } from '@/utils/format';

export type { PickedImage };

export type ImageFieldProps = FieldMeta & {
  value: PickedImage | null;
  onChange: (value: PickedImage | null) => void;
  /** Called after the user picks, removes or cancels, so form validation can run. */
  onBlur?: () => void;
  /** Offer "Take photo" as well as the library. */
  allowCamera?: boolean;
  /** Let the user crop the image. */
  allowsEditing?: boolean;
  /** Crop ratio when editing, e.g. [1, 1]. Android only. */
  aspect?: [number, number];
  /** Compression from 0 to 1. */
  quality?: number;
};

/** Photo field: take a photo or choose one from the library, with a preview. */
export function ImageField({
  value,
  onChange,
  onBlur,
  allowCamera = true,
  allowsEditing = true,
  aspect,
  quality = 0.8,
  ...meta
}: ImageFieldProps) {
  const { label, error, disabled } = meta;
  const [sheetOpen, setSheetOpen] = useState(false);

  async function launch(source: ImageSource) {
    const picked = await pickImage(source, { allowsEditing, aspect, quality });
    if (picked) onChange(picked);
    onBlur?.();
  }

  function onPress() {
    if (allowCamera || value) {
      setSheetOpen(true);
    } else {
      launch('library');
    }
  }

  const boxBorder = error ? 'border-field-error' : value ? 'border-field-border' : 'border-dashed border-field-dashed';

  return (
    <FieldFrame {...meta}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}: change photo` : `${label}: add photo`}
        accessibilityHint={error ?? meta.hint}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        className={`min-h-[72px] flex-row items-center gap-3 rounded-xl border-[1.5px] px-3.5 py-2.5 active:opacity-80 ${boxBorder} ${
          disabled ? 'bg-surface-muted opacity-60' : 'bg-field'
        }`}>
        {value ? (
          <>
            <Image
              source={{ uri: value.uri }}
              contentFit="cover"
              accessibilityIgnoresInvertColors
              style={{ width: 60, height: 60, borderRadius: 10 }}
            />
            <View className="flex-1 gap-0.5">
              <Text variant="label" numberOfLines={1}>
                {value.fileName ?? 'Photo'}
              </Text>
              <Text variant="small" tone="muted">
                {[`${value.width} × ${value.height}`, value.fileSize ? formatFileSize(value.fileSize) : null]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            </View>
            <Text variant="label" tone="link">
              Change
            </Text>
          </>
        ) : (
          <>
            <View className="size-12 items-center justify-center rounded-[14px] bg-primary-soft">
              <Icon icon={allowCamera ? ICONS.camera : ICONS.library} size={22} tone="primary-soft" />
            </View>
            <View className="flex-1 gap-0.5">
              <Text variant="label" className="font-sans-semibold">Add photo</Text>
              <Text variant="small" tone="muted">
                {allowCamera ? 'Take a photo or choose one from your library.' : 'Choose a photo from your library.'}
              </Text>
            </View>
          </>
        )}
      </Pressable>

      <ImageSourceSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={label}
        allowCamera={allowCamera}
        onPick={launch}
        onRemove={
          value
            ? () => {
                onChange(null);
                onBlur?.();
              }
            : undefined
        }
      />
    </FieldFrame>
  );
}
