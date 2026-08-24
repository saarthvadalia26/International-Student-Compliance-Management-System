"use server";

import { headers } from "next/headers";
import { AcademicProgramService } from "@/domain/academic-programs/academic-program.service";
import { AcademicProgram, CreateProgramDto, UpdateProgramDto } from "@/domain/academic-programs/types";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdministrator } from "@/lib/auth/permissions";
import { auditService } from "@/lib/audit/audit.service";

const programService = new AcademicProgramService();

async function getAdminUser() {
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication required.");
  requireAdministrator(user);
  return user;
}

async function getRequestMeta() {
  try {
    const h = await headers();
    return {
      ipAddress: h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? undefined,
      userAgent: h.get("user-agent") ?? undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Public/Staff action: Fetch active academic programs for dropdowns
 */
export async function getActiveAcademicProgramsAction(): Promise<{
  success: boolean;
  programs: AcademicProgram[];
  error?: string;
}> {
  try {
    const programs = await programService.getActivePrograms();
    return { success: true, programs };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[PROGRAMS_ACTION_ERROR] Failed fetching active programs:", msg);
    return { success: false, programs: [], error: msg };
  }
}

/**
 * Admin action: Fetch all programs for Settings Management
 */
export async function getAllAcademicProgramsAction(): Promise<{
  success: boolean;
  programs: AcademicProgram[];
  error?: string;
}> {
  try {
    const programs = await programService.getAllPrograms();
    return { success: true, programs };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, programs: [], error: msg };
  }
}

/**
 * Admin action: Create new academic program
 */
export async function createAcademicProgramAction(dto: CreateProgramDto): Promise<{
  success: boolean;
  program?: AcademicProgram;
  error?: string;
}> {
  try {
    const user = await getAdminUser();
    const program = await programService.createProgram(dto, user?.id);
    return { success: true, program };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Admin action: Update academic program
 */
export async function updateAcademicProgramAction(
  id: string,
  dto: UpdateProgramDto
): Promise<{
  success: boolean;
  program?: AcademicProgram;
  error?: string;
}> {
  try {
    await getAdminUser();
    const program = await programService.updateProgram(id, dto);
    return { success: true, program };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Admin action: Permanently Delete academic program
 */
export async function deleteAcademicProgramAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const admin = await getAdminUser();
    const result = await programService.deleteProgram(id, admin.id);

    if (result.success && result.program) {
      const meta = await getRequestMeta();
      await auditService.logAcademicProgramDeletion({
        adminId: admin.id,
        adminEmail: admin.email || "admin@system.local",
        adminName: (admin.user_metadata?.full_name as string) || (admin.user_metadata?.name as string) || undefined,
        programId: result.program.id,
        programName: result.program.programName,
        programCode: result.program.programCode,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
    }

    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Admin action: Archive or Restore academic program (Legacy / backward-compatibility)
 */
export async function toggleAcademicProgramStatusAction(
  id: string,
  isActive: boolean
): Promise<{
  success: boolean;
  program?: AcademicProgram;
  error?: string;
}> {
  try {
    await getAdminUser();
    const program = await programService.toggleProgramStatus(id, isActive);
    return { success: true, program };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

