import { asObject, asText } from '@/utils/profile';

export type CoverageCity = {
  /** City code, like "TORONTO". */
  code: string;
  /** The most a guard may travel from this city, or null when the provider set no limit. */
  radiusKm: number | null;
};

export type CoverageRegion = {
  /** Province code, like "ON". */
  code: string;
  cities: CoverageCity[];
};

const positive = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

/**
 * The provinces and cities a service provider covers (its `operating_regions`), with the radius it
 * allows in each city. A guard's work area has to be one of these. The server keeps several shapes:
 * one entry per city (`city_entries`), a list of city codes sharing one radius, or a single `city`.
 */
export function providerCoverage(profile: Record<string, unknown> | undefined): CoverageRegion[] {
  const regions = Array.isArray(profile?.operating_regions) ? profile.operating_regions.map((region) => asObject(region)) : [];

  return regions
    .map((region) => {
      const code = (asText(region.region_code) || asText(region.province)).toUpperCase();
      const regionRadius = positive(region.coverage_radius_km);
      const entries = Array.isArray(region.city_entries) ? region.city_entries.map((entry) => asObject(entry)) : [];

      const cities: CoverageCity[] =
        entries.length > 0
          ? entries.map((entry) => ({
              code: (asText(entry.city_code) || asText(entry.city)).toUpperCase(),
              radiusKm: positive(entry.coverage_radius_km) ?? regionRadius,
            }))
          : (Array.isArray(region.city_codes) ? region.city_codes.map((city) => asText(city)) : [asText(region.city)])
              .filter(Boolean)
              .map((city) => ({ code: city.toUpperCase(), radiusKm: regionRadius }));

      return { code, cities: cities.filter((city) => city.code) };
    })
    .filter((region) => region.code && region.cities.length > 0);
}
