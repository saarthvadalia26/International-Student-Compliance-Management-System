/**
 * ISO 3166-1 Standard Country & Nationality Reference Dataset
 * 
 * Provides complete ISO country records with Alpha-2, Alpha-3, Numeric codes,
 * official names, common names, demonyms, Unicode flags, and regions.
 */

import { ISO_MASTER_COUNTRIES } from "@/domain/countries/iso-countries.data";

export interface Country {
  code: string;         // ISO 3166-1 alpha-3 code (e.g. "IND", "FJI")
  alpha2: string;       // ISO 3166-1 alpha-2 code (e.g. "IN", "FJ")
  numeric: string;      // ISO 3166-1 numeric code (e.g. "356", "242")
  name: string;         // Common country name (e.g. "India", "Fiji")
  officialName: string; // Official country name (e.g. "Republic of India", "Republic of Fiji")
  nationality: string;  // Demonym (e.g. "Indian", "Fijian")
  flag: string;         // Unicode flag emoji (e.g. "🇮🇳", "🇫🇯")
  region: string;       // Geographic region (e.g. "Asia", "Oceania")
  subregion: string;    // Geographic subregion (e.g. "Southern Asia", "Melanesia")
  isActive?: boolean;
}

export const countryList: Country[] = ISO_MASTER_COUNTRIES.map(c => ({
  code: c.isoAlpha3,
  alpha2: c.isoAlpha2,
  numeric: c.isoNumeric,
  name: c.name,
  officialName: c.officialName || c.name,
  nationality: c.nationality || c.name,
  flag: c.flag || "🌐",
  region: c.region || "Global",
  subregion: c.subregion || "Global",
  isActive: c.isActive
}));

/**
 * Utility helper to retrieve country record by ISO code (Alpha-3, Alpha-2, or Numeric) or Name.
 */
export function getCountryByCode(code: string): Country | undefined {
  if (!code) return undefined;
  const clean = code.trim();
  const upper = clean.toUpperCase();
  const lower = clean.toLowerCase();

  return countryList.find(
    c => c.code === upper || 
         c.alpha2 === upper || 
         c.numeric === clean ||
         c.name.toLowerCase() === lower ||
         c.officialName.toLowerCase() === lower ||
         c.nationality.toLowerCase() === lower
  );
}

/**
 * Filter countries by search query matching name, official name, demonym, ISO codes, or region.
 */
export function searchCountries(query: string, onlyActive: boolean = true): Country[] {
  const base = onlyActive ? countryList.filter(c => c.isActive !== false) : countryList;
  if (!query || !query.trim()) return base;
  const s = query.trim().toLowerCase();
  return base.filter(c =>
    c.name.toLowerCase().includes(s) ||
    c.officialName.toLowerCase().includes(s) ||
    c.nationality.toLowerCase().includes(s) ||
    c.code.toLowerCase().includes(s) ||
    c.alpha2.toLowerCase().includes(s) ||
    c.numeric.includes(s) ||
    c.region.toLowerCase().includes(s)
  );
}

/**
 * Get countries belonging to a specific geographic region.
 */
export function getCountriesByRegion(region: string, onlyActive: boolean = true): Country[] {
  const base = onlyActive ? countryList.filter(c => c.isActive !== false) : countryList;
  if (!region) return base;
  const r = region.toLowerCase();
  return base.filter(c => c.region.toLowerCase() === r);
}
