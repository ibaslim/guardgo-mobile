import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { ImageSourceSheet } from '@/components/ui/image-source-sheet';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { ApiError } from '@/services/api';
import { checkDocument, deleteDocument, DOCUMENT_MAX_MB, documentSource, uploadDocument, type DocumentKind } from '@/services/documents';
import { pickImage, type ImageSource } from '@/services/image-picker';
import type { UploadedFile } from '@/types/guard-onboarding';
import { formatFileSize } from '@/utils/format';

type DocumentFileFieldProps = {
  kind: DocumentKind;
  /** Title of the field, e.g. "Document photo". */
  label: string;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  onUploading: (change: 1 | -1) => void;
  hint?: string;
};

/**
 * Picture of a document (ID, license, clearance or certificate). It uploads as soon as it is picked
 * and is removed from the server as soon as the guard removes it, so finishing onboarding only has
 * to save the profile, which keeps the returned file ids.
 */
export function DocumentFileField({ kind, label, value, onChange, onUploading, hint }: DocumentFileFieldProps) {
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string>();

  function working(on: boolean) {
    setBusy(on);
    onUploading(on ? 1 : -1);
  }

  async function onPick(source: ImageSource) {
    setError(undefined);
    const picked = await pickImage(source, { allowsEditing: false, quality: 0.7 });
    if (!picked) return;

    const problem = checkDocument(picked);
    if (problem) {
      setError(problem);
      return;
    }

    const previous = value;
    working(true);
    try {
      const uploaded = await uploadDocument(kind, picked);
      onChange(uploaded);
      // The old picture is no longer used: remove it from the server (nothing to do if that fails).
      if (previous) deleteDocument(kind, previous.id).catch(() => undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not upload the document. Try again.');
    } finally {
      working(false);
    }
  }

  function confirmRemove() {
    if (!value) return;
    Alert.alert('Remove document?', 'This removes the uploaded picture.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const removed = value;
          onChange(null);
          setError(undefined);
          working(true);
          try {
            await deleteDocument(kind, removed.id);
          } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Could not remove the document. Try again.');
          } finally {
            working(false);
          }
        },
      },
    ]);
  }

  return (
    <View className="gap-2">
      <Text variant="label">{label}</Text>
      {value ? (
        <View className="flex-row items-center gap-3 rounded-xl border border-border bg-surface-muted p-3">
          <Image
            source={documentSource(value)}
            contentFit="cover"
            accessibilityIgnoresInvertColors
            style={{ width: 56, height: 56, borderRadius: 10 }}
          />
          <View className="flex-1">
            <Text numberOfLines={1}>{value.name}</Text>
            <Text variant="small" tone="muted">
              {formatFileSize(value.size)}
            </Text>
          </View>
        </View>
      ) : null}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button
            title={value ? 'Replace' : 'Add picture'}
            variant="secondary"
            icon={ICONS.camera}
            loading={busy}
            onPress={() => setSheetOpen(true)}
          />
        </View>
        {value ? (
          <View className="flex-1">
            <Button title="Remove" variant="danger" icon={ICONS.trash} disabled={busy} onPress={confirmRemove} />
          </View>
        ) : null}
      </View>
      <Text variant="small" tone="muted">
        {hint ?? `Optional. A clear picture, up to ${DOCUMENT_MAX_MB} MB.`}
      </Text>
      {error ? (
        <Text variant="small" tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <ImageSourceSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title={label} onPick={onPick} />
    </View>
  );
}

/**
 * `DocumentFileField` connected to the form field that holds the document's file (like
 * `security_licenses.0.file`). Used by the guard and the service provider onboarding forms.
 */
export function FormDocumentFile<T extends FieldValues>({
  control,
  name,
  ...props
}: {
  // `any` for the context and parsed-output types, like the other connected fields.
  control: Control<T, any, any>;
  name: FieldPath<T>;
} & Omit<DocumentFileFieldProps, 'value' | 'onChange'>) {
  const { field } = useController({ control, name });
  return <DocumentFileField {...props} value={(field.value as UploadedFile | null | undefined) ?? null} onChange={field.onChange} />;
}
