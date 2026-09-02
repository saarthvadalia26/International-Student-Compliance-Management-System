"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdministrator } from "@/lib/auth/permissions";
import { CampusService } from "@/domain/campuses/campus.service";
import { Campus, CreateCampusDto, UpdateCampusDto, CampusFilterOptions } from "@/domain/campuses/types";

const campusService = new CampusService();

async function getAdminUser() {
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication required.");
  requireAdministrator(user);
  return user;
}

export async function getAllCampusesAction(options?: CampusFilterOptions): Promise<{
  success: boolean;
  campuses: Campus[];
  error?: string;
}> {
  try {
    const campuses = await campusService.getAllCampuses(options);
    return { success: true, campuses };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load campuses.";
    return { success: false, campuses: [], error: msg };
  }
}

export async function getActiveCampusesAction(): Promise<{
  success: boolean;
  campuses: Campus[];
  error?: string;
}> {
  try {
    const campuses = await campusService.getActiveCampuses();
    return { success: true, campuses };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load active campuses.";
    return { success: false, campuses: [], error: msg };
  }
}

export async function createCampusAction(dto: CreateCampusDto): Promise<{
  success: boolean;
  campus?: Campus;
  error?: string;
}> {
  try {
    await getAdminUser();
    const campus = await campusService.createCampus(dto);
    revalidatePath("/settings");
    revalidatePath("/students/add");
    revalidatePath("/students");
    return { success: true, campus };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create campus.";
    return { success: false, error: msg };
  }
}

export async function updateCampusAction(id: string, dto: UpdateCampusDto): Promise<{
  success: boolean;
  campus?: Campus;
  error?: string;
}> {
  try {
    await getAdminUser();
    const campus = await campusService.updateCampus(id, dto);
    revalidatePath("/settings");
    revalidatePath("/students/add");
    revalidatePath("/students");
    return { success: true, campus };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update campus.";
    return { success: false, error: msg };
  }
}

export async function deleteCampusAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await getAdminUser();
    await campusService.deleteCampus(id);
    revalidatePath("/settings");
    revalidatePath("/students/add");
    revalidatePath("/students");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete campus.";
    return { success: false, error: msg };
  }
}
