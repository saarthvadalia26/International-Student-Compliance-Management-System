import { getAdminSupabase } from "@/lib/supabase/admin";
import { AcademicProgram, CreateProgramDto, UpdateProgramDto } from "./types";

// In-memory fallback programs list if database table is empty or migrating
const DEFAULT_FALLBACK_PROGRAMS: AcademicProgram[] = [
  { id: "fallback-1", programName: "B.Tech in Computer Science & Engineering", programCode: "BTECH_CSE", displayOrder: 1, isActive: true, durationValue: 4, durationUnit: "Years", academicLevel: "UG", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "fallback-2", programName: "B.Tech in AI & Data Science", programCode: "BTECH_AIDS", displayOrder: 2, isActive: true, durationValue: 4, durationUnit: "Years", academicLevel: "UG", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "fallback-3", programName: "B.Sc. in Forensic Science", programCode: "BSC_FS", displayOrder: 3, isActive: true, durationValue: 4, durationUnit: "Years", academicLevel: "UG", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "fallback-4", programName: "M.Sc. in Digital Forensics & Information Security", programCode: "MSC_DFIS", displayOrder: 4, isActive: true, durationValue: 2, durationUnit: "Years", academicLevel: "PG", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "fallback-5", programName: "M.Tech in Cyber Security", programCode: "MTECH_CS", displayOrder: 5, isActive: true, durationValue: 2, durationUnit: "Years", academicLevel: "PG", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "fallback-6", programName: "Master of Business Administration (Cyber Security)", programCode: "MBA_CS", displayOrder: 6, isActive: true, durationValue: 2, durationUnit: "Years", academicLevel: "PG", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "fallback-7", programName: "Doctor of Philosophy (Ph.D.)", programCode: "PHD", displayOrder: 7, isActive: true, durationValue: 6, durationUnit: "Years", academicLevel: "PhD", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
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
   * Create a new academic program master record
   */
  public async createProgram(dto: CreateProgramDto, userId?: string): Promise<AcademicProgram> {
    const supabase = getAdminSupabase();

    // Check duplicate program_name or program_code
    const trimmedName = dto.programName.trim();
    const trimmedCode = dto.programCode?.trim().toUpperCase() || null;
    const durationVal = dto.durationValue && dto.durationValue > 0 ? Number(dto.durationValue) : 4;
    const durationUnit = dto.durationUnit?.trim() || "Years";

    const { data: existingName } = await supabase
      .from("academic_programs")
      .select("id")
      .ilike("program_name", trimmedName)
      .maybeSingle();

    if (existingName) {
      throw new Error(`An academic program with name "${trimmedName}" already exists.`);
    }

    if (trimmedCode) {
      const { data: existingCode } = await supabase
        .from("academic_programs")
        .select("id")
        .ilike("program_code", trimmedCode)
        .maybeSingle();

      if (existingCode) {
        throw new Error(`An academic program with code "${trimmedCode}" already exists.`);
      }
    }

    const payload = {
      program_name: trimmedName,
      program_code: trimmedCode,
      display_order: dto.displayOrder ?? 1,
      is_active: dto.isActive ?? true,
      duration_value: durationVal,
      duration_unit: durationUnit,
      school_name: dto.schoolName?.trim() || null,
      academic_level: dto.academicLevel?.trim() || null,
      created_by: userId || null
    };

    const { data, error } = await supabase
      .from("academic_programs")
      .insert([payload])
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create program: ${error?.message || "Unknown error"}`);
    }

    return this.mapToDomain(data);
  }

  /**
   * Update an existing academic program record
   */
  public async updateProgram(id: string, dto: UpdateProgramDto): Promise<AcademicProgram> {
    const supabase = getAdminSupabase();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (dto.programName !== undefined) {
      const trimmedName = dto.programName.trim();
      const { data: existingName } = await supabase
        .from("academic_programs")
        .select("id")
        .neq("id", id)
        .ilike("program_name", trimmedName)
        .maybeSingle();

      if (existingName) {
        throw new Error(`Another academic program with name "${trimmedName}" already exists.`);
      }
      payload.program_name = trimmedName;
    }

    if (dto.programCode !== undefined) {
      const trimmedCode = dto.programCode ? dto.programCode.trim().toUpperCase() : null;
      if (trimmedCode) {
        const { data: existingCode } = await supabase
          .from("academic_programs")
          .select("id")
          .neq("id", id)
          .ilike("program_code", trimmedCode)
          .maybeSingle();

        if (existingCode) {
          throw new Error(`Another academic program with code "${trimmedCode}" already exists.`);
        }
      }
      payload.program_code = trimmedCode;
    }

    if (dto.displayOrder !== undefined) payload.display_order = dto.displayOrder;
    if (dto.isActive !== undefined) payload.is_active = dto.isActive;
    if (dto.durationValue !== undefined) payload.duration_value = Number(dto.durationValue);
    if (dto.durationUnit !== undefined) payload.duration_unit = dto.durationUnit;
    if (dto.schoolName !== undefined) payload.school_name = dto.schoolName?.trim() || null;
    if (dto.academicLevel !== undefined) payload.academic_level = dto.academicLevel?.trim() || null;

    const { data, error } = await supabase
      .from("academic_programs")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update program: ${error?.message || "Unknown error"}`);
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
      durationValue: Number(row.duration_value) || 4,
      durationUnit: row.duration_unit ? String(row.duration_unit) : "Years",
      schoolName: row.school_name ? String(row.school_name) : null,
      academicLevel: row.academic_level ? String(row.academic_level) : null,
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString()),
      createdBy: row.created_by ? String(row.created_by) : null
    };
  }
}
