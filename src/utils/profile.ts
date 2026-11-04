import type { MetadataOption } from '@/types/onboarding';

/** Helpers for reading the loosely typed `profile` object the server returns. */
export const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export const asText = (value: unknown) => (value === null || value === undefined ? '' : String(value).trim());

/** A Canadian city's code from the name the server stores (or the code itself). */
export function cityCodeFor(
  citiesByProvince: Record<string, MetadataOption[]> | undefined,
  province: string,
  name: string
) {
  const options = citiesByProvince?.[province] ?? [];
  return (
    options.find((option) => option.value === name.toUpperCase())?.value ??
    options.find((option) => option.label.toLowerCase() === name.toLowerCase())?.value ??
    null
  );
}

/** The city's name for a code ("TORONTO" -> "Toronto"), or the code itself when it isn't in the list. */
export function cityLabelFor(citiesByProvince: Record<string, MetadataOption[]> | undefined, province: string, code: string) {
  return citiesByProvince?.[province]?.find((option) => option.value === code)?.label ?? code;
}

/** True when `city` is one of the cities listed for `province`. */
export function cityBelongsTo(
  citiesByProvince: Record<string, MetadataOption[]> | undefined,
  province: string | null | undefined,
  city: string | null | undefined
) {
  return Boolean(province && city && citiesByProvince?.[province]?.some((option) => option.value === city));
}
