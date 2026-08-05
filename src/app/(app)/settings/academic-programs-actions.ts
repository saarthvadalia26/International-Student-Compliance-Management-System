"use server";

import { AcademicProgramService } from "@/domain/academic-programs/academic-program.service";
import { AcademicProgram, CreateProgramDto, UpdateProgramDto } from "@/domain/academic-programs/types";
import { getServerSupabase } from "@/lib/supabase/server";

const programService = new AcademicProgramService();

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
 * Admin action: Fetch all programs (including archived) for Settings Management
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
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

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
    const program = await programService.updateProgram(id, dto);
    return { success: true, program };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Admin action: Archive or Restore academic program
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
    const program = await programService.toggleProgramStatus(id, isActive);
    return { success: true, program };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
