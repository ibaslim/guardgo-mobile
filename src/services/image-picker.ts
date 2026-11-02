import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

/** A chosen image, ready to upload (e.g. as FormData `{ uri, name, type }`). */
export type PickedImage = {
  uri: string;
  width: number;
  height: number;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
};

export type ImageSource = 'camera' | 'library';

export type ImagePickOptions = {
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

/**
 * Opens the camera or the photo library and returns the chosen image, or null when the user
 * cancels or camera access is off (then it offers to open Settings).
 */
export async function pickImage(
  source: ImageSource,
  { allowsEditing = true, aspect, quality = 0.8 }: ImagePickOptions = {}
): Promise<PickedImage | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access is off', 'Allow camera access in Settings to take a photo.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return null;
    }
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing, aspect, quality };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  return !result.canceled && result.assets[0] ? toPickedImage(result.assets[0]) : null;
}
