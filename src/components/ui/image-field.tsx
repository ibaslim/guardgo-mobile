import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';

import { FieldFrame } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import type { FieldMeta, SymbolIcon } from '@/types/ui';
import { formatFileSize } from '@/utils/format';

/** A chosen image, ready to upload (e.g. as FormData `{ uri, name, type }`). */
export type PickedImage = {
  uri: string;
  width: number;
  height: number;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
};

type Source = 'camera' | 'library';

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

function toPickedImage(asset: ImagePicker.ImagePickerAsset): PickedImage {
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileName: asset.fileName ?? null,
    mimeType: asset.mimeType ?? null,
    fileSize: asset.fileSize ?? null,
  };
}

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
  // The picker opens only after the sheet has closed: iOS can't present two screens at once.
  const pendingSource = useRef<Source | null>(null);

  async function launch(source: Source) {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera access is off', 'Allow camera access in Settings to take a photo.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
        onBlur?.();
        return;
      }
    }

    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing, aspect, quality };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets[0]) {
      onChange(toPickedImage(result.assets[0]));
    }
    onBlur?.();
  }

  function choose(source: Source) {
    pendingSource.current = source;
    setSheetOpen(false);
  }

  function onSheetDismissed() {
    const source = pendingSource.current;
    pendingSource.current = null;
    if (source) launch(source);
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
        className={`min-h-[88px] flex-row items-center gap-3.5 rounded-[14px] border-[1.5px] px-4 py-3.5 active:opacity-80 ${boxBorder} ${
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

      <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title={label} onDismissed={onSheetDismissed}>
        <View className="px-3 pb-2">
          {allowCamera ? <SheetAction icon={ICONS.camera} title="Take photo" onPress={() => choose('camera')} /> : null}
          <SheetAction icon={ICONS.library} title="Choose from library" onPress={() => choose('library')} />
          {value ? (
            <SheetAction
              icon={ICONS.trash}
              title="Remove photo"
              destructive
              onPress={() => {
                onChange(null);
                setSheetOpen(false);
                onBlur?.();
              }}
            />
          ) : null}
        </View>
      </Sheet>
    </FieldFrame>
  );
}

type SheetActionProps = { icon: SymbolIcon; title: string; destructive?: boolean; onPress: () => void };

function SheetAction({ icon, title, destructive, onPress }: SheetActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-3.5 rounded-[12px] px-3 active:bg-surface-muted">
      <Icon icon={icon} size={20} tone={destructive ? 'danger' : 'secondary'} />
      <Text tone="inherit" className={destructive ? 'text-field-error' : 'text-content'}>
        {title}
      </Text>
    </Pressable>
  );
}
