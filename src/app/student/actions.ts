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
  const supabase = await getServerSupabase();
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
      portalRepo.getStudentProfile(studentId).catch(() => null),
      portalRepo.getStudentHistory(studentId).catch(() => []),
      portalRepo.getStudentReminders(studentId).catch(() => [])
    ]);

    return { profile, history, reminders };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[STUDENT_ACTION_ERROR] Failed loading dashboard:", msg);
    throw new Error(msg);
  }
}

export async function fetchStudentActivityHistory(jwt: string): Promise<{
  history: StudentHistoryRow[];
  reminders: StudentReminderHistoryRow[];
}> {
  try {
    const studentId = await verifyUserAndGetStudentId(jwt);
    console.log(`[STUDENT_ACTION] Loading history timeline for student: ${studentId}`);

    const [history, reminders] = await Promise.all([
      portalRepo.getStudentHistory(studentId).catch((err) => {
        console.error("[STUDENT_ACTION_ERROR] getStudentHistory error:", err);
        return [];
      }),
      portalRepo.getStudentReminders(studentId).catch((err) => {
        console.error("[STUDENT_ACTION_ERROR] getStudentReminders error:", err);
        return [];
      })
    ]);

    return { history, reminders };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[STUDENT_ACTION_ERROR] Failed loading activity history:", msg);
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

export async function uploadStudentDocumentAction(
  jwt: string,
  documentType: "passport" | "visa" | "efrro",
  filename: string,
  fileBase64: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const studentId = await verifyUserAndGetStudentId(jwt);
    const fileBuffer = Buffer.from(fileBase64, "base64");

    if (documentType === "efrro") {
      await portalService.uploadEfrroDocument(
        studentId,
        filename,
        fileBuffer,
        ipAddress,
        userAgent
      );
    } else {
      await portalRepo.logActivity(studentId, `UPLOAD_${documentType.toUpperCase()}`, ipAddress, userAgent, { filename });
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function updateStudentPasswordAction(
  jwt: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      throw new Error("Authentication failed.");
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
