import { useState } from 'react';

import { ImageUploadCard } from '@/components/ui/image-upload-card';
import { ApiError } from '@/services/api';
import type { PickedImage } from '@/services/image-picker';
import {
  checkTenantImage,
  deleteTenantImage,
  TENANT_IMAGE_MAX_KB,
  uploadTenantImage,
  type TenantImage,
} from '@/services/tenant';
import type { ClientKind } from '@/types/onboarding';

export type LogoFieldProps = {
  kind: ClientKind;
  /** The saved picture: one found on the server, or one uploaded in this session. Kept by the parent so it survives going back and forth. */
  value: TenantImage | null;
  onValueChange: (value: TenantImage | null) => void;
  /** True while an upload or removal is running, so the parent can hold the Continue button. */
  onBusyChange: (busy: boolean) => void;
};

/**
 * The optional logo (company) or profile photo (individual) at the top of the details step. It
 * uploads as soon as it is picked and is removed from the server as soon as the user removes it,
 * so finishing onboarding only has to save the profile.
 */
export function LogoField({ kind, value, onValueChange, onBusyChange }: LogoFieldProps) {
  const company = kind === 'company';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  function working(next: boolean) {
    setBusy(next);
    onBusyChange(next);
  }

  async function onChange(picked: PickedImage | null) {
    setError(undefined);

    if (!picked) {
      const hadPicture = value !== null;
      onValueChange(null);
      if (hadPicture) {
        working(true);
        try {
          await deleteTenantImage();
        } catch (e) {
          setError(e instanceof ApiError ? e.message : 'Could not remove the picture. Try again.');
        } finally {
          working(false);
        }
      }
      return;
    }

    const problem = checkTenantImage(picked);
    if (problem) {
      setError(problem);
      return;
    }

    onValueChange(picked);
    working(true);
    try {
      await uploadTenantImage(picked);
    } catch (e) {
      // Not saved, so don't show it as if it were: let the user pick again.
      onValueChange(null);
      setError(e instanceof ApiError ? e.message : 'Could not upload the picture. Try again.');
    } finally {
      working(false);
    }
  }

  return (
    <ImageUploadCard
      label={company ? 'Company logo' : 'Profile photo'}
      shape={company ? 'square' : 'circle'}
      size="lg"
      value={value}
      onChange={onChange}
      allowCamera={!company}
      hint={`Optional. JPEG or PNG, max ${TENANT_IMAGE_MAX_KB} KB.`}
      quality={0.5}
      error={error}
      loading={busy}
    />
  );
}
