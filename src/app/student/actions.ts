"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { StudentPortalService } from "@/domain/student-portal/services/student-portal.service";
import { SupabaseStudentPortalRepository } from "@/domain/student-portal/repositories/student-portal.repository";
import { StudentOtpService } from "@/domain/student-portal/services/student-otp.service";
import { isStudentPortalEnabled } from "@/config/feature-flags";
import { 
  StudentPortalProfile, 
  StudentHistoryRow, 
  StudentReminderHistoryRow 
} from "@/domain/student-portal/types";

const portalRepo = new SupabaseStudentPortalRepository();
const portalService = new StudentPortalService();
const otpService = new StudentOtpService();

const MAINTENANCE_MESSAGE = "The Student Portal is currently unavailable while final testing and verification are being completed. Please contact the International Student Office if you require immediate assistance.";

/**
 * Helper to cryptographically verify user JWT and retrieve student association ID
 */
async function verifyUserAndGetStudentId(jwt: string): Promise<string> {
  if (!isStudentPortalEnabled()) {
    throw new Error(MAINTENANCE_MESSAGE);
  }

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

/**
 * Server action: Request a 6-digit WhatsApp OTP by Registration / Enrollment Number
 */
export async function requestStudentWhatsAppOtpByIdentifierAction(
  rawIdentifier: string,
  turnstileToken: string | null
): Promise<{
  success: boolean;
  registrationNumber?: string;
  maskedPhone?: string;
  cooldownSeconds?: number;
  error?: string;
}> {
  try {
    if (!isStudentPortalEnabled()) {
      return { success: false, error: MAINTENANCE_MESSAGE };
    }

    if (!turnstileToken) {
      return { success: false, error: "Please complete the security check." };
    }

    if (!rawIdentifier || rawIdentifier.trim().length < 3) {
      return { success: false, error: "Please enter a valid Registration / Enrollment Number." };
    }

    return await otpService.generateAndSendOtpByIdentifier(rawIdentifier.trim());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[STUDENT_OTP_ACTION_ERROR] OTP generation failed:", msg);
    return { success: false, error: "Unable to send verification code. Please try again." };
  }
}

/**
 * Server action: Verify 6-digit WhatsApp OTP bound to Registration / Enrollment Number
 */
export async function verifyStudentWhatsAppOtpByIdentifierAction(
  rawIdentifier: string,
  otpCode: string,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<{
  success: boolean;
  studentId?: string;
  magicLink?: string;
  error?: string;
}> {
  try {
    if (!isStudentPortalEnabled()) {
      return { success: false, error: MAINTENANCE_MESSAGE };
    }

    if (!rawIdentifier || !otpCode) {
      return { success: false, error: "Registration Number and verification code are required." };
    }

    const verification = await otpService.verifyOtpByIdentifier(
      rawIdentifier.trim(),
      otpCode.trim(),
      ipAddress,
      userAgent
    );

    if (!verification.success || !verification.studentId || !verification.studentEmail) {
      return { success: false, error: verification.error || "Verification failed." };
    }

    // Generate Supabase Auth Magic Link or session for verified student
    const adminSupabase = getAdminSupabase();
    
    // Ensure auth user exists for this student
    const { data: userList } = await adminSupabase.auth.admin.listUsers();
    let authUser = userList.users.find(
      u => u.email?.toLowerCase() === verification.studentEmail!.toLowerCase() ||
           u.user_metadata?.student_id === verification.studentId
    );

    if (!authUser) {
      const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email: verification.studentEmail,
        email_confirm: true,
        user_metadata: {
          role: "student",
          student_id: verification.studentId
        }
      });
      if (createError || !newUser.user) {
        throw new Error(`Failed to create authenticated student identity: ${createError?.message}`);
      }
      authUser = newUser.user;
    } else {
      await adminSupabase.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
          ...authUser.user_metadata,
          role: "student",
          student_id: verification.studentId
        }
      });
    }

    // Generate session magic link for instant client sign in
    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type: "magiclink",
      email: verification.studentEmail
    });

    if (linkError || !linkData?.properties?.action_link) {
      throw new Error(`Failed to establish session: ${linkError?.message}`);
    }

    return {
      success: true,
      studentId: verification.studentId,
      magicLink: linkData.properties.action_link
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[STUDENT_OTP_ACTION_ERROR] OTP verification failed:", msg);
    return { success: false, error: msg };
  }
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
