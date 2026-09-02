/**
 * Client-Safe Country Utilities and Normalization
 * 
 * Provides pure validation, lookup, and normalization functions over
 * the static ISO 3166-1 reference dataset.
 * 
 * This module is STRICTLY client-safe:
 * - NO Supabase Admin imports
 * - NO database queries
 * - NO secret or service-role credential access
 * Safe for hydration in Client Components, Server Components, and validation schemas.
 */

import { Country } from "./types";
import { ISO_MASTER_COUNTRIES } from "./iso-countries.data";

export { ISO_MASTER_COUNTRIES };
export type { Country };

/**
 * In-memory index maps for O(1) synchronous lookup performance
 */
const alpha3Map = new Map<string, Country>();
const alpha2Map = new Map<string, Country>();
const numericMap = new Map<string, Country>();
const nameMap = new Map<string, Country>();
const nationalityMap = new Map<string, Country>();

for (const country of ISO_MASTER_COUNTRIES) {
  if (country.isoAlpha3) alpha3Map.set(country.isoAlpha3.toUpperCase(), country);
  if (country.isoAlpha2) alpha2Map.set(country.isoAlpha2.toUpperCase(), country);
  if (country.isoNumeric) numericMap.set(country.isoNumeric.trim(), country);
  if (country.name) nameMap.set(country.name.toLowerCase().trim(), country);
  if (country.officialName) nameMap.set(country.officialName.toLowerCase().trim(), country);
  if (country.nationality) nationalityMap.set(country.nationality.toLowerCase().trim(), country);
}

/**
 * Synchronous normalization using the ISO master dataset.
 * Accepts ISO Alpha-3, ISO Alpha-2, Numeric code, full English name, official name, or demonym.
 * Returns canonical Alpha-3 and the Country object, or null if unrecognized.
 */
export function normalizeCountryInputSync(val: string | null | undefined): {
  isoAlpha3: string;
  country: Country;
} | null {
  if (!val || typeof val !== "string" || !val.trim()) return null;
  const clean = val.trim();
  const upper = clean.toUpperCase();
  const lower = clean.toLowerCase();

  // 1. Exact Alpha-3 match
  const byAlpha3 = alpha3Map.get(upper);
  if (byAlpha3) {
    return { isoAlpha3: byAlpha3.isoAlpha3, country: byAlpha3 };
  }

  // 2. Exact Alpha-2 match
  const byAlpha2 = alpha2Map.get(upper);
  if (byAlpha2) {
    return { isoAlpha3: byAlpha2.isoAlpha3, country: byAlpha2 };
  }

  // 3. Exact Numeric code match
  const byNumeric = numericMap.get(clean);
  if (byNumeric) {
    return { isoAlpha3: byNumeric.isoAlpha3, country: byNumeric };
  }

  // 4. Common name or official name match
  const byName = nameMap.get(lower);
  if (byName) {
    return { isoAlpha3: byName.isoAlpha3, country: byName };
  }

  // 5. Demonym / nationality match
  const byNationality = nationalityMap.get(lower);
  if (byNationality) {
    return { isoAlpha3: byNationality.isoAlpha3, country: byNationality };
  }

  // Fallback linear scan with partial matching for edge cases
  const match = ISO_MASTER_COUNTRIES.find(
    c => c.isoAlpha3 === upper ||
         c.isoAlpha2 === upper ||
         c.isoNumeric === clean ||
         c.name.toLowerCase() === lower ||
         (c.officialName && c.officialName.toLowerCase() === lower) ||
         (c.nationality && c.nationality.toLowerCase() === lower)
  );

  if (match) {
    return {
      isoAlpha3: match.isoAlpha3,
      country: match
    };
  }

  // 6. Valid 3-letter ISO Alpha-3 format fallback (supports custom countries added via Settings)
  if (/^[A-Z]{3}$/.test(upper)) {
    return {
      isoAlpha3: upper,
      country: {
        id: `c-${lower}`,
        name: upper,
        isoAlpha2: upper.slice(0, 2),
        isoAlpha3: upper,
        isoNumeric: "000",
        officialName: upper,
        nationality: upper,
        flag: "🌐",
        region: "Global",
        subregion: "Global",
        displayOrder: 999,
        isActive: true,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z"
      }
    };
  }

  return null;
}

/**
 * Retrieves a static country record by Alpha-3 code, Alpha-2 code, or name.
 */
export function getStaticCountryByCode(code: string | null | undefined): Country | undefined {
  if (!code) return undefined;
  const result = normalizeCountryInputSync(code);
  return result?.country;
}

/**
 * Returns all active static countries sorted by display order.
 */
export function getStaticActiveCountries(): Country[] {
  return ISO_MASTER_COUNTRIES.filter(c => c.isActive);
}
