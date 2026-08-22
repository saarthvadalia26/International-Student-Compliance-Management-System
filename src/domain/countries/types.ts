/**
 * Country Master Domain Types
 * Defines the canonical ISO 3166-1 country entity and associated DTOs.
 */

export interface Country {
  id: string;
  name: string;
  isoAlpha2: string; // ISO 3166-1 Alpha-2 (e.g. "IN", "FJ", "US")
  isoAlpha3: string; // ISO 3166-1 Alpha-3 (e.g. "IND", "FJI", "USA")
  isoNumeric: string; // ISO 3166-1 Numeric (e.g. "356", "242", "840")
  officialName?: string | null;
  nationality?: string | null; // Demonym (e.g. "Indian", "Fijian", "American")
  flag?: string | null; // Unicode flag emoji (e.g. "🇮🇳", "🇫🇯")
  phoneCode?: string | null; // International calling dial code (e.g. "+91", "+679")
  region?: string | null; // Geographic region (e.g. "Asia", "Oceania")
  subregion?: string | null; // Subregion (e.g. "Southern Asia", "Melanesia")
  displayOrder: number;
  isActive: boolean;
  studentUsageCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
}

export interface CreateCountryDto {
  name: string;
  isoAlpha2: string;
  isoAlpha3: string;
  isoNumeric: string;
  officialName?: string;
  nationality?: string;
  flag?: string;
  phoneCode?: string;
  region?: string;
  subregion?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateCountryDto {
  name?: string;
  isoAlpha2?: string;
  isoAlpha3?: string;
  isoNumeric?: string;
  officialName?: string;
  nationality?: string;
  flag?: string;
  phoneCode?: string;
  region?: string;
  subregion?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CountryFilterOptions {
  search?: string;
  status?: "all" | "active" | "inactive";
  region?: string;
}

export interface CountryUsageSummary {
  countryId: string;
  isoAlpha3: string;
  countryName: string;
  studentCount: number;
}
