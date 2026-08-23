"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { StudentPortalService } from "@/domain/student-portal/services/student-portal.service";
import { SupabaseStudentPortalRepository } from "@/domain/student-portal/repositories/student-portal.repository";
import { StudentOtpService } from "@/domain/student-portal/services/student-otp.service";
import { isStudentPortalTestMode } from "@/config/feature-flags";
import { getRequestOrigin } from "@/config/app-url";
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
  passportEligibility: {
    canUpload: false,
    reasonCode: "OUTSIDE_WINDOW",
    documentType: "passport",
    userTitle: "Document Verified",
    userMessage: "Your current PASSPORT is valid until 15 Oct 2029. Direct upload is disabled for verified documents. Please submit a replacement request to unlock the upload window.",
    expiryDate: "2029-10-15",
    uploadWindowOpensDate: "2029-09-15",
    daysUntilWindowOpens: 1125,
    daysUntilExpiry: 1155,
    isPendingReview: false,
    isFirstUpload: false,
    activeReplacementRequest: null
  },
  visaNumber: "IND9876543",
  visaType: "Student Visa (S-1)",
  visaExpiry: "2027-07-31",
  visaStatus: "APPROVED",
  visaUploadDate: "2026-08-01",
  visaEligibility: {
    canUpload: false,
    reasonCode: "OUTSIDE_WINDOW",
    documentType: "visa",
    userTitle: "Document Verified",
    userMessage: "Your current VISA is valid until 31 Jul 2027. Direct upload is disabled for verified documents. Please submit a replacement request to unlock the upload window.",
    expiryDate: "2027-07-31",
    uploadWindowOpensDate: "2027-07-01",
    daysUntilWindowOpens: 319,
    daysUntilExpiry: 349,
    isPendingReview: false,
    isFirstUpload: false,
    activeReplacementRequest: null
  },
  efrroStatus: "COMPLIANT",
  efrroExpiry: "2027-07-31",
  efrroNumber: "FRRO/AHM/2026/9012",
  efrroUploadDate: "2026-08-02",
  efrroEligibility: {
    canUpload: false,
    reasonCode: "OUTSIDE_WINDOW",
    documentType: "efrro",
    userTitle: "Document Verified",
    userMessage: "Your current EFRRO is valid until 31 Jul 2027. Direct upload is disabled for verified documents. Please submit a replacement request to unlock the upload window.",
    expiryDate: "2027-07-31",
    uploadWindowOpensDate: "2027-07-01",
    daysUntilWindowOpens: 319,
    daysUntilExpiry: 349,
    isPendingReview: false,
    isFirstUpload: false,
    activeReplacementRequest: null
  },
  daysRemaining: 349,
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
    channel: "WHATSAPP",
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
 * Server action: Login student directly using University Enrollment Number or Passport Number
 * Used for v0.2.0 when OTP verification is disabled.
 */
export async function loginStudentByIdentifierAction(
  rawIdentifier: string,
  turnstileToken: string | null,
  ipAddress?: string | null,
  userAgent?: string | null,
  baseUrl?: string | null
): Promise<{
  success: boolean;
  studentId?: string;
  studentName?: string;
  registrationNumber?: string;
  email?: string;
  tokenHash?: string;
  emailOtp?: string;
  magicLink?: string;
  error?: string;
}> {
  try {
    if (!turnstileToken && !isStudentPortalTestMode() && Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim())) {
      return { success: false, error: "Please complete the security check." };
    }

    if (!rawIdentifier || rawIdentifier.trim().length < 2) {
      return { success: false, error: "Please enter your Enrollment Number or Passport Number." };
    }

    const resolvedBaseUrl = await getRequestOrigin(baseUrl);
    const { StudentPortalAuthService } = await import("@/domain/student-portal/services/student-portal-auth.service");
    return await StudentPortalAuthService.authenticateByIdentifier(rawIdentifier.trim(), {
      ipAddress,
      userAgent,
      baseUrl: resolvedBaseUrl
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[STUDENT_IDENTIFIER_LOGIN_ERROR]", msg);
    return { success: false, error: "Unable to authenticate. Please check your credentials or try again later." };
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
  userAgent?: string | null,
  baseUrl?: string | null
): Promise<{
  success: boolean;
  studentId?: string;
  tokenHash?: string;
  emailOtp?: string;
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

    const resolvedBaseUrl = await getRequestOrigin(baseUrl);
    const targetRedirect = `${resolvedBaseUrl}/student/dashboard`;

    const adminSupabase = (await import("@/lib/supabase/admin")).getAdminSupabase();

    // Bootstrap or align student auth user metadata and user_profiles prior to link generation
    try {
      const { data: userList } = await adminSupabase.auth.admin.listUsers();
      const existingUser = userList?.users?.find(
        (u) => u.email?.toLowerCase() === verification.studentEmail!.toLowerCase()
      );

      if (!existingUser) {
        const { data: newUser } = await adminSupabase.auth.admin.createUser({
          email: verification.studentEmail,
          email_confirm: true,
          user_metadata: {
            role: "student",
            student_id: verification.studentId,
          },
        });
        if (newUser?.user?.id) {
          await adminSupabase.from("user_profiles").upsert(
            {
              id: newUser.user.id,
              email: verification.studentEmail,
              role: "student",
              is_profile_complete: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
        }
      } else if (
        existingUser.user_metadata?.student_id !== verification.studentId ||
        existingUser.user_metadata?.role !== "student"
      ) {
        await adminSupabase.auth.admin.updateUserById(existingUser.id, {
          user_metadata: {
            ...existingUser.user_metadata,
            role: "student",
            student_id: verification.studentId,
          },
        });
        await adminSupabase.from("user_profiles").upsert(
          {
            id: existingUser.id,
            email: verification.studentEmail,
            role: "student",
            is_profile_complete: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      }
    } catch (bootstrapErr) {
      console.warn("[STUDENT_OTP_BOOTSTRAP_WARN]", bootstrapErr);
    }

    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type: "magiclink",
      email: verification.studentEmail,
      options: {
        redirectTo: targetRedirect
      }
    });

    if (linkError || !linkData?.properties) {
      throw new Error(`Failed to establish session: ${linkError?.message}`);
    }

    return {
      success: true,
      studentId: verification.studentId,
      tokenHash: linkData.properties.hashed_token,
      emailOtp: linkData.properties.email_otp,
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
    console.log(`[STUDENT_ACTION] Loading dashboard profile for student: ${studentId}`);

    const profile = await portalRepo.getStudentProfile(studentId).catch(() => null);

    return { 
      profile: profile || (isStudentPortalTestMode() ? MOCK_DEMO_STUDENT_PROFILE : null), 
      history: isStudentPortalTestMode() ? MOCK_DEMO_HISTORY : [], 
      reminders: isStudentPortalTestMode() ? MOCK_DEMO_REMINDERS : [] 
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

export async function fetchDocumentUploadEligibilityAction(
  jwt: string,
  documentType: "passport" | "visa" | "efrro"
) {
  try {
    const studentId = await verifyUserAndGetStudentId(jwt);
    const { canStudentUploadDocument } = await import("@/domain/compliance/services/upload-eligibility.service");
    return await canStudentUploadDocument(studentId, documentType);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ELIGIBILITY_ACTION_ERROR] Failed to fetch eligibility for ${documentType}:`, msg);
    return null;
  }
}

export async function fetchDocumentUploadLimitAction(): Promise<{
  maxUploadSizeBytes: number;
  maxUploadSizeMb: number;
  maxUploadSizeLabel: string;
}> {
  const { systemConfigService } = await import("@/lib/system-config");
  const maxUploadSizeBytes = await systemConfigService.getMaxUploadSizeBytes();
  const maxUploadSizeMb = Math.round(maxUploadSizeBytes / (1024 * 1024));
  return {
    maxUploadSizeBytes,
    maxUploadSizeMb,
    maxUploadSizeLabel: `${maxUploadSizeMb} MB`,
  };
}

export async function fetchAllDocumentUploadEligibilityAction(jwt: string) {
  try {
    const studentId = await verifyUserAndGetStudentId(jwt);
    const { DocumentUploadEligibilityEngine } = await import("@/domain/compliance/services/upload-eligibility.service");
    const { systemConfigService } = await import("@/lib/system-config");
    const [eligibilityAll, maxUploadSizeBytes] = await Promise.all([
      DocumentUploadEligibilityEngine.evaluateAllEligibility(studentId),
      systemConfigService.getMaxUploadSizeBytes()
    ]);
    const maxUploadSizeMb = Math.round(maxUploadSizeBytes / (1024 * 1024));
    return { 
      passport: eligibilityAll.passport, 
      visa: eligibilityAll.visa, 
      efrro: eligibilityAll.efrro, 
      maxUploadSizeBytes, 
      maxUploadSizeMb, 
      maxUploadSizeLabel: `${maxUploadSizeMb} MB` 
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ELIGIBILITY_ACTION_ERROR] Failed to fetch all eligibility:", msg);
    return null;
  }
}

export async function uploadEfrro(
  jwt: string,
  filename: string,
  fileBase64: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<{ success: boolean; versionId?: string; versionNumber?: number; error?: string }> {
  return uploadStudentDocumentAction(jwt, "efrro", filename, fileBase64, ipAddress, userAgent);
}

export async function uploadStudentDocumentAction(
  jwt: string,
  documentType: "passport" | "visa" | "efrro",
  filename: string,
  fileBase64: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<{ success: boolean; versionId?: string; versionNumber?: number; error?: string }> {
  try {
    const studentId = await verifyUserAndGetStudentId(jwt);
    const fileBuffer = Buffer.from(fileBase64, "base64");

    // CRITICAL: Server-authoritative eligibility check BEFORE invoking portal service
    const { canStudentUploadDocument } = await import("@/domain/compliance/services/upload-eligibility.service");
    const eligibility = await canStudentUploadDocument(studentId, documentType);
    if (!eligibility.canUpload) {
      return {
        success: false,
        error: `Your ${documentType.toUpperCase()} upload is currently locked. A replacement request or an active upload window is required before a new document can be uploaded.`
      };
    }

    const res = await portalService.uploadDocument(
      studentId,
      documentType,
      filename,
      fileBuffer,
      ipAddress,
      userAgent
    );

    return { 
      success: true, 
      versionId: res.versionId, 
      versionNumber: res.versionNumber 
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Server action: Submit an early document replacement request
 */
export async function submitDocumentReplacementRequestAction(
  jwt: string,
  input: {
    documentType: "passport" | "visa" | "efrro";
    reason: import("@/domain/compliance/services/replacement-request.service").DocumentReplacementReason;
    reasonDetails: string;
  }
): Promise<{ success: boolean; request?: import("@/domain/compliance/services/replacement-request.service").DocumentReplacementRequestRecord; error?: string }> {
  try {
    const studentId = await verifyUserAndGetStudentId(jwt);
    const { DocumentReplacementRequestService } = await import("@/domain/compliance/services/replacement-request.service");

    return await DocumentReplacementRequestService.submitRequest(studentId, input);
  } catch (err: unknown) {
    if (isStudentPortalTestMode()) {
      return {
        success: true,
        request: {
          id: "mock-req-001",
          studentId: "mock-student-id",
          documentType: input.documentType,
          currentDocumentVersion: 1,
          currentExpiryDate: "2026-12-20",
          reason: input.reason,
          reasonDetails: input.reasonDetails,
          status: "pending",
          submittedAt: new Date().toISOString(),
          reviewedBy: null,
          reviewedAt: null,
          rejectionReason: null,
          authorizationId: null,
          authorizationExpiresAt: null,
          completedAt: null,
          completedVersionId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Server action: Fetch all replacement requests submitted by authenticated student
 */
export async function fetchStudentReplacementRequestsAction(
  jwt: string
): Promise<import("@/domain/compliance/services/replacement-request.service").DocumentReplacementRequestRecord[]> {
  try {
    const studentId = await verifyUserAndGetStudentId(jwt);
    const { DocumentReplacementRequestService } = await import("@/domain/compliance/services/replacement-request.service");

    return await DocumentReplacementRequestService.listStudentRequests(studentId);
  } catch (err: unknown) {
    console.error("[FETCH_STUDENT_REPLACEMENT_REQUESTS_ERROR]", err);
    return [];
  }
}

/**
 * Server action: Cancel a pending replacement request
 */
export async function cancelDocumentReplacementRequestAction(
  jwt: string,
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const studentId = await verifyUserAndGetStudentId(jwt);
    const { DocumentReplacementRequestService } = await import("@/domain/compliance/services/replacement-request.service");

    return await DocumentReplacementRequestService.cancelRequest(requestId, studentId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Server action: Securely get presigned URL for a student's own uploaded document version
 * Strict RBAC: Student can ONLY view/download documents attached to their own verified studentId.
 */
export async function getStudentDocumentDownloadUrlAction(
  jwt: string,
  documentType: "passport" | "visa" | "efrro",
  versionId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const studentId = await verifyUserAndGetStudentId(jwt);
    if (!studentId) {
      return { success: false, error: "Authentication required." };
    }

    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const { StorageProviderFactory } = await import("@/domain/storage/factory");
    const adminSupabase = getAdminSupabase();

    const tableName = documentType === "passport" 
      ? "passport_versions" 
      : documentType === "visa" 
      ? "visa_versions" 
      : "efrro_versions";

    const { data: ver, error: verErr } = await adminSupabase
      .from(tableName)
      .select("id, student_id, file_path")
      .eq("id", versionId)
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .maybeSingle();

    if (verErr || !ver) {
      return { success: false, error: "Document version not found or access denied." };
    }

    const cleanPath = ver.file_path?.trim();
    if (!cleanPath || cleanPath === "pending_upload" || cleanPath === "null") {
      return { success: false, error: "No physical copy has been uploaded for this document record." };
    }

    const storage = StorageProviderFactory.getProvider();
    const exists = await storage.fileExists("iscms-documents", cleanPath);
    if (!exists) {
      return { success: false, error: "The requested document file could not be located in storage." };
    }

    const signedUrl = await storage.generateSignedUrl("iscms-documents", cleanPath, 300);

    // Log student activity
    await portalRepo.logActivity(
      studentId,
      `VIEWED_${documentType.toUpperCase()}_DOCUMENT`,
      null,
      null,
      { versionId, filePath: cleanPath }
    ).catch(() => null);

    return { success: true, url: signedUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}


