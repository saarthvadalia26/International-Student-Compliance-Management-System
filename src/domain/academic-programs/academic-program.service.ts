import { getAdminSupabase } from "@/lib/supabase/admin";
import { AcademicProgram, CreateProgramDto, UpdateProgramDto, SemesterDurationUnit } from "./types";
import { normalizeAcademicLevel } from "./academic-level";

// In-memory fallback programs list if database table is empty or migrating
export const DEFAULT_FALLBACK_PROGRAMS: AcademicProgram[] = [
  { id: "prog-msc-tox", programName: "M. Sc. Toxicology", programCode: "MSC-TOX", displayOrder: 1, isActive: true, durationValue: 2, durationUnit: "Years", totalSemesters: 4, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "PG", schoolId: "school-spes", schoolName: "School of Pharmacy & Emerging Sciences", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-msc-fs", programName: "M. Sc. Forensic Science", programCode: "MSC-FS", displayOrder: 2, isActive: true, durationValue: 2, durationUnit: "Years", totalSemesters: 4, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "PG", schoolId: "school-sfs", schoolName: "School of Forensic Sciences", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-msc-cs", programName: "M. Sc. Cyber Security", programCode: "MSC-CS", displayOrder: 3, isActive: true, durationValue: 2, durationUnit: "Years", totalSemesters: 4, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "PG", schoolId: "school-scsdf", schoolName: "School of Cyber Security & Digital Forensics", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-msc-dfis", programName: "M.Sc. in Digital Forensics & Information Security", programCode: "MSC-DFIS", displayOrder: 4, isActive: true, durationValue: 2, durationUnit: "Years", totalSemesters: 4, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "PG", schoolId: "school-scsdf", schoolName: "School of Cyber Security & Digital Forensics", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-mtech-cs", programName: "M.Tech in Cyber Security", programCode: "MTECH-CS", displayOrder: 5, isActive: true, durationValue: 2, durationUnit: "Years", totalSemesters: 4, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "PG", schoolId: "school-scsdf", schoolName: "School of Cyber Security & Digital Forensics", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-ma-pss", programName: "M.A. Police & Security Studies", programCode: "MA-PSS", displayOrder: 6, isActive: true, durationValue: 2, durationUnit: "Years", totalSemesters: 4, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "PG", schoolId: "school-spsss", schoolName: "School of Police Science & Security Studies", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-mba-cs", programName: "Master of Business Administration (Cyber Security)", programCode: "MBA-CS", displayOrder: 7, isActive: true, durationValue: 2, durationUnit: "Years", totalSemesters: 4, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "PG", schoolId: "school-sms", schoolName: "School of Management Studies", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-msc-food", programName: "M.Sc. Food Technology", programCode: "MSC-FOOD", displayOrder: 8, isActive: true, durationValue: 2, durationUnit: "Years", totalSemesters: 4, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "PG", schoolId: "school-spes", schoolName: "School of Pharmacy & Emerging Sciences", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-msc-bbi", programName: "M.Sc. Forensic Biotechnology & Bioinformatics", programCode: "MSC-BBI", displayOrder: 9, isActive: true, durationValue: 2, durationUnit: "Years", totalSemesters: 4, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "PG", schoolId: "school-sfs", schoolName: "School of Forensic Sciences", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-ma-crim", programName: "M.A. Criminology", programCode: "MA-CRIM", displayOrder: 10, isActive: true, durationValue: 2, durationUnit: "Years", totalSemesters: 4, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "PG", schoolId: "school-scbs", schoolName: "School of Criminology & Behavioral Sciences", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-ma-pra", programName: "M.A. Police Administration", programCode: "MA-PRA", displayOrder: 11, isActive: true, durationValue: 2, durationUnit: "Years", totalSemesters: 4, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "PG", schoolId: "school-spsss", schoolName: "School of Police Science & Security Studies", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-bsc-crim", programName: "B.Sc. Criminology", programCode: "BSC-CRIM", displayOrder: 12, isActive: true, durationValue: 3, durationUnit: "Years", totalSemesters: 6, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "UG", schoolId: "school-scbs", schoolName: "School of Criminology & Behavioral Sciences", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-bsc-fs", programName: "B.Sc. in Forensic Science", programCode: "BSC-FS", displayOrder: 13, isActive: true, durationValue: 3, durationUnit: "Years", totalSemesters: 6, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "UG", schoolId: "school-sfs", schoolName: "School of Forensic Sciences", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-btech-cse", programName: "B.Tech in Computer Science & Engineering", programCode: "BTECH-CSE", displayOrder: 14, isActive: true, durationValue: 4, durationUnit: "Years", totalSemesters: 8, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "UG", schoolId: "school-set", schoolName: "School of Engineering & Technology", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-btech-aids", programName: "B.Tech in AI & Data Science", programCode: "BTECH-AIDS", displayOrder: 15, isActive: true, durationValue: 4, durationUnit: "Years", totalSemesters: 8, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "UG", schoolId: "school-set", schoolName: "School of Engineering & Technology", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-int-crim", programName: "Integrated B.A. + M.A. Criminology", programCode: "INT-BA-MA-CRIM", displayOrder: 16, isActive: true, durationValue: 5, durationUnit: "Years", totalSemesters: 10, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "INTEGRATED", schoolId: "school-scbs", schoolName: "School of Criminology & Behavioral Sciences", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-int-cse", programName: "B.Tech + M.Tech in Computer Science & Engineering", programCode: "BTECH-MTECH-CSE", displayOrder: 17, isActive: true, durationValue: 5, durationUnit: "Years", totalSemesters: 10, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "INTEGRATED", schoolId: "school-set", schoolName: "School of Engineering & Technology", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-phd", programName: "Doctor of Philosophy (Ph.D.)", programCode: "PHD", displayOrder: 18, isActive: true, durationValue: 3, durationUnit: "Years", totalSemesters: 6, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "PhD", schoolId: "school-drp", schoolName: "Doctoral Research Programme", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-pgd-fps", programName: "Post Graduate Diploma in Fingerprint Science", programCode: "PGD-FPS", displayOrder: 19, isActive: true, durationValue: 1, durationUnit: "Years", totalSemesters: 2, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "Diploma", schoolId: "school-sfs", schoolName: "School of Forensic Sciences", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "prog-pgd-fde", programName: "Post Graduate Diploma in Forensic Document Examination", programCode: "PGD-FDE", displayOrder: 20, isActive: true, durationValue: 1, durationUnit: "Years", totalSemesters: 2, semesterDuration: 6, semesterDurationUnit: "months", academicLevel: "Diploma", schoolId: "school-sfs", schoolName: "School of Forensic Sciences", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

/**
 * Authoritative legacy aliases and abbreviation mappings.
 * Maps legacy code strings, acronyms, and shorthand names to canonical program codes.
 */
export const LEGACY_PROGRAM_ALIASES: Record<string, string> = {
  // Police & Security Studies
  "MAPSS": "MA-PSS",
  "MAPSS-CODE": "MA-PSS",
  "MA_PSS": "MA-PSS",
  "MAPSS_CODE": "MA-PSS",
  
  // Biotechnology & Bioinformatics
  "MBBI": "MSC-BBI",
  "MBBI-CODE": "MSC-BBI",
  "MSC_BBI": "MSC-BBI",
  "MBBI_CODE": "MSC-BBI",

  // Criminology PG
  "MAC": "MA-CRIM",
  "MAC-CODE": "MA-CRIM",
  "MA_CRIM": "MA-CRIM",
  "MAC_CODE": "MA-CRIM",

  // Police Administration
  "MPRA": "MA-PRA",
  "MPRA-CODE": "MA-PRA",
  "MA_PRA": "MA-PRA",
  "MPRA_CODE": "MA-PRA",

  // Food Technology
  "M.SC. FOOD": "MSC-FOOD",
  "M. SC. FOOD": "MSC-FOOD",
  "MSC. FOOD": "MSC-FOOD",
  "MSC_FOOD": "MSC-FOOD",
  "MSC-FOOD-TECH": "MSC-FOOD",
  "MSC_FOOD_TECH": "MSC-FOOD",
  "FOOD": "MSC-FOOD",

  // Toxicology
  "MSCTOX": "MSC-TOX",
  "MSC_TOX": "MSC-TOX",
  "M.SC. TOXICOLOGY": "MSC-TOX",
  "MSC TOXICOLOGY": "MSC-TOX",

  // Forensic Science PG
  "MSCFS": "MSC-FS",
  "MSC_FS": "MSC-FS",
  "M.SC. FORENSIC SCIENCE": "MSC-FS",

  // Cyber Security PG
  "MSCCS": "MSC-CS",
  "MSC_CS": "MSC-CS",
  "M.SC. CYBER SECURITY": "MSC-CS",

  // Digital Forensics
  "MSCDFIS": "MSC-DFIS",
  "MSC_DFIS": "MSC-DFIS",

  // Cyber Security M.Tech
  "MTECHCS": "MTECH-CS",
  "MTECH_CS": "MTECH-CS",

  // MBA Cyber Security
  "MBACS": "MBA-CS",
  "MBA_CS": "MBA-CS",

  // Computer Science UG
  "BTECHCSE": "BTECH-CSE",
  "BTECH_CSE": "BTECH-CSE",

  // AI & Data Science UG
  "BTECHAIDS": "BTECH-AIDS",
  "BTECH_AIDS": "BTECH-AIDS",

  // Forensic Science UG
  "BSCFS": "BSC-FS",
  "BSC_FS": "BSC-FS",

  // Criminology UG
  "BSCCRIM": "BSC-CRIM",
  "BSC_CRIM": "BSC-CRIM",

  // Integrated Programs
  "INT_BA_MA_CRIM": "INT-BA-MA-CRIM",
  "BTECH_MTECH_CSE": "BTECH-MTECH-CSE",

  // PhD
  "PH.D.": "PHD",
  "PH.D": "PHD"
};

/**
 * Normalizes text by removing periods, extra whitespace, and converting to lowercase.
 */
function normalizeText(text: string): string {
  return text.replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

export class AcademicProgramService {
  /**
   * Get all active academic programs sorted alphabetically or by display order
   */
  public async getActivePrograms(): Promise<AcademicProgram[]> {
    try {
      const supabase = getAdminSupabase();
      const { data, error } = await supabase
        .from("academic_programs")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("program_name", { ascending: true });

      if (error || !data || data.length === 0) {
        return DEFAULT_FALLBACK_PROGRAMS.filter(p => p.isActive);
      }

      return data.map(this.mapToDomain);
    } catch {
      return DEFAULT_FALLBACK_PROGRAMS.filter(p => p.isActive);
    }
  }

  /**
   * Get all academic programs (including archived) for admin management
   */
  public async getAllPrograms(): Promise<AcademicProgram[]> {
    try {
      const supabase = getAdminSupabase();
      const { data, error } = await supabase
        .from("academic_programs")
        .select("*")
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
   * Find program by stable UUID identifier
   */
  public async getProgramById(id: string): Promise<AcademicProgram | null> {
    const trimmedId = id?.trim();
    if (!trimmedId) return null;

    try {
      const supabase = getAdminSupabase();
      const { data, error } = await supabase
        .from("academic_programs")
        .select("*")
        .eq("id", trimmedId)
        .maybeSingle();

      if (!error && data) return this.mapToDomain(data);
      if (!error && !data) {
        // Record does not exist in database (deleted or invalid ID)
        return null;
      }

      const fallback = DEFAULT_FALLBACK_PROGRAMS.find(p => p.id === trimmedId);
      return fallback || null;
    } catch {
      const fallback = DEFAULT_FALLBACK_PROGRAMS.find(p => p.id === trimmedId);
      return fallback || null;
    }
  }

  /**
   * Authoritative canonical program resolver:
   * Resolves by stable UUID ID -> Exact Program Code -> Hyphen/Underscore Normalized Code ->
   * Exact Program Name -> Period/Space Normalized Name -> Legacy Alias Dictionary -> In-Memory Fallbacks.
   */
  public async resolveCanonicalProgram(identifier: string): Promise<AcademicProgram | null> {
    return this.getProgramByIdCodeOrName(identifier);
  }

  /**
   * Find program by stable UUID, exact program code, or exact full program name
   */
  public async getProgramByIdCodeOrName(identifier: string): Promise<AcademicProgram | null> {
    const query = identifier?.trim();
    if (!query) return null;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
    if (isUuid) {
      const byId = await this.getProgramById(query);
      if (byId) return byId;
    }

    return this.getProgramByCodeOrName(query);
  }

  /**
   * Find program by code, name, or legacy alias
   */
  public async getProgramByCodeOrName(codeOrName: string): Promise<AcademicProgram | null> {
    const query = codeOrName?.trim();
    if (!query) return null;

    try {
      const supabase = getAdminSupabase();
      const queryUpper = query.toUpperCase();
      const queryNormCode = query.replace(/_/g, "-");
      const aliasedCode = LEGACY_PROGRAM_ALIASES[queryUpper] || LEGACY_PROGRAM_ALIASES[queryNormCode.toUpperCase()];

      // Query 1: Exact program code match (case-insensitive)
      const { data: byCode } = await supabase
        .from("academic_programs")
        .select("*")
        .ilike("program_code", query)
        .maybeSingle();

      if (byCode) return this.mapToDomain(byCode);

      // Query 2: Exact program name match (case-insensitive)
      const { data: byName } = await supabase
        .from("academic_programs")
        .select("*")
        .ilike("program_name", query)
        .maybeSingle();

      if (byName) return this.mapToDomain(byName);

      // Query 3: Normalized hyphen/underscore code variation
      const { data: byNormCode } = await supabase
        .from("academic_programs")
        .select("*")
        .ilike("program_code", queryNormCode)
        .maybeSingle();

      if (byNormCode) return this.mapToDomain(byNormCode);

      // Query 4: Check if query matches a known legacy alias
      if (aliasedCode) {
        const { data: byAlias } = await supabase
          .from("academic_programs")
          .select("*")
          .ilike("program_code", aliasedCode)
          .maybeSingle();

        if (byAlias) return this.mapToDomain(byAlias);
      }

      // Query 5: Punctuation/spacing normalized name search across all active programs
      const { data: allPrograms } = await supabase
        .from("academic_programs")
        .select("*");

      if (allPrograms && allPrograms.length > 0) {
        const normalizedTarget = normalizeText(query);
        const matched = allPrograms.find(p => {
          if (!p.program_name) return false;
          const pNorm = normalizeText(p.program_name);
          const pBaseNorm = normalizeText(p.program_name.split("(")[0]);
          if (pNorm === normalizedTarget || pBaseNorm === normalizedTarget) return true;
          if (p.program_code && p.program_code.toUpperCase() === queryUpper) return true;
          if (aliasedCode && p.program_code && p.program_code.toUpperCase() === aliasedCode.toUpperCase()) return true;
          return false;
        });

        if (matched) return this.mapToDomain(matched);
      }

      // Query 6: In-memory fallback dataset
      return this.matchInMemoryFallback(query, aliasedCode);
    } catch {
      const queryUpper = query.toUpperCase();
      const queryNormCode = query.replace(/_/g, "-");
      const aliasedCode = LEGACY_PROGRAM_ALIASES[queryUpper] || LEGACY_PROGRAM_ALIASES[queryNormCode.toUpperCase()];
      return this.matchInMemoryFallback(query, aliasedCode);
    }
  }

  private matchInMemoryFallback(query: string, aliasedCode?: string): AcademicProgram | null {
    const queryLower = query.toLowerCase();
    const queryUpper = query.toUpperCase();
    const normalizedTarget = normalizeText(query);

    const fallback = DEFAULT_FALLBACK_PROGRAMS.find(p => {
      if (p.programCode && (p.programCode.toLowerCase() === queryLower || p.programCode.toUpperCase() === queryUpper)) return true;
      if (p.programName.toLowerCase() === queryLower) return true;
      if (p.programCode && p.programCode.replace(/_/g, "-").toLowerCase() === queryLower.replace(/_/g, "-")) return true;
      const pNorm = normalizeText(p.programName);
      const pBaseNorm = normalizeText(p.programName.split("(")[0]);
      if (pNorm === normalizedTarget || pBaseNorm === normalizedTarget) return true;
      if (aliasedCode && p.programCode && p.programCode.toUpperCase() === aliasedCode.toUpperCase()) return true;
      return false;
    });

    return fallback || null;
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
    const totalSemesters = dto.totalSemesters && dto.totalSemesters > 0 ? Number(dto.totalSemesters) : 8;
    const semesterDuration = dto.semesterDuration && dto.semesterDuration > 0 ? Number(dto.semesterDuration) : 6;
    const semesterDurationUnit = (dto.semesterDurationUnit?.trim() || "months") as SemesterDurationUnit;

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

    const acadLevel = dto.academicLevel !== undefined ? (normalizeAcademicLevel(dto.academicLevel) || dto.academicLevel?.trim() || null) : null;

    let resolvedSchoolId = dto.schoolId?.trim() || null;
    let resolvedSchoolName = dto.schoolName?.trim() || null;

    if (resolvedSchoolId && !resolvedSchoolName) {
      const { data: s } = await supabase.from("schools").select("name").eq("id", resolvedSchoolId).maybeSingle();
      if (s) resolvedSchoolName = s.name;
    } else if (!resolvedSchoolId && resolvedSchoolName) {
      const { data: s } = await supabase.from("schools").select("id").ilike("name", resolvedSchoolName).maybeSingle();
      if (s) resolvedSchoolId = s.id;
    }

    const payload = {
      program_name: trimmedName,
      program_code: trimmedCode,
      display_order: dto.displayOrder ?? 1,
      is_active: dto.isActive ?? true,
      duration_value: durationVal,
      duration_unit: durationUnit,
      total_semesters: totalSemesters,
      semester_duration: semesterDuration,
      semester_duration_unit: semesterDurationUnit,
      school_id: resolvedSchoolId,
      school_name: resolvedSchoolName,
      academic_level: acadLevel,
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
    if (dto.totalSemesters !== undefined) payload.total_semesters = Number(dto.totalSemesters);
    if (dto.semesterDuration !== undefined) payload.semester_duration = Number(dto.semesterDuration);
    if (dto.semesterDurationUnit !== undefined) payload.semester_duration_unit = dto.semesterDurationUnit;
    if (dto.schoolId !== undefined) payload.school_id = dto.schoolId?.trim() || null;
    if (dto.schoolName !== undefined) payload.school_name = dto.schoolName?.trim() || null;
    if (dto.academicLevel !== undefined) {
      payload.academic_level = normalizeAcademicLevel(dto.academicLevel) || dto.academicLevel?.trim() || null;
    }

    const { data, error } = await supabase
      .from("academic_programs")
      .update(payload)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error || !data) {
      throw new Error(`Failed to update program: ${error?.message || "Unknown error"}`);
    }

    return this.mapToDomain(data);
  }

  /**
   * Permanently delete an academic program master record.
   * Enforces referential integrity checks before deletion to protect student data.
   */
  public async deleteProgram(id: string, _actorId?: string): Promise<{ success: boolean; program?: AcademicProgram; error?: string }> {
    const trimmedId = id?.trim();
    if (!trimmedId) {
      return { success: false, error: "Program ID is required." };
    }

    const supabase = getAdminSupabase();

    // 1. Verify program exists
    const { data: existingProgram, error: fetchErr } = await supabase
      .from("academic_programs")
      .select("*")
      .eq("id", trimmedId)
      .maybeSingle();

    if (fetchErr) {
      return { success: false, error: `Failed verifying academic program: ${fetchErr.message}` };
    }

    if (!existingProgram) {
      return { success: false, error: "Academic program not found or has already been deleted." };
    }

    // 2. Pre-flight dependency check on student_academic table
    const { count: studentCount, error: countErr } = await supabase
      .from("student_academic")
      .select("student_id", { count: "exact", head: true })
      .eq("program_id", trimmedId);

    if (countErr) {
      console.warn("[ACADEMIC_PROGRAM_DELETE] Error checking student dependencies:", countErr.message);
    }

    if (studentCount && studentCount > 0) {
      return {
        success: false,
        error: `This academic program cannot be deleted because it is currently associated with ${studentCount} student record${studentCount > 1 ? "s" : ""}. Please reassign or update existing students before deleting.`
      };
    }

    // 3. Execute permanent deletion
    const { error: deleteErr } = await supabase
      .from("academic_programs")
      .delete()
      .eq("id", trimmedId);

    if (deleteErr) {
      if (deleteErr.code === "23503") {
        return {
          success: false,
          error: "This academic program cannot be deleted because dependent student records reference it."
        };
      }
      return {
        success: false,
        error: `Failed deleting academic program: ${deleteErr.message}`
      };
    }

    return {
      success: true,
      program: this.mapToDomain(existingProgram)
    };
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
      totalSemesters: Number(row.total_semesters) || 8,
      semesterDuration: Number(row.semester_duration) || 6,
      semesterDurationUnit: (row.semester_duration_unit ? String(row.semester_duration_unit) : "months") as SemesterDurationUnit,
      schoolId: row.school_id ? String(row.school_id) : null,
      schoolName: row.school_name ? String(row.school_name) : null,
      academicLevel: row.academic_level ? String(row.academic_level) : null,
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString()),
      createdBy: row.created_by ? String(row.created_by) : null
    };
  }
}
