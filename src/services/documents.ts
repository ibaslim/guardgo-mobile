import { File } from 'expo-file-system';

import { ENDPOINTS } from '@/constants/endpoints';
import { api, getAccessToken, getApiUrl } from '@/services/api';
import type { PickedImage } from '@/services/image-picker';
import type { UploadedFile } from '@/types/guard-onboarding';

/** The four kinds of guard document, each with its own upload folder on the server. */
export type DocumentKind = 'identity' | 'securityLicense' | 'policeClearance' | 'trainingCertificate';

// Same limit as the server (`upload_tenant_*_document`): 10 MB, images or PDF.
export const DOCUMENT_MAX_MB = 10;

type UploadResponse = {
  file_id: string;
  file_name: string | null;
  mime_type: string;
  size: number;
  file_url: string;
};

const basePath = (kind: DocumentKind) => ENDPOINTS.tenant.files[kind];

function imageType(image: PickedImage) {
  if (image.mimeType) return image.mimeType;
  if (/\.png$/i.test(image.uri)) return 'image/png';
  if (/\.jpe?g$/i.test(image.uri)) return 'image/jpeg';
  return null;
}

/** A reason the picture can't be uploaded, or null when it is fine. Checked before sending. */
export function checkDocument(image: PickedImage): string | null {
  const type = imageType(image);
  if (!type || !type.startsWith('image/')) return 'Only pictures can be uploaded for now.';
  if (image.fileSize !== null && image.fileSize > DOCUMENT_MAX_MB * 1024 * 1024) {
    return `The file must be smaller than ${DOCUMENT_MAX_MB} MB. Choose a smaller one.`;
  }
  return null;
}

/** Uploads a picked picture: multipart form data with the file in the `file` field. */
export async function uploadDocument(kind: DocumentKind, image: PickedImage): Promise<UploadedFile> {
  const body = new FormData();
  // Expo's fetch sends a File (name and type come from the picked file) and rejects { uri, name, type } objects.
  body.append('file', new File(image.uri) as unknown as Blob);

  const response = await api.post<UploadResponse>(basePath(kind), body);
  return {
    id: response.file_id,
    url: response.file_url,
    name: response.file_name ?? 'Document',
    mimeType: response.mime_type,
    size: response.size,
  };
}

export function deleteDocument(kind: DocumentKind, fileId: string) {
  return api.delete<unknown>(`${basePath(kind)}/${fileId}`);
}

/**
 * Where to load a saved document from. The file route only checks that an `access_token` cookie is
 * present, and the app signs in with a bearer token, so the cookie is sent by hand (same as the logo).
 */
export function documentSource(file: UploadedFile): { uri: string; headers?: Record<string, string> } {
  const token = getAccessToken();
  return {
    uri: `${getApiUrl()}${file.url}`,
    headers: token ? { Cookie: `access_token=${token}` } : undefined,
  };
}
