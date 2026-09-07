/**
 * User Profile Service
 * 
 * Server-only service managing persistent user profile records in public.user_profiles,
 * synchronized with Supabase auth metadata.
 */
import "server-only";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { UserProfile, UpdateUserProfileDto } from "./types";
import { AppRole } from "@/lib/auth/permissions";
import { isNameComplete } from "@/utils/name-utils";

export class UserProfileService {
  /**
   * Fetches the canonical profile for a given user ID.
   */
  static async getProfileById(userId: string): Promise<UserProfile | null> {
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(`[USER_PROFILE_SERVICE] Error fetching profile ${userId}:`, error.message);
    }

    if (data) {
      return {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        role: data.role as AppRole,
        isProfileComplete: Boolean(data.is_profile_complete),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    // Fallback: check auth.users directly and sync
    try {
      const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(userId);
      if (authError || !user) return null;

      const rawRole = (user.user_metadata?.role as string | undefined)?.toLowerCase().trim();
      let role: AppRole = "staff";
      if (rawRole === "administrator" || rawRole === "admin") {
        role = "administrator";
      } else if (
        rawRole === "student" ||
        Boolean(user.user_metadata?.student_id) ||
        user.email?.toLowerCase().includes("@iscms.student.local")
      ) {
        role = "student";
      }

      const rawName = (user.user_metadata?.full_name as string | undefined)?.trim() || null;
      const isComplete = isNameComplete(rawName);

      const { data: inserted, error: insertError } = await supabase
        .from("user_profiles")
        .upsert(
          {
            id: user.id,
            email: user.email ?? "no-email@nfsu.ac.in",
            full_name: rawName,
            role,
            is_profile_complete: isComplete,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        .select("*")
        .single();

      if (insertError || !inserted) {
        return {
          id: user.id,
          email: user.email ?? "no-email@nfsu.ac.in",
          fullName: rawName,
          role,
          isProfileComplete: isComplete,
          createdAt: user.created_at,
          updatedAt: user.updated_at ?? user.created_at,
        };
      }

      return {
        id: inserted.id,
        email: inserted.email,
        fullName: inserted.full_name,
        role: inserted.role as AppRole,
        isProfileComplete: Boolean(inserted.is_profile_complete),
        createdAt: inserted.created_at,
        updatedAt: inserted.updated_at,
      };
    } catch (fallbackErr) {
      console.error(`[USER_PROFILE_SERVICE] Fallback error for user ${userId}:`, fallbackErr);
      return null;
    }
  }

  /**
   * Updates a user's full name and marks profile as complete.
   * Synchronizes both public.user_profiles and auth.users user_metadata.
   */
  static async updateProfileName(userId: string, dto: UpdateUserProfileDto): Promise<UserProfile> {
    const cleanName = dto.fullName.trim();
    if (!isNameComplete(cleanName)) {
      throw new Error("Full name must be at least 2 characters long.");
    }

    const supabase = getAdminSupabase();

    // 1. Update auth.users metadata so active sessions / JWT claims immediately have the full_name
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError || !user) {
      throw new Error(`User not found: ${authError?.message || userId}`);
    }

    const existingMeta = user.user_metadata || {};
    const rawRole = (existingMeta.role as string | undefined)?.toLowerCase().trim();
    let role: AppRole = "staff";
    if (rawRole === "administrator" || rawRole === "admin") {
      role = "administrator";
    } else if (
      rawRole === "student" ||
      Boolean(existingMeta.student_id) ||
      user.email?.toLowerCase().includes("@iscms.student.local")
    ) {
      role = "student";
    }

    await supabase.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...user.app_metadata,
        role,
      },
      user_metadata: {
        ...existingMeta,
        full_name: cleanName,
      },
    });

    try {
      const { error: profileError } = await supabase
        .from("user_profiles")
        .upsert(
          {
            id: userId,
            email: user.email ?? "no-email@nfsu.ac.in",
            full_name: cleanName,
            role,
            is_profile_complete: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (profileError) {
        console.warn("[USER_PROFILE_SERVICE] user_profiles table upsert note:", profileError.message);
      }
    } catch (tableErr) {
      console.warn("[USER_PROFILE_SERVICE] user_profiles table sync deferred:", tableErr);
    }

    return {
      id: user.id,
      email: user.email ?? "no-email@nfsu.ac.in",
      fullName: cleanName,
      role,
      isProfileComplete: true,
      createdAt: user.created_at,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetches all user profiles (for administrator user management).
   * Excludes student profiles.
   */
  static async getAllUserProfiles(): Promise<UserProfile[]> {
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .neq("role", "student")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[USER_PROFILE_SERVICE] Error listing user profiles:", error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role as AppRole,
      isProfileComplete: Boolean(row.is_profile_complete),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}
