import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { ToastHost } from '@/components/ui/toast-host';

export type ConfirmDialogProps = {
  visible: boolean;
  /** Called on Cancel, a tap outside, or the back gesture. Not while the action is running. */
  onClose: () => void;
  title: string;
  message?: string;
  /** What the main button says: the action itself, e.g. "Approve" or "Delete". */
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` for deleting or removing, `primary` for everything else. */
  tone?: 'primary' | 'danger';
  /**
   * Runs when the main button is pressed. If it returns a promise, the button shows a spinner and both
   * buttons wait until it settles; the dialog then closes. Handle errors inside, e.g. with a toast.
   */
  onConfirm: () => void | Promise<void>;
};

/**
 * A short question over the screen: what is being decided, then one flat bar with Cancel on the left and
 * the action on the right. Use it instead of `Alert.alert` for approving, deleting and similar decisions.
 */
export function ConfirmDialog({
  visible,
  onClose,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const danger = tone === 'danger';

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      onClose();
    }
  }

  const close = () => {
    if (!busy) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <View className="flex-1 items-center justify-center px-6">
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} className="absolute inset-0 bg-overlay" />

        <View accessibilityViewIsModal className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface">
          <View className="p-6">
            <View className="gap-2">
              <Text variant="heading" accessibilityRole="header">
                {title}
              </Text>
              {message ? <Text tone="secondary">{message}</Text> : null}
            </View>
          </View>

          {/* One flat bar like the guard review card's: the choices share the width, split by a line. */}
          <View className="flex-row border-t border-border">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              disabled={busy}
              onPress={close}
              className="h-12 flex-1 items-center justify-center active:bg-surface-muted">
              <Text variant="label" tone="secondary" className={busy ? 'opacity-50' : ''}>
                {cancelLabel}
              </Text>
            </Pressable>

            <View className="w-px bg-border" accessible={false} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              accessibilityState={{ busy }}
              disabled={busy}
              onPress={confirm}
              className={`h-12 flex-1 items-center justify-center ${danger ? 'active:bg-danger-soft' : 'active:bg-primary-soft'}`}>
              {busy ? (
                <ActivityIndicator colorClassName={danger ? 'accent-danger' : 'accent-primary'} />
              ) : (
                <Text variant="label" tone="inherit" className={`font-sans-semibold ${danger ? 'text-danger' : 'text-primary'}`}>
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* A modal covers the app-level toast, so the dialog shows its own. */}
        <ToastHost />
      </View>
    </Modal>
  );
}
