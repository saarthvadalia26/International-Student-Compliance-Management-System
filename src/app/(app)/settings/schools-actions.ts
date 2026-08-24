"use server";

import { headers } from "next/headers";
import { SchoolService } from "@/domain/schools/school.service";
import { School, CreateSchoolDto, UpdateSchoolDto } from "@/domain/schools/types";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdministrator } from "@/lib/auth/permissions";
import { auditService } from "@/lib/audit/audit.service";

const schoolService = new SchoolService();

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
 * Admin action: Fetch all schools for Settings Management
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
    const user = await getAdminUser();
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
    const user = await getAdminUser();
    const school = await schoolService.updateSchool(id, dto, user?.id);
    return { success: true, school };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Admin action: Permanently Delete school/department
 */
export async function deleteSchoolAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const admin = await getAdminUser();
    const result = await schoolService.deleteSchool(id, admin.id);

    if (result.success && result.school) {
      const meta = await getRequestMeta();
      await auditService.logSchoolDeletion({
        adminId: admin.id,
        adminEmail: admin.email || "admin@system.local",
        adminName: (admin.user_metadata?.full_name as string) || (admin.user_metadata?.name as string) || undefined,
        schoolId: result.school.id,
        schoolName: result.school.name,
        schoolCode: result.school.code,
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
 * Admin action: Archive or Restore school/department (Legacy / backward-compatibility)
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
    const user = await getAdminUser();
    const school = await schoolService.toggleSchoolStatus(id, isActive, user?.id);
    return { success: true, school };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

