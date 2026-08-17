"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { UserProfileService } from "@/domain/users/user-profile.service";
import { UserProfile } from "@/domain/users/types";
import { auditService } from "@/lib/audit/audit.service";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

async function getRequestMeta() {
  try {
    const h = await headers();
    const ipAddress = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "unknown";
    const userAgent = h.get("user-agent") ?? "unknown";
    return { ipAddress, userAgent };
  } catch {
    return { ipAddress: "unknown", userAgent: "unknown" };
  }
}

/**
 * Retrieves the currently authenticated user's profile.
 */
export async function getCurrentUserProfileAction(): Promise<UserProfile | null> {
  const supabase = await getServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return null;
  }

  return UserProfileService.getProfileById(session.user.id);
}

/**
 * Updates the current user's full name.
 */
export async function updateMyProfileNameAction(fullName: string): Promise<UserProfile> {
  const supabase = await getServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("Authentication required.");
  }

  const cleanName = fullName.trim();
  if (cleanName.length < 2) {
    throw new Error("Full name must be at least 2 characters long.");
  }

  const updated = await UserProfileService.updateProfileName(session.user.id, {
    fullName: cleanName,
  });

  const meta = await getRequestMeta();
  await auditService.logConfigChange({
    userId: session.user.id,
    userEmail: session.user.email ?? "unknown",
    setting: "PROFILE_FULL_NAME_UPDATED",
    previousValue: (session.user.user_metadata?.full_name as string) || "unset",
    newValue: cleanName,
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return updated;
}
