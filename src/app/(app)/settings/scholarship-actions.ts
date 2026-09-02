"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdministrator } from "@/lib/auth/permissions";
import { ScholarshipSchemeService } from "@/domain/scholarships/scholarship.service";
import { ScholarshipScheme, CreateScholarshipSchemeDto, UpdateScholarshipSchemeDto, ScholarshipFilterOptions } from "@/domain/scholarships/types";

const scholarshipService = new ScholarshipSchemeService();

async function getAdminUser() {
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication required.");
  requireAdministrator(user);
  return user;
}

export async function getAllScholarshipSchemesAction(options?: ScholarshipFilterOptions): Promise<{
  success: boolean;
  schemes: ScholarshipScheme[];
  error?: string;
}> {
  try {
    const schemes = await scholarshipService.getAllScholarshipSchemes(options);
    return { success: true, schemes };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load scholarship schemes.";
    return { success: false, schemes: [], error: msg };
  }
}

export async function getActiveScholarshipSchemesAction(): Promise<{
  success: boolean;
  schemes: ScholarshipScheme[];
  error?: string;
}> {
  try {
    const schemes = await scholarshipService.getActiveScholarshipSchemes();
    return { success: true, schemes };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load active scholarship schemes.";
    return { success: false, schemes: [], error: msg };
  }
}

export async function createScholarshipSchemeAction(dto: CreateScholarshipSchemeDto): Promise<{
  success: boolean;
  scheme?: ScholarshipScheme;
  error?: string;
}> {
  try {
    await getAdminUser();
    const scheme = await scholarshipService.createScholarshipScheme(dto);
    revalidatePath("/settings");
    revalidatePath("/students/add");
    return { success: true, scheme };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create scholarship scheme.";
    return { success: false, error: msg };
  }
}

export async function updateScholarshipSchemeAction(id: string, dto: UpdateScholarshipSchemeDto): Promise<{
  success: boolean;
  scheme?: ScholarshipScheme;
  error?: string;
}> {
  try {
    await getAdminUser();
    const scheme = await scholarshipService.updateScholarshipScheme(id, dto);
    revalidatePath("/settings");
    revalidatePath("/students/add");
    return { success: true, scheme };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update scholarship scheme.";
    return { success: false, error: msg };
  }
}

export async function deleteScholarshipSchemeAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await getAdminUser();
    await scholarshipService.deleteScholarshipScheme(id);
    revalidatePath("/settings");
    revalidatePath("/students/add");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete scholarship scheme.";
    return { success: false, error: msg };
  }
}
