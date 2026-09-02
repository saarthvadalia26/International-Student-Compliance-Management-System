import { getAdminSupabase } from "@/lib/supabase/admin";
import { ScholarshipScheme, CreateScholarshipSchemeDto, UpdateScholarshipSchemeDto, ScholarshipFilterOptions } from "./types";

export class ScholarshipSchemeService {
  private static cachedSchemes: ScholarshipScheme[] | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_TTL_MS = 60 * 1000; // 1 minute

  /**
   * Invalidate in-memory cache
   */
  public static invalidateCache(): void {
    this.cachedSchemes = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Maps raw database row to ScholarshipScheme domain model
   */
  private mapToDomain(row: Record<string, unknown>): ScholarshipScheme {
    return {
      id: String(row.id || ""),
      name: String(row.name || ""),
      code: row.code ? String(row.code) : null,
      description: row.description ? String(row.description) : null,
      isActive: Boolean(row.is_active ?? true),
      displayOrder: Number(row.display_order ?? 0),
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString())
    };
  }

  /**
   * Get all active scholarship schemes for student dropdowns.
   * Cached for high-performance rendering.
   */
  public async getActiveScholarshipSchemes(): Promise<ScholarshipScheme[]> {
    const all = await this.getAllCachedSchemes();
    return all.filter(s => s.isActive);
  }

  /**
   * Fetch all cached schemes (or query DB if cache expired)
   */
  public async getAllCachedSchemes(): Promise<ScholarshipScheme[]> {
    const now = Date.now();
    if (ScholarshipSchemeService.cachedSchemes && now - ScholarshipSchemeService.cacheTimestamp < ScholarshipSchemeService.CACHE_TTL_MS) {
      return ScholarshipSchemeService.cachedSchemes;
    }

    try {
      const supabase = getAdminSupabase();
      const { data, error } = await supabase
        .from("scholarship_schemes")
        .select("*")
        .is("deleted_at", null)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (error || !data) {
        return ScholarshipSchemeService.cachedSchemes || [];
      }

      const domainList = data.map(this.mapToDomain);
      ScholarshipSchemeService.cachedSchemes = domainList;
      ScholarshipSchemeService.cacheTimestamp = now;
      return domainList;
    } catch {
      return ScholarshipSchemeService.cachedSchemes || [];
    }
  }

  /**
   * Get all scholarship schemes for Settings management with live usage counts
   */
  public async getAllScholarshipSchemes(options?: ScholarshipFilterOptions): Promise<ScholarshipScheme[]> {
    const schemes = await this.getAllCachedSchemes();
    const usageMap = await this.getSchemeUsageMap();

    let result = schemes.map(s => ({
      ...s,
      studentUsageCount: usageMap.get(s.name.toLowerCase().trim()) || 0
    }));

    if (options?.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
      );
    }

    if (options?.status && options.status !== "all") {
      const wantActive = options.status === "active";
      result = result.filter(s => s.isActive === wantActive);
    }

    return result;
  }

  /**
   * Create a new scholarship scheme in Master Data
   */
  public async createScholarshipScheme(dto: CreateScholarshipSchemeDto): Promise<ScholarshipScheme> {
    const name = dto.name.trim();
    if (!name) {
      throw new Error("Scholarship scheme name is required.");
    }

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("scholarship_schemes")
      .insert({
        name,
        code: dto.code?.trim() || null,
        description: dto.description?.trim() || null,
        display_order: dto.displayOrder ?? 0,
        is_active: dto.isActive ?? true
      })
      .select()
      .single();

    if (error || !data) {
      if (error?.code === "23505") {
        throw new Error(`A scholarship scheme with the name "${name}" already exists.`);
      }
      throw new Error(`Failed to create scholarship scheme: ${error?.message || "Unknown error"}`);
    }

    ScholarshipSchemeService.invalidateCache();
    return this.mapToDomain(data);
  }

  /**
   * Update an existing scholarship scheme
   */
  public async updateScholarshipScheme(id: string, dto: UpdateScholarshipSchemeDto): Promise<ScholarshipScheme> {
    const supabase = getAdminSupabase();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new Error("Scholarship scheme name cannot be empty.");
      payload.name = name;
    }
    if (dto.code !== undefined) payload.code = dto.code?.trim() || null;
    if (dto.description !== undefined) payload.description = dto.description?.trim() || null;
    if (dto.displayOrder !== undefined) payload.display_order = dto.displayOrder;
    if (dto.isActive !== undefined) payload.is_active = dto.isActive;

    const { data, error } = await supabase
      .from("scholarship_schemes")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      if (error?.code === "23505") {
        throw new Error(`A scholarship scheme with this name already exists.`);
      }
      throw new Error(`Failed to update scholarship scheme: ${error?.message || "Unknown error"}`);
    }

    ScholarshipSchemeService.invalidateCache();
    return this.mapToDomain(data);
  }

  /**
   * Safely delete a scholarship scheme with referential usage check.
   * If students are currently assigned to this scheme, deletion is blocked to prevent integrity failures.
   */
  public async deleteScholarshipScheme(id: string): Promise<void> {
    const supabase = getAdminSupabase();

    // 1. Fetch the scheme to get its canonical name
    const { data: scheme, error: fetchErr } = await supabase
      .from("scholarship_schemes")
      .select("id, name")
      .eq("id", id)
      .single();

    if (fetchErr || !scheme) {
      throw new Error("Scholarship scheme not found.");
    }

    // 2. Check if any student currently references this scholarship scheme
    const usageMap = await this.getSchemeUsageMap();
    const count = usageMap.get(scheme.name.toLowerCase().trim()) || 0;

    if (count > 0) {
      throw new Error(
        `Cannot delete scholarship scheme "${scheme.name}" because it is currently assigned to ${count} active student record(s). Please reassign or update those students before deleting.`
      );
    }

    // 3. Safe soft-delete
    const { error: delErr } = await supabase
      .from("scholarship_schemes")
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false
      })
      .eq("id", id);

    if (delErr) {
      throw new Error(`Failed to delete scholarship scheme: ${delErr.message}`);
    }

    ScholarshipSchemeService.invalidateCache();
  }

  /**
   * Helper: Batch compute student count for each scholarship scheme
   */
  public async getSchemeUsageMap(): Promise<Map<string, number>> {
    const map = new Map<string, number>();

    try {
      const supabase = getAdminSupabase();
      const { data, error } = await supabase
        .from("student_academic")
        .select("iccr_scholarship_scheme_name")
        .is("deleted_at", null);

      if (!error && data) {
        data.forEach(row => {
          const rawName = (row.iccr_scholarship_scheme_name || "").trim().toLowerCase();
          if (rawName) {
            map.set(rawName, (map.get(rawName) || 0) + 1);
          }
        });
      }
    } catch {
      // return empty map on database failure
    }

    return map;
  }
}
