"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { StudentPortalService } from "@/domain/student-portal/services/student-portal.service";
import { SupabaseStudentPortalRepository } from "@/domain/student-portal/repositories/student-portal.repository";
import { 
  StudentPortalProfile, 
  StudentHistoryRow, 
  StudentReminderHistoryRow 
} from "@/domain/student-portal/types";

const portalRepo = new SupabaseStudentPortalRepository();
const portalService = new StudentPortalService();

/**
 * Helper to cryptographically verify user JWT and retrieve student association ID
 */
async function verifyUserAndGetStudentId(jwt: string): Promise<string> {
  const supabase = getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(jwt);

  if (error || !user) {
    throw new Error("Authentication failed: Invalid session or JWT token.");
  }

  const role = user.user_metadata?.role;
  const studentId = user.user_metadata?.student_id;

  if (role !== "student" || !studentId) {
    throw new Error("Authorization failed: Access restricted to students only.");
  }

  return studentId;
}

export async function fetchStudentDashboard(jwt: string): Promise<{
  profile: StudentPortalProfile | null;
  history: StudentHistoryRow[];
  reminders: StudentReminderHistoryRow[];
}> {
  try {
    const studentId = await verifyUserAndGetStudentId(jwt);
    console.log(`[STUDENT_ACTION] Loading dashboard assets for student: ${studentId}`);

    const [profile, history, reminders] = await Promise.all([
      portalRepo.getStudentProfile(studentId),
      portalRepo.getStudentHistory(studentId),
      portalRepo.getStudentReminders(studentId)
    ]);

    return { profile, history, reminders };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[STUDENT_ACTION_ERROR] Failed loading dashboard:", msg);
    throw new Error(msg);
  }
}

export async function fetchStudentProfile(jwt: string): Promise<StudentPortalProfile | null> {
  try {
    const studentId = await verifyUserAndGetStudentId(jwt);
    return portalRepo.getStudentProfile(studentId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg);
  }
}

export async function uploadEfrro(
  jwt: string,
  filename: string,
  fileBase64: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const studentId = await verifyUserAndGetStudentId(jwt);
    const fileBuffer = Buffer.from(fileBase64, "base64");

    await portalService.uploadEfrroDocument(
      studentId,
      filename,
      fileBuffer,
      ipAddress,
      userAgent
    );

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
