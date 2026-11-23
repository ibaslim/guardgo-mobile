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
