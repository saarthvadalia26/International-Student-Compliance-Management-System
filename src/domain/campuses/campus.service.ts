import { getAdminSupabase } from "@/lib/supabase/admin";
import { Campus, CreateCampusDto, UpdateCampusDto, CampusFilterOptions } from "./types";

export class CampusService {
  private static cachedCampuses: Campus[] | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_TTL_MS = 60 * 1000; // 1 minute

  /**
   * Invalidate in-memory cache
   */
  public static invalidateCache(): void {
    this.cachedCampuses = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Maps raw database row to Campus domain model
   */
  private mapToDomain(row: Record<string, unknown>): Campus {
    return {
      id: String(row.id || ""),
      name: String(row.name || ""),
      code: row.code ? String(row.code) : null,
      location: row.location ? String(row.location) : null,
      isActive: Boolean(row.is_active ?? true),
      displayOrder: Number(row.display_order ?? 0),
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString())
    };
  }

  /**
   * Get all active campuses for student dropdowns and filters.
   * Cached for high-performance rendering.
   */
  public async getActiveCampuses(): Promise<Campus[]> {
    const all = await this.getAllCachedCampuses();
    return all.filter(c => c.isActive);
  }

  /**
   * Fetch all cached campuses (or query DB if cache expired)
   */
  public async getAllCachedCampuses(): Promise<Campus[]> {
    const now = Date.now();
    if (CampusService.cachedCampuses && now - CampusService.cacheTimestamp < CampusService.CACHE_TTL_MS) {
      return CampusService.cachedCampuses;
    }

    try {
      const supabase = getAdminSupabase();
      const { data, error } = await supabase
        .from("campuses")
        .select("*")
        .is("deleted_at", null)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (error || !data) {
        return CampusService.cachedCampuses || [];
      }

      const domainList = data.map(this.mapToDomain);
      CampusService.cachedCampuses = domainList;
      CampusService.cacheTimestamp = now;
      return domainList;
    } catch {
      return CampusService.cachedCampuses || [];
    }
  }

  /**
   * Get all campuses for Settings management with live usage counts
   */
  public async getAllCampuses(options?: CampusFilterOptions): Promise<Campus[]> {
    const campuses = await this.getAllCachedCampuses();
    const usageMap = await this.getCampusUsageMap();

    let result = campuses.map(c => ({
      ...c,
      studentUsageCount: usageMap.get(c.name.toLowerCase().trim()) || 0
    }));

    if (options?.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.location && c.location.toLowerCase().includes(q))
      );
    }

    if (options?.status && options.status !== "all") {
      const wantActive = options.status === "active";
      result = result.filter(c => c.isActive === wantActive);
    }

    return result;
  }

  /**
   * Create a new campus in Master Data
   */
  public async createCampus(dto: CreateCampusDto): Promise<Campus> {
    const name = dto.name.trim();
    if (!name) {
      throw new Error("Campus name is required.");
    }

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("campuses")
      .insert({
        name,
        code: dto.code?.trim() || null,
        location: dto.location?.trim() || null,
        display_order: dto.displayOrder ?? 0,
        is_active: dto.isActive ?? true
      })
      .select()
      .single();

    if (error || !data) {
      if (error?.code === "23505") {
        throw new Error(`A campus with the name "${name}" already exists.`);
      }
      throw new Error(`Failed to create campus: ${error?.message || "Unknown error"}`);
    }

    CampusService.invalidateCache();
    return this.mapToDomain(data);
  }

  /**
   * Update an existing campus
   */
  public async updateCampus(id: string, dto: UpdateCampusDto): Promise<Campus> {
    const supabase = getAdminSupabase();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new Error("Campus name cannot be empty.");
      payload.name = name;
    }
    if (dto.code !== undefined) payload.code = dto.code?.trim() || null;
    if (dto.location !== undefined) payload.location = dto.location?.trim() || null;
    if (dto.displayOrder !== undefined) payload.display_order = dto.displayOrder;
    if (dto.isActive !== undefined) payload.is_active = dto.isActive;

    const { data, error } = await supabase
      .from("campuses")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      if (error?.code === "23505") {
        throw new Error(`A campus with this name already exists.`);
      }
      throw new Error(`Failed to update campus: ${error?.message || "Unknown error"}`);
    }

    CampusService.invalidateCache();
    return this.mapToDomain(data);
  }

  /**
   * Safely delete a campus with referential usage check.
   * If students are currently assigned to this campus, deletion is blocked to prevent integrity failures.
   */
  public async deleteCampus(id: string): Promise<void> {
    const supabase = getAdminSupabase();

    // 1. Fetch the campus to get its canonical name
    const { data: campus, error: fetchErr } = await supabase
      .from("campuses")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !campus) {
      throw new Error("Campus not found.");
    }

    // 2. Check if any student currently references this campus
    const usageMap = await this.getCampusUsageMap();
    const count = usageMap.get(campus.name.toLowerCase().trim()) || 0;

    if (count > 0) {
      throw new Error(
        `Cannot delete campus "${campus.name}" because it is currently assigned to ${count} active student record(s). Please reassign or update those students before deleting.`
      );
    }

    // 3. Safe soft-delete
    const { error: delErr } = await supabase
      .from("campuses")
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false
      })
      .eq("id", id);

    if (delErr) {
      throw new Error(`Failed to delete campus: ${delErr.message}`);
    }

    CampusService.invalidateCache();
  }

  /**
   * Helper: Batch compute student count for each campus
   */
  public async getCampusUsageMap(): Promise<Map<string, number>> {
    const map = new Map<string, number>();

    try {
      const supabase = getAdminSupabase();
      const { data, error } = await supabase
        .from("student_academic")
        .select("nfsu_campus")
        .is("deleted_at", null);

      if (!error && data) {
        data.forEach(row => {
          const rawName = (row.nfsu_campus || "").trim().toLowerCase();
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
