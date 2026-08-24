"use server";

import { SchoolService } from "@/domain/schools/school.service";
import { School, CreateSchoolDto, UpdateSchoolDto } from "@/domain/schools/types";
import { getServerSupabase } from "@/lib/supabase/server";

const schoolService = new SchoolService();

/**
 * Public/Staff action: Fetch active schools for dropdowns
 */
export async function getActiveSchoolsAction(): Promise<{
  success: boolean;
  schools: School[];
  error?: string;
}> {
  try {
    const schools = await schoolService.getActiveSchools();
    return { success: true, schools };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[SCHOOLS_ACTION_ERROR] Failed fetching active schools:", msg);
    return { success: false, schools: [], error: msg };
  }
}

/**
 * Admin action: Fetch all schools (including archived) for Settings Management
 */
export async function getAllSchoolsAction(): Promise<{
  success: boolean;
  schools: School[];
  error?: string;
}> {
  try {
    const schools = await schoolService.getAllSchools();
    return { success: true, schools };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, schools: [], error: msg };
  }
}

/**
 * Admin action: Create new school/department
 */
export async function createSchoolAction(dto: CreateSchoolDto): Promise<{
  success: boolean;
  school?: School;
  error?: string;
}> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const school = await schoolService.createSchool(dto, user?.id);
    return { success: true, school };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Admin action: Update school/department
 */
export async function updateSchoolAction(
  id: string,
  dto: UpdateSchoolDto
): Promise<{
  success: boolean;
  school?: School;
  error?: string;
}> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const school = await schoolService.updateSchool(id, dto, user?.id);
    return { success: true, school };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Admin action: Archive or Restore school/department
 */
export async function toggleSchoolStatusAction(
  id: string,
  isActive: boolean
): Promise<{
  success: boolean;
  school?: School;
  error?: string;
}> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const school = await schoolService.toggleSchoolStatus(id, isActive, user?.id);
    return { success: true, school };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
