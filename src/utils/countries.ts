/**
 * ISO 3166-1 Standard Country & Nationality Reference Dataset
 * 
 * Provides complete ISO country records with Alpha-2, Alpha-3, Numeric codes,
 * official names, common names, demonyms, Unicode flags, calling phone codes, and regions.
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
  phoneCode?: string;   // International calling dial code (e.g. "+91", "+679")
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
  phoneCode: c.phoneCode || "+91",
  region: c.region || "Global",
  subregion: c.subregion || "Global",
  isActive: c.isActive
}));

// O(1) indexed maps for high performance lookups
const iso2Map = new Map<string, Country>();
const iso3Map = new Map<string, Country>();
const phoneCodeMap = new Map<string, Country[]>();

for (const c of countryList) {
  if (c.alpha2) iso2Map.set(c.alpha2.toUpperCase(), c);
  if (c.code) iso3Map.set(c.code.toUpperCase(), c);
  if (c.phoneCode) {
    const cleanPhone = c.phoneCode.trim();
    const existing = phoneCodeMap.get(cleanPhone) || [];
    existing.push(c);
    phoneCodeMap.set(cleanPhone, existing);
  }
}

// Canonical primary country defaults for shared international dial codes
const SHARED_DIAL_CODE_DEFAULTS: Record<string, string> = {
  "+1": "US",   // United States (default for +1; Canada is CA, Bahamas is BS, Jamaica is JM, etc.)
  "+7": "RU",   // Russia (default for +7; Kazakhstan is KZ)
  "+44": "GB",  // United Kingdom
  "+212": "MA", // Morocco
  "+358": "FI", // Finland
  "+47": "NO",  // Norway
  "+61": "AU",  // Australia
  "+599": "CW"  // Curacao
};

/**
 * Utility helper to retrieve country record directly by its canonical ISO Alpha-2 code (e.g. "IN", "US", "CA", "GB", "AE", "YE", "TZ", "MV").
 */
export function getCountryByIso2(iso2?: string | null): Country | undefined {
  if (!iso2) return undefined;
  return iso2Map.get(iso2.trim().toUpperCase());
}

/**
 * Utility helper to retrieve country record by ISO code (Alpha-3, Alpha-2, or Numeric), Phone Code, or Name.
 */
export function getCountryByCode(code: string): Country | undefined {
  if (!code) return undefined;
  const clean = code.trim();
  const upper = clean.toUpperCase();
  const lower = clean.toLowerCase();

  // Try direct maps first
  const byIso2 = iso2Map.get(upper);
  if (byIso2) return byIso2;

  const byIso3 = iso3Map.get(upper);
  if (byIso3) return byIso3;

  return countryList.find(
    c => c.code === upper || 
         c.alpha2 === upper || 
         c.numeric === clean ||
         (c.phoneCode && (c.phoneCode === clean || c.phoneCode === `+${clean}`)) ||
         c.name.toLowerCase() === lower ||
         c.officialName.toLowerCase() === lower ||
         c.nationality.toLowerCase() === lower
  );
}

/**
 * Utility helper to find country by calling phone dial code (e.g. "+91", "+1", "+44", "91").
 * When multiple countries share the same calling code (e.g. +1 for US/Canada, +7 for Russia/Kazakhstan),
 * preferredIso2 is used to disambiguate. If preferredIso2 is omitted, canonical primary defaults are used.
 */
export function getCountryByPhoneCode(phoneCode: string, preferredIso2?: string | null): Country | undefined {
  if (!phoneCode) return undefined;
  const clean = phoneCode.trim();
  const formatted = clean.startsWith("+") ? clean : `+${clean}`;

  // If specific preferred ISO-2 provided, check for exact match
  if (preferredIso2) {
    const preferredCountry = iso2Map.get(preferredIso2.trim().toUpperCase());
    if (preferredCountry && preferredCountry.phoneCode === formatted) {
      return preferredCountry;
    }
  }

  // Retrieve all countries with this dial code
  const matching = phoneCodeMap.get(formatted);
  if (matching && matching.length > 0) {
    if (matching.length === 1) return matching[0];

    // Disambiguate shared calling codes using primary default mapping
    const defaultIso2 = SHARED_DIAL_CODE_DEFAULTS[formatted];
    if (defaultIso2) {
      const foundDefault = matching.find(c => c.alpha2 === defaultIso2);
      if (foundDefault) return foundDefault;
    }

    return matching[0];
  }

  return countryList.find(c => c.phoneCode === formatted);
}

/**
 * Normalizes phone components into standard E.164 compatible format (+[countryCode][number])
 */
export function formatE164Phone(countryCode?: string | null, number?: string | null): string {
  if (!number || !number.trim()) return "";
  const cleanNum = number.replace(/[^\d]/g, "");
  if (!cleanNum) return "";

  const cleanCode = countryCode ? countryCode.trim() : "+91";
  const formattedCode = cleanCode.startsWith("+") ? cleanCode : `+${cleanCode}`;

  // If number already contains the country code prefix, avoid double concatenation
  const digitsOnlyCode = formattedCode.replace(/[^\d]/g, "");
  if (cleanNum.startsWith(digitsOnlyCode) && cleanNum.length > digitsOnlyCode.length + 5) {
    return `+${cleanNum}`;
  }

  return `${formattedCode}${cleanNum}`;
}

/**
 * Filter countries by search query with intelligent relevance scoring.
 * Supports country names, ISO Alpha-2/Alpha-3 codes, calling codes (with or without '+'), and regions.
 */
export function searchCountries(query: string, onlyActive: boolean = true): Country[] {
  const base = onlyActive ? countryList.filter(c => c.isActive !== false) : countryList;
  if (!query || !query.trim()) return base;
  
  const rawQuery = query.trim();
  const s = rawQuery.toLowerCase();
  const upper = rawQuery.toUpperCase();
  const cleanDigits = rawQuery.replace(/[^\d]/g, "");
  const queryWithPlus = rawQuery.startsWith("+") ? rawQuery : `+${rawQuery}`;

  const scored: Array<{ country: Country; score: number }> = [];

  for (const c of base) {
    let score = 0;
    const nameLower = c.name.toLowerCase();
    const officialLower = c.officialName.toLowerCase();
    const natLower = c.nationality.toLowerCase();
    const phoneCode = c.phoneCode || "";
    const digitsOnlyPhone = phoneCode.replace(/[^\d]/g, "");

    // 1. Exact ISO Alpha-2 match (highest priority for 2-letter search like "IN", "US", "CA", "GB")
    if (c.alpha2 === upper) {
      score = 100;
    }
    // 2. Exact ISO Alpha-3 match (e.g. "IND", "USA", "CAN", "GBR")
    else if (c.code === upper) {
      score = 95;
    }
    // 3. Exact phone code match (e.g. "+91" or "91")
    else if (phoneCode === rawQuery || phoneCode === queryWithPlus || (cleanDigits && digitsOnlyPhone === cleanDigits)) {
      score = 90;
    }
    // 4. Country name starts with query (e.g. "Ind" -> "India")
    else if (nameLower.startsWith(s)) {
      score = 85;
    }
    // 5. Phone code starts with query (e.g. "+1" -> United States, Canada, etc.)
    else if (cleanDigits && digitsOnlyPhone.startsWith(cleanDigits)) {
      score = 75;
    }
    // 6. Demonym or official name starts with query
    else if (natLower.startsWith(s) || officialLower.startsWith(s)) {
      score = 65;
    }
    // 7. Country name contains query
    else if (nameLower.includes(s)) {
      score = 50;
    }
    // 8. Other partial matches
    else if (
      c.code.toLowerCase().includes(s) ||
      c.alpha2.toLowerCase().includes(s) ||
      c.numeric.includes(s) ||
      (phoneCode && phoneCode.includes(s)) ||
      c.region.toLowerCase().includes(s) ||
      natLower.includes(s) ||
      officialLower.includes(s)
    ) {
      score = 25;
    }

    if (score > 0) {
      scored.push({ country: c, score });
    }
  }

  // Sort descending by score, then alphabetically by name
  return scored
    .sort((a, b) => b.score - a.score || a.country.name.localeCompare(b.country.name))
    .map(item => item.country);
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
