"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { StudentPortalService } from "@/domain/student-portal/services/student-portal.service";
import { SupabaseStudentPortalRepository } from "@/domain/student-portal/repositories/student-portal.repository";
import { StudentOtpService } from "@/domain/student-portal/services/student-otp.service";
import { isStudentPortalTestMode } from "@/config/feature-flags";
import { 
  StudentPortalProfile, 
  StudentHistoryRow, 
  StudentReminderHistoryRow 
} from "@/domain/student-portal/types";

const portalRepo = new SupabaseStudentPortalRepository();
const portalService = new StudentPortalService();
const otpService = new StudentOtpService();

const MOCK_DEMO_STUDENT_PROFILE: StudentPortalProfile = {
  studentId: "demo-student-id-101",
  fullName: "Alexander Wright",
  registrationNumber: "NFSU/2026/FS/1089",
  programme: "B.Tech in Cyber Security & Forensic Science",
  school: "School of Cyber Security & Digital Forensics",
  nationality: "United Kingdom",
  email: "alexander.w@nfsu.ac.in",
  phoneHome: "+44 20 7946 0912",
  phoneLocal: "+91 98765 43210",
  overallCompliance: "COMPLIANT",
  passportNumber: "UK78945612",
  passportExpiry: "2029-10-15",
  passportStatus: "APPROVED",
  passportUploadDate: "2026-08-01",
  visaNumber: "IND9876543",
  visaType: "Student Visa (S-1)",
  visaExpiry: "2027-07-31",
  visaStatus: "APPROVED",
  visaUploadDate: "2026-08-01",
  efrroStatus: "COMPLIANT",
  efrroExpiry: "2027-07-31",
  efrroNumber: "FRRO/AHM/2026/9012",
  efrroUploadDate: "2026-08-02",
  daysRemaining: 360,
  lastUploadDate: "2026-08-02"
};

const MOCK_DEMO_HISTORY: StudentHistoryRow[] = [
  {
    versionId: "hist-1",
    documentType: "efrro",
    filename: "eFRRO_Certificate_Alexander_Wright.pdf",
    uploadDate: "2026-08-02",
    verificationStatus: "APPROVED",
    reviewerComments: "Verified by Compliance Officer",
    reviewedAt: "2026-08-02"
  },
  {
    versionId: "hist-2",
    documentType: "visa",
    filename: "Student_Visa_Page.pdf",
    uploadDate: "2026-08-01",
    verificationStatus: "APPROVED",
    reviewerComments: "Valid Student Visa S-1",
    reviewedAt: "2026-08-01"
  },
  {
    versionId: "hist-3",
    documentType: "passport",
    filename: "Passport_Bio_Page.pdf",
    uploadDate: "2026-08-01",
    verificationStatus: "APPROVED",
    reviewerComments: "Valid UK Passport",
    reviewedAt: "2026-08-01"
  }
];

const MOCK_DEMO_REMINDERS: StudentReminderHistoryRow[] = [
  {
    id: "rem-1",
    channel: "WHATSAPP",
    sentAt: "2026-08-03T09:00:00Z",
    triggerSource: "SYSTEM_CRON",
    status: "DELIVERED"
  },
  {
    id: "rem-2",
    channel: "EMAIL",
    sentAt: "2026-08-03T09:00:00Z",
    triggerSource: "SYSTEM_CRON",
    status: "DELIVERED"
  }
];

/**
 * Helper to cryptographically verify user JWT and retrieve student association ID.
 * In Test Mode, returns a fallback demo student ID if unauthenticated.
 */
async function verifyUserAndGetStudentId(jwt: string): Promise<string> {
  const isTestMode = isStudentPortalTestMode();

  if (!jwt || jwt === "test_token" || jwt === "mock") {
    if (isTestMode) return MOCK_DEMO_STUDENT_PROFILE.studentId;
  }

  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(jwt);

    if ((error || !user) && isTestMode) {
      return MOCK_DEMO_STUDENT_PROFILE.studentId;
    }

    if (!user) {
      throw new Error("Authentication failed: Invalid session or JWT token.");
    }

    const role = user.user_metadata?.role;
    const studentId = user.user_metadata?.student_id;

    if (role !== "student" || !studentId) {
      if (isTestMode) return MOCK_DEMO_STUDENT_PROFILE.studentId;
      throw new Error("Authorization failed: Access restricted to students only.");
    }

    return studentId;
  } catch (err) {
    if (isTestMode) return MOCK_DEMO_STUDENT_PROFILE.studentId;
    throw err;
  }
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
    if (!turnstileToken && !isStudentPortalTestMode()) {
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
      return { success: false, error: verification.error || "Invalid or expired verification code." };
    }

    const adminSupabase = (await import("@/lib/supabase/admin")).getAdminSupabase();
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

    return { 
      profile: profile || (isStudentPortalTestMode() ? MOCK_DEMO_STUDENT_PROFILE : null), 
      history: history.length > 0 ? history : (isStudentPortalTestMode() ? MOCK_DEMO_HISTORY : []), 
      reminders: reminders.length > 0 ? reminders : (isStudentPortalTestMode() ? MOCK_DEMO_REMINDERS : []) 
    };
  } catch (err: unknown) {
    if (isStudentPortalTestMode()) {
      return {
        profile: MOCK_DEMO_STUDENT_PROFILE,
        history: MOCK_DEMO_HISTORY,
        reminders: MOCK_DEMO_REMINDERS
      };
    }
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

    return { 
      history: history.length > 0 ? history : (isStudentPortalTestMode() ? MOCK_DEMO_HISTORY : []), 
      reminders: reminders.length > 0 ? reminders : (isStudentPortalTestMode() ? MOCK_DEMO_REMINDERS : []) 
    };
  } catch (err: unknown) {
    if (isStudentPortalTestMode()) {
      return {
        history: MOCK_DEMO_HISTORY,
        reminders: MOCK_DEMO_REMINDERS
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[STUDENT_ACTION_ERROR] Failed loading activity history:", msg);
    throw new Error(msg);
  }
}

export async function fetchStudentProfile(jwt: string): Promise<StudentPortalProfile | null> {
  try {
    const studentId = await verifyUserAndGetStudentId(jwt);
    const profile = await portalRepo.getStudentProfile(studentId);
    return profile || (isStudentPortalTestMode() ? MOCK_DEMO_STUDENT_PROFILE : null);
  } catch (err: unknown) {
    if (isStudentPortalTestMode()) {
      return MOCK_DEMO_STUDENT_PROFILE;
    }
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
    if (isStudentPortalTestMode()) {
      return { success: true };
    }
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
    if (isStudentPortalTestMode()) {
      return { success: true };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
