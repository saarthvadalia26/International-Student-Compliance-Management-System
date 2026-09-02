import "server-only";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { Country, CreateCountryDto, UpdateCountryDto, CountryFilterOptions } from "./types";
import { ISO_MASTER_COUNTRIES, normalizeCountryInputSync as normalizeCountryInputSyncUtil } from "./country-utils";

export { ISO_MASTER_COUNTRIES };

export class CountryService {
  private static cachedCountries: Country[] | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_TTL_MS = 60 * 1000; // 1 minute

  /**
   * Invalidate in-memory cache
   */
  public static invalidateCache(): void {
    this.cachedCountries = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Maps a raw database row to the Country domain model
   */
  private mapToDomain(row: Record<string, unknown>): Country {
    return {
      id: String(row.id || ""),
      name: String(row.name || ""),
      isoAlpha2: String(row.iso_alpha2 || "").toUpperCase(),
      isoAlpha3: String(row.iso_alpha3 || "").toUpperCase(),
      isoNumeric: String(row.iso_numeric || ""),
      officialName: row.official_name ? String(row.official_name) : null,
      nationality: row.nationality ? String(row.nationality) : null,
      flag: row.flag ? String(row.flag) : null,
      phoneCode: row.phone_code ? String(row.phone_code) : null,
      region: row.region ? String(row.region) : null,
      subregion: row.subregion ? String(row.subregion) : null,
      displayOrder: Number(row.display_order ?? 0),
      isActive: Boolean(row.is_active ?? true),
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString()),
      createdBy: row.created_by ? String(row.created_by) : null
    };
  }

  /**
   * Get all active countries sorted by display order and name.
   * Cached for performance.
   */
  public async getActiveCountries(): Promise<Country[]> {
    const all = await this.getAllCachedCountries();
    return all.filter(c => c.isActive);
  }

  /**
   * Fetch all cached countries (fallback to ISO_MASTER_COUNTRIES if DB unreachable)
   */
  public async getAllCachedCountries(): Promise<Country[]> {
    const now = Date.now();
    if (CountryService.cachedCountries && now - CountryService.cacheTimestamp < CountryService.CACHE_TTL_MS) {
      return CountryService.cachedCountries;
    }

    try {
      const supabase = getAdminSupabase();
      const { data, error } = await supabase
        .from("countries")
        .select("*")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (error || !data || data.length === 0) {
        CountryService.cachedCountries = ISO_MASTER_COUNTRIES;
        CountryService.cacheTimestamp = now;
        return ISO_MASTER_COUNTRIES;
      }

      const domainList = data.map(this.mapToDomain);
      CountryService.cachedCountries = domainList;
      CountryService.cacheTimestamp = now;
      return domainList;
    } catch {
      return CountryService.cachedCountries || ISO_MASTER_COUNTRIES;
    }
  }

  /**
   * Get all countries for Administrator settings with usage counts and filtering
   */
  public async getAllCountries(options?: CountryFilterOptions): Promise<Country[]> {
    const countries = await this.getAllCachedCountries();
    const usageMap = await this.getCountriesUsageMap();

    let result = countries.map(c => ({
      ...c,
      studentUsageCount: usageMap.get(c.isoAlpha3) || 0
    }));

    if (options?.status && options.status !== "all") {
      const wantActive = options.status === "active";
      result = result.filter(c => c.isActive === wantActive);
    }

    if (options?.region && options.region.trim()) {
      const r = options.region.trim().toLowerCase();
      result = result.filter(c => (c.region || "").toLowerCase() === r);
    }

    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.officialName && c.officialName.toLowerCase().includes(q)) ||
        (c.nationality && c.nationality.toLowerCase().includes(q)) ||
        c.isoAlpha2.toLowerCase().includes(q) ||
        c.isoAlpha3.toLowerCase().includes(q) ||
        c.isoNumeric.includes(q) ||
        (c.region && c.region.toLowerCase().includes(q))
      );
    }

    return result;
  }

  /**
   * Resolve country by ISO Alpha-3, Alpha-2, Numeric code, or Name
   */
  public async getCountryByCode(codeOrName: string): Promise<Country | null> {
    if (!codeOrName || !codeOrName.trim()) return null;
    const clean = codeOrName.trim();
    const upper = clean.toUpperCase();
    const lower = clean.toLowerCase();

    const all = await this.getAllCachedCountries();

    // 1. Direct ISO Alpha-3 match
    const byAlpha3 = all.find(c => c.isoAlpha3 === upper);
    if (byAlpha3) return byAlpha3;

    // 2. Direct ISO Alpha-2 match
    const byAlpha2 = all.find(c => c.isoAlpha2 === upper);
    if (byAlpha2) return byAlpha2;

    // 3. Numeric match
    const byNumeric = all.find(c => c.isoNumeric === clean);
    if (byNumeric) return byNumeric;

    // 4. Exact common name match
    const byName = all.find(c => c.name.toLowerCase() === lower);
    if (byName) return byName;

    // 5. Official name match
    const byOfficial = all.find(c => c.officialName && c.officialName.toLowerCase() === lower);
    if (byOfficial) return byOfficial;

    // 6. Demonym / Nationality match
    const byNationality = all.find(c => c.nationality && c.nationality.toLowerCase() === lower);
    if (byNationality) return byNationality;

    return null;
  }

  /**
   * Safe normalization for spreadsheet import & registration inputs.
   * Matches ISO Alpha-2, Alpha-3, Country Name, Demonyms with case & whitespace tolerance.
   * Returns standard 3-letter ISO code if recognized, or null if unknown.
   */
  public async normalizeCountryInput(val: string): Promise<{
    isoAlpha3: string;
    country: Country;
  } | null> {
    if (!val || !val.trim()) return null;
    const clean = val.trim();
    const country = await this.getCountryByCode(clean);
    if (!country) return null;
    return {
      isoAlpha3: country.isoAlpha3,
      country
    };
  }

  /**
   * Synchronous normalization using the ISO master dataset (instant for sync routines)
   */
  public static normalizeCountryInputSync(val: string): {
    isoAlpha3: string;
    country: Country;
  } | null {
    return normalizeCountryInputSyncUtil(val);
  }

  /**
   * Toggle soft activation status for a country (Disable / Enable).
   * Records an immutable entry in the audit log.
   */
  public async toggleCountryStatus(
    id: string,
    isActive: boolean,
    actor?: { id?: string; email?: string }
  ): Promise<Country> {
    const supabase = getAdminSupabase();

    // Fetch existing country
    const { data: existing, error: fetchErr } = await supabase
      .from("countries")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      throw new Error(`Country with ID ${id} not found.`);
    }

    const { data, error } = await supabase
      .from("countries")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update country status: ${error?.message || "Unknown error"}`);
    }

    // Sync reference_data for backward compatibility
    await supabase
      .from("reference_data")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq("category", "country")
      .eq("code", existing.iso_alpha3);

    // Record in audit log
    await supabase.from("audit_log").insert({
      actor_id: actor?.id || null,
      actor_email: actor?.email || "system@admin.iscms",
      action: isActive ? "ENABLE_COUNTRY" : "DISABLE_COUNTRY",
      resource: `country:${existing.iso_alpha3}`,
      filters_applied: {
        countryId: id,
        countryName: existing.name,
        isoAlpha3: existing.iso_alpha3,
        previousState: existing.is_active,
        newState: isActive
      }
    });

    CountryService.invalidateCache();
    return this.mapToDomain(data);
  }

  /**
   * Create a new country master record
   */
  public async createCountry(dto: CreateCountryDto, userId?: string): Promise<Country> {
    const supabase = getAdminSupabase();

    const alpha2 = dto.isoAlpha2.trim().toUpperCase();
    const alpha3 = dto.isoAlpha3.trim().toUpperCase();
    const numeric = dto.isoNumeric.trim();
    const name = dto.name.trim();

    if (!/^[A-Z]{2}$/.test(alpha2)) {
      throw new Error("ISO Alpha-2 code must be exactly 2 uppercase letters (e.g. FJ, IN).");
    }
    if (!/^[A-Z]{3}$/.test(alpha3)) {
      throw new Error("ISO Alpha-3 code must be exactly 3 uppercase letters (e.g. FJI, IND).");
    }
    if (!/^[0-9]{3}$/.test(numeric)) {
      throw new Error("ISO Numeric code must be exactly 3 digits (e.g. 242, 356).");
    }
    if (name.length < 2) {
      throw new Error("Country name must be at least 2 characters long.");
    }

    const { data, error } = await supabase
      .from("countries")
      .insert({
        name,
        iso_alpha2: alpha2,
        iso_alpha3: alpha3,
        iso_numeric: numeric,
        official_name: dto.officialName?.trim() || null,
        nationality: dto.nationality?.trim() || null,
        flag: dto.flag?.trim() || "🌐",
        phone_code: dto.phoneCode?.trim() || null,
        region: dto.region?.trim() || "Other",
        subregion: dto.subregion?.trim() || null,
        display_order: dto.displayOrder ?? 999,
        is_active: dto.isActive ?? true,
        created_by: userId || null
      })
      .select()
      .single();

    if (error || !data) {
      if (error?.code === "23505") {
        throw new Error(`Country code or name already exists in database (${error.message}).`);
      }
      throw new Error(`Failed creating country: ${error?.message || "Unknown error"}`);
    }

    // Sync into reference_data
    await supabase.from("reference_data").upsert({
      category: "country",
      code: alpha3,
      display_name: name,
      description: `ISO-3166-1: ${alpha2} / ${numeric} | Demonym: ${dto.nationality || name} | Region: ${dto.region || "Global"}`,
      display_order: dto.displayOrder ?? 999,
      is_active: dto.isActive ?? true
    }, { onConflict: "code" });

    CountryService.invalidateCache();
    return this.mapToDomain(data);
  }

  /**
   * Update an existing country master record
   */
  public async updateCountry(id: string, dto: UpdateCountryDto): Promise<Country> {
    const supabase = getAdminSupabase();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (dto.name !== undefined) payload.name = dto.name.trim();
    if (dto.isoAlpha2 !== undefined) payload.iso_alpha2 = dto.isoAlpha2.trim().toUpperCase();
    if (dto.isoAlpha3 !== undefined) payload.iso_alpha3 = dto.isoAlpha3.trim().toUpperCase();
    if (dto.isoNumeric !== undefined) payload.iso_numeric = dto.isoNumeric.trim();
    if (dto.officialName !== undefined) payload.official_name = dto.officialName.trim() || null;
    if (dto.nationality !== undefined) payload.nationality = dto.nationality.trim() || null;
    if (dto.flag !== undefined) payload.flag = dto.flag.trim() || null;
    if (dto.phoneCode !== undefined) payload.phone_code = dto.phoneCode.trim() || null;
    if (dto.region !== undefined) payload.region = dto.region.trim() || null;
    if (dto.subregion !== undefined) payload.subregion = dto.subregion.trim() || null;
    if (dto.displayOrder !== undefined) payload.display_order = dto.displayOrder;
    if (dto.isActive !== undefined) payload.is_active = dto.isActive;

    const { data, error } = await supabase
      .from("countries")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed updating country: ${error?.message || "Unknown error"}`);
    }

    CountryService.invalidateCache();
    return this.mapToDomain(data);
  }

  /**
   * Batch count student records referencing each nationality code
   */
  public async getCountriesUsageMap(): Promise<Map<string, number>> {
    const map = new Map<string, number>();

    try {
      const supabase = getAdminSupabase();
      const { data, error } = await supabase
        .from("student_personal")
        .select("nationality_code")
        .is("deleted_at", null);

      if (!error && data) {
        data.forEach(row => {
          const code = (row.nationality_code || "").trim().toUpperCase();
          if (code) {
            map.set(code, (map.get(code) || 0) + 1);
          }
        });
      }
    } catch {
      // Return empty map on failure
    }

    return map;
  }
}
