import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { documentSource, openDocumentExternally } from '@/services/documents';
import { toast } from '@/services/toast';
import type { UploadedFile } from '@/types/guard-onboarding';

export type DocumentPreviewProps = {
  file: UploadedFile;
  /** What the document is, e.g. "Security license". Shown above the full-size picture. */
  title: string;
};

/**
 * A small picture of an uploaded document. Tap it to see it full size. Pictures only: the app can't
 * show a PDF, so those say so instead.
 */
export function DocumentPreview({ file, title }: DocumentPreviewProps) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState(false);

  async function openOutside() {
    setOpening(true);
    try {
      await openDocumentExternally(file);
    } catch {
      toast.failure("Couldn't open this file.");
    } finally {
      setOpening(false);
    }
  }

  if (file.mimeType && !file.mimeType.startsWith('image/')) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${file.name}`}
        disabled={opening}
        onPress={openOutside}
        className="flex-row items-center gap-3 rounded-lg border border-border bg-surface-muted p-3 active:opacity-80">
        <Icon icon={ICONS.note} size={20} tone="muted" />
        <View className="min-w-0 flex-1">
          <Text variant="small" className="font-sans-semibold" numberOfLines={1}>
            {file.name}
          </Text>
          <Text variant="caption" tone="muted">
            {opening ? 'Opening…' : 'Tap to open in another app'}
          </Text>
        </View>
        {opening ? <ActivityIndicator colorClassName="accent-primary" /> : null}
      </Pressable>
    );
  }

  if (failed) {
    return (
      <View className="flex-row items-center gap-2 rounded-lg bg-surface-muted p-3" accessibilityRole="alert">
        <Icon icon={ICONS.error} size={18} tone="danger" />
        <Text variant="small" tone="secondary" className="flex-1">
          The file couldn&apos;t be loaded.
        </Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={`View ${title}`}
        onPress={() => setOpen(true)}
        className="h-44 overflow-hidden rounded-lg border border-border bg-surface-muted active:opacity-80">
        <Image
          source={documentSource(file)}
          contentFit="cover"
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%' }}
          accessibilityIgnoresInvertColors
        />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={title} size="tall">
        <View className="flex-1 px-4 pb-2">
          <Image
            source={documentSource(file)}
            contentFit="contain"
            style={{ flex: 1 }}
            accessibilityIgnoresInvertColors
            accessibilityLabel={title}
          />
        </View>
      </Sheet>
    </>
  );
}
