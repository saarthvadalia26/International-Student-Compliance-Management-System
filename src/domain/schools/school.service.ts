import { getAdminSupabase } from "@/lib/supabase/admin";
import { School, CreateSchoolDto, UpdateSchoolDto } from "./types";

export const DEFAULT_FALLBACK_SCHOOLS: School[] = [
  { id: "school-spes", name: "School of Pharmacy & Emerging Sciences", code: "SPES", description: "Pharmaceutical sciences, toxicology, and emergent clinical disciplines.", displayOrder: 1, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "school-sfs", name: "School of Forensic Sciences", code: "SFS", description: "Forensic sciences, physical evidence, and forensic chemistry/biology.", displayOrder: 2, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "school-scsdf", name: "School of Cyber Security & Digital Forensics", code: "SCSDF", description: "Information security, digital investigations, incident response, and cyber forensics.", displayOrder: 3, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "school-spsss", name: "School of Police Science & Security Studies", code: "SPSSS", description: "Law enforcement administration, internal security, and police sciences.", displayOrder: 4, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "school-sms", name: "School of Management Studies", code: "SMS", description: "Cyber business administration and security management.", displayOrder: 5, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "school-scbs", name: "School of Criminology & Behavioral Sciences", code: "SCBS", description: "Criminology, penology, and investigative behavioral psychology.", displayOrder: 6, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "school-set", name: "School of Engineering & Technology", code: "SET", description: "Computer science, artificial intelligence, and applied engineering.", displayOrder: 7, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "school-drp", name: "Doctoral Research Programme", code: "DRP", description: "Doctoral research, doctoral studies, and interdisciplinary fellowships.", displayOrder: 8, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

export class SchoolService {
  /**
   * Get all active schools sorted by display order and name
   */
  public async getActiveSchools(): Promise<School[]> {
    try {
      const supabase = getAdminSupabase();
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (error || !data || data.length === 0) {
        return DEFAULT_FALLBACK_SCHOOLS.filter(s => s.isActive);
      }

      return data.map(this.mapToDomain);
    } catch {
      return DEFAULT_FALLBACK_SCHOOLS.filter(s => s.isActive);
    }
  }

  /**
   * Get all schools (including archived) for admin management
   */
  public async getAllSchools(): Promise<School[]> {
    try {
      const supabase = getAdminSupabase();
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (error || !data || data.length === 0) {
        return DEFAULT_FALLBACK_SCHOOLS;
      }

      return data.map(this.mapToDomain);
    } catch {
      return DEFAULT_FALLBACK_SCHOOLS;
    }
  }

  /**
   * Find school by stable UUID ID
   */
  public async getSchoolById(id: string): Promise<School | null> {
    const trimmedId = id?.trim();
    if (!trimmedId) return null;

    try {
      const supabase = getAdminSupabase();
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .eq("id", trimmedId)
        .maybeSingle();

      if (!error && data) return this.mapToDomain(data);
      if (!error && !data) {
        // Record does not exist in database (deleted or invalid ID)
        return null;
      }

      const fallback = DEFAULT_FALLBACK_SCHOOLS.find(s => s.id === trimmedId);
      return fallback || null;
    } catch {
      const fallback = DEFAULT_FALLBACK_SCHOOLS.find(s => s.id === trimmedId);
      return fallback || null;
    }
  }

  /**
   * Find school by code or name
   */
  public async getSchoolByCodeOrName(identifier: string): Promise<School | null> {
    const query = identifier?.trim();
    if (!query) return null;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
    if (isUuid) {
      const byId = await this.getSchoolById(query);
      if (byId) return byId;
    }

    try {
      const supabase = getAdminSupabase();
      
      // Query 1: Exact code match (case-insensitive)
      const { data: byCode } = await supabase
        .from("schools")
        .select("*")
        .ilike("code", query)
        .maybeSingle();

      if (byCode) return this.mapToDomain(byCode);

      // Query 2: Exact name match (case-insensitive)
      const { data: byName } = await supabase
        .from("schools")
        .select("*")
        .ilike("name", query)
        .maybeSingle();

      if (byName) return this.mapToDomain(byName);

      // Query 3: In-memory fallback dataset
      const queryLower = query.toLowerCase();
      const fallback = DEFAULT_FALLBACK_SCHOOLS.find(
        s => (s.code && s.code.toLowerCase() === queryLower) ||
             s.name.toLowerCase() === queryLower ||
             (s.code && s.code.replace(/_/g, "-").toLowerCase() === queryLower.replace(/_/g, "-"))
      );
      return fallback || null;
    } catch {
      const queryLower = query.toLowerCase();
      const fallback = DEFAULT_FALLBACK_SCHOOLS.find(
        s => (s.code && s.code.toLowerCase() === queryLower) ||
             s.name.toLowerCase() === queryLower ||
             (s.code && s.code.replace(/_/g, "-").toLowerCase() === queryLower.replace(/_/g, "-"))
      );
      return fallback || null;
    }
  }

  /**
   * Create a new school record
   */
  public async createSchool(dto: CreateSchoolDto, actorId?: string): Promise<School> {
    const cleanName = dto.name.trim();
    if (!cleanName) throw new Error("School name is required.");

    const cleanCode = dto.code ? dto.code.trim().toUpperCase() : null;

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("schools")
      .insert({
        name: cleanName,
        code: cleanCode,
        description: dto.description?.trim() || null,
        display_order: dto.displayOrder ?? 0,
        is_active: dto.isActive ?? true,
        created_by: actorId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed creating school: ${error?.message || "Database insert failure"}`);
    }

    return this.mapToDomain(data);
  }

  /**
   * Update an existing school record
   */
  public async updateSchool(id: string, dto: UpdateSchoolDto, _actorId?: string): Promise<School> {
    const trimmedId = id.trim();
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (dto.name !== undefined) {
      const cleanName = dto.name.trim();
      if (!cleanName) throw new Error("School name cannot be empty.");
      payload.name = cleanName;
    }
    if (dto.code !== undefined) {
      payload.code = dto.code ? dto.code.trim().toUpperCase() : null;
    }
    if (dto.description !== undefined) {
      payload.description = dto.description ? dto.description.trim() : null;
    }
    if (dto.displayOrder !== undefined) {
      payload.display_order = dto.displayOrder;
    }
    if (dto.isActive !== undefined) {
      payload.is_active = dto.isActive;
    }

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("schools")
      .update(payload)
      .eq("id", trimmedId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed updating school: ${error?.message || "Database update failure"}`);
    }

    return this.mapToDomain(data);
  }

  /**
   * Permanently delete a school/department master record.
   * Enforces referential integrity checks before deletion to protect programs and students.
   */
  public async deleteSchool(id: string, _actorId?: string): Promise<{ success: boolean; school?: School; error?: string }> {
    const trimmedId = id?.trim();
    if (!trimmedId) {
      return { success: false, error: "School ID is required." };
    }

    const supabase = getAdminSupabase();

    // 1. Verify school exists
    const { data: existingSchool, error: fetchErr } = await supabase
      .from("schools")
      .select("*")
      .eq("id", trimmedId)
      .maybeSingle();

    if (fetchErr) {
      return { success: false, error: `Failed verifying school: ${fetchErr.message}` };
    }

    if (!existingSchool) {
      return { success: false, error: "School / Department not found or has already been deleted." };
    }

    // 2. Pre-flight dependency check 1: Associated academic programs
    const { count: programCount, error: progCountErr } = await supabase
      .from("academic_programs")
      .select("id", { count: "exact", head: true })
      .eq("school_id", trimmedId);

    if (progCountErr) {
      console.warn("[SCHOOL_DELETE] Error checking associated academic programs:", progCountErr.message);
    }

    if (programCount && programCount > 0) {
      return {
        success: false,
        error: `This school cannot be deleted because it contains ${programCount} academic program${programCount > 1 ? "s" : ""}. Please delete or reassign all programs belonging to this school first.`
      };
    }

    // 3. Pre-flight dependency check 2: Administrative student overrides
    const { count: overrideCount, error: overrideCountErr } = await supabase
      .from("student_academic")
      .select("student_id", { count: "exact", head: true })
      .eq("override_school_id", trimmedId);

    if (overrideCountErr) {
      console.warn("[SCHOOL_DELETE] Error checking student school overrides:", overrideCountErr.message);
    }

    if (overrideCount && overrideCount > 0) {
      return {
        success: false,
        error: `This school cannot be deleted because it is currently assigned as an administrative override for ${overrideCount} student record${overrideCount > 1 ? "s" : ""}. Please update the student records before deleting.`
      };
    }

    // 4. Execute permanent deletion
    const { error: deleteErr } = await supabase
      .from("schools")
      .delete()
      .eq("id", trimmedId);

    if (deleteErr) {
      if (deleteErr.code === "23503") {
        return {
          success: false,
          error: "This school cannot be deleted because dependent academic or student records reference it."
        };
      }
      return {
        success: false,
        error: `Failed deleting school: ${deleteErr.message}`
      };
    }

    return {
      success: true,
      school: this.mapToDomain(existingSchool)
    };
  }

  /**
   * Toggle school activation status
   */
  public async toggleSchoolStatus(id: string, isActive: boolean, actorId?: string): Promise<School> {
    return this.updateSchool(id, { isActive }, actorId);
  }

  private mapToDomain(row: Record<string, unknown>): School {
    return {
      id: String(row.id),
      name: String(row.name),
      code: row.code ? String(row.code) : null,
      description: row.description ? String(row.description) : null,
      displayOrder: Number(row.display_order) || 0,
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString()),
      createdBy: row.created_by ? String(row.created_by) : null
    };
  }
}
