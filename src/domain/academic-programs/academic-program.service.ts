import { getAdminSupabase } from "@/lib/supabase/admin";
import { AcademicProgram, CreateProgramDto, UpdateProgramDto } from "./types";

// In-memory fallback programs list if database table is empty or migrating
const DEFAULT_FALLBACK_PROGRAMS: AcademicProgram[] = [
  { id: "fallback-1", programName: "B.Tech in Computer Science & Engineering", programCode: "BTECH_CSE", displayOrder: 1, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "fallback-2", programName: "B.Tech in AI & Data Science", programCode: "BTECH_AIDS", displayOrder: 2, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "fallback-3", programName: "B.Sc. in Forensic Science", programCode: "BSC_FS", displayOrder: 3, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "fallback-4", programName: "M.Sc. in Digital Forensics & Information Security", programCode: "MSC_DFIS", displayOrder: 4, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "fallback-5", programName: "M.Tech in Cyber Security", programCode: "MTECH_CS", displayOrder: 5, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "fallback-6", programName: "Master of Business Administration (Cyber Security)", programCode: "MBA_CS", displayOrder: 6, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "fallback-7", programName: "Doctor of Philosophy (Ph.D.)", programCode: "PHD", displayOrder: 7, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export class AcademicProgramService {
  /**
   * Get all active academic programs sorted alphabetically or by display order
   */
  public async getActivePrograms(): Promise<AcademicProgram[]> {
    const supabase = getAdminSupabase();
    
    try {
      const { data, error } = await supabase
        .from("academic_programs")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("program_name", { ascending: true });

      if (error || !data || data.length === 0) {
        return DEFAULT_FALLBACK_PROGRAMS;
      }

      return data.map(this.mapToDomain);
    } catch {
      return DEFAULT_FALLBACK_PROGRAMS;
    }
  }

  /**
   * Get all academic programs (including archived) for admin management
   */
  public async getAllPrograms(): Promise<AcademicProgram[]> {
    const supabase = getAdminSupabase();

    try {
      const { data, error } = await supabase
        .from("academic_programs")
        .select("*")
        .order("display_order", { ascending: true })
        .order("program_name", { ascending: true });

      if (error || !data) {
        return DEFAULT_FALLBACK_PROGRAMS;
      }

      return data.map(this.mapToDomain);
    } catch {
      return DEFAULT_FALLBACK_PROGRAMS;
    }
  }

  /**
   * Create a new academic program with whitespace trimming & duplicate checks
   */
  public async createProgram(dto: CreateProgramDto, userId?: string): Promise<AcademicProgram> {
    const trimmedName = dto.programName.trim();
    if (!trimmedName) {
      throw new Error("Academic Program Name is required.");
    }

    const supabase = getAdminSupabase();

    // Check for duplicate active program name
    const { data: existing } = await supabase
      .from("academic_programs")
      .select("id, program_name")
      .ilike("program_name", trimmedName)
      .maybeSingle();

    if (existing) {
      throw new Error(`An academic program named "${trimmedName}" already exists.`);
    }

    const { data, error } = await supabase
      .from("academic_programs")
      .insert({
        program_name: trimmedName,
        program_code: dto.programCode?.trim() || null,
        display_order: dto.displayOrder || 0,
        is_active: dto.isActive !== undefined ? dto.isActive : true,
        school_name: dto.schoolName?.trim() || null,
        academic_level: dto.academicLevel?.trim() || null,
        created_by: userId || null
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create program: ${error?.message || "Database insert error"}`);
    }

    return this.mapToDomain(data);
  }

  /**
   * Update an existing program
   */
  public async updateProgram(id: string, dto: UpdateProgramDto): Promise<AcademicProgram> {
    const supabase = getAdminSupabase();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (dto.programName !== undefined) {
      const trimmed = dto.programName.trim();
      if (!trimmed) throw new Error("Program Name cannot be empty.");
      
      const { data: existing } = await supabase
        .from("academic_programs")
        .select("id")
        .ilike("program_name", trimmed)
        .neq("id", id)
        .maybeSingle();

      if (existing) {
        throw new Error(`Another academic program named "${trimmed}" already exists.`);
      }

      updates.program_name = trimmed;
    }

    if (dto.programCode !== undefined) updates.program_code = dto.programCode?.trim() || null;
    if (dto.displayOrder !== undefined) updates.display_order = dto.displayOrder;
    if (dto.isActive !== undefined) updates.is_active = dto.isActive;
    if (dto.schoolName !== undefined) updates.school_name = dto.schoolName?.trim() || null;
    if (dto.academicLevel !== undefined) updates.academic_level = dto.academicLevel?.trim() || null;

    const { data, error } = await supabase
      .from("academic_programs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update program: ${error?.message || "Database error"}`);
    }

    return this.mapToDomain(data);
  }

  /**
   * Archive / Deactivate or Restore / Reactivate an academic program
   */
  public async toggleProgramStatus(id: string, isActive: boolean): Promise<AcademicProgram> {
    return this.updateProgram(id, { isActive });
  }

  private mapToDomain(row: Record<string, unknown>): AcademicProgram {
    return {
      id: String(row.id || ""),
      programName: String(row.program_name || ""),
      programCode: row.program_code ? String(row.program_code) : null,
      displayOrder: Number(row.display_order) || 0,
      isActive: Boolean(row.is_active),
      schoolName: row.school_name ? String(row.school_name) : null,
      academicLevel: row.academic_level ? String(row.academic_level) : null,
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString()),
      createdBy: row.created_by ? String(row.created_by) : null
    };
  }
}
