import { useEffect, useRef, useState } from 'react';
import type { FieldValues, UseFormReset } from 'react-hook-form';

import { fetchTenantLogo, getTenant, type TenantImage, type TenantSnapshot } from '@/services/tenant';

export type TenantPrefillOptions<TInput extends FieldValues, TMetadata> = {
  reset: UseFormReset<TInput>;
  /** The option lists for the flow. Nothing is filled in until they have loaded. */
  metadata: TMetadata | null;
  /** The form's default values. Saved values are laid over them. */
  defaults: TInput;
  /** Turns the saved tenant into form values, or null when there is nothing to fill in. */
  parse: (tenant: TenantSnapshot, metadata: TMetadata) => Partial<TInput> | null;
};

/**
 * Fills an onboarding form with whatever was saved earlier (for example on the web), and loads the
 * saved logo or photo. Cities and similar fields are matched against the server's lists, so it
 * waits for `metadata` too. Fields the user already changed are kept. Runs once.
 */
export function useTenantPrefill<TInput extends FieldValues, TMetadata>({
  reset,
  metadata,
  defaults,
  parse,
}: TenantPrefillOptions<TInput, TMetadata>) {
  const [tenant, setTenant] = useState<TenantSnapshot | null>(null);
  const [photo, setPhoto] = useState<TenantImage | null>(null);
  const prefilled = useRef(false);

  useEffect(() => {
    let active = true;
    getTenant()
      .then(async (saved) => {
        if (!active) return;
        setTenant(saved);
        const existing = await fetchTenantLogo(saved.id);
        if (active && existing) setPhoto((current) => current ?? existing);
      })
      .catch(() => {
        // Nothing to pre-fill: the user fills the form in.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!tenant || !metadata || prefilled.current) return;
    prefilled.current = true;
    const saved = parse(tenant, metadata);
    if (saved) reset({ ...defaults, ...saved }, { keepDirtyValues: true });
  }, [tenant, metadata, reset, defaults, parse]);

  return { tenant, photo, setPhoto };
}
