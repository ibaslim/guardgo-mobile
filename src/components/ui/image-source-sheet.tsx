import { useRef } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import type { ImageSource } from '@/services/image-picker';
import type { SymbolIcon } from '@/types/ui';

export type ImageSourceSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Offer "Take photo" as well as the library. */
  allowCamera?: boolean;
  /** Called after the sheet has closed, so the native picker never opens on top of it (iOS can't show two). */
  onPick: (source: ImageSource) => void;
  /** Adds a "Remove photo" action. */
  onRemove?: () => void;
};

/** Bottom sheet that asks where a photo comes from: camera or library. */
export function ImageSourceSheet({ visible, onClose, title, allowCamera = true, onPick, onRemove }: ImageSourceSheetProps) {
  const pending = useRef<ImageSource | null>(null);
  const removing = useRef(false);

  function choose(source: ImageSource) {
    pending.current = source;
    onClose();
  }

  function onDismissed() {
    const source = pending.current;
    pending.current = null;
    if (source) onPick(source);
    if (removing.current) {
      removing.current = false;
      onRemove?.();
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={title} onDismissed={onDismissed}>
      <View className="px-3 pb-2">
        {allowCamera ? <SheetAction icon={ICONS.camera} title="Take photo" onPress={() => choose('camera')} /> : null}
        <SheetAction icon={ICONS.library} title="Choose from library" onPress={() => choose('library')} />
        {onRemove ? (
          <SheetAction
            icon={ICONS.trash}
            title="Remove photo"
            destructive
            onPress={() => {
              removing.current = true;
              onClose();
            }}
          />
        ) : null}
      </View>
    </Sheet>
  );
}

type SheetActionProps = { icon: SymbolIcon; title: string; destructive?: boolean; onPress: () => void };

function SheetAction({ icon, title, destructive, onPress }: SheetActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-12 flex-row items-center gap-3 rounded-xl px-3 active:bg-surface-muted">
      <Icon icon={icon} size={20} tone={destructive ? 'danger' : 'secondary'} />
      <Text tone="inherit" className={destructive ? 'text-field-error' : 'text-content'}>
        {title}
      </Text>
    </Pressable>
  );
}
