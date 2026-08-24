export interface StudentPortalProfile {
  studentId: string;
  fullName: string;
  registrationNumber: string;
  programme: string;
  school: string;
  nationality: string;
  email: string;
  phoneHome: string;
  phoneLocal: string;
  avatarUrl?: string | null;
  admissionCategory?: string | null;
  iccrApplicationNumber?: string | null;
  
  // Overall Status
  overallCompliance: "COMPLIANT" | "ATTENTION_REQUIRED";

  // Passport Info
  passportNumber?: string | null;
  passportExpiry?: string | null;
  passportDaysRemaining?: number | null;
  passportStatus: "APPROVED" | "PENDING_VERIFICATION" | "REJECTED" | "EXPIRED" | "NOT_SUBMITTED";
  passportRemarks?: string | null;
  passportUploadDate?: string | null;

  // Visa Info
  visaNumber?: string | null;
  visaType?: string | null;
  visaExpiry?: string | null;
  visaDaysRemaining?: number | null;
  visaStatus: "APPROVED" | "PENDING_VERIFICATION" | "REJECTED" | "EXPIRED" | "NOT_SUBMITTED";
  visaRemarks?: string | null;
  visaUploadDate?: string | null;

  // eFRRO Info
  efrroStatus: "COMPLIANT" | "WARNING" | "EXPIRED" | "PENDING_VERIFICATION" | "REJECTED" | "NOT_SUBMITTED";
  efrroExpiry: string | null;
  efrroNumber?: string | null;
  efrroRemarks?: string | null;
  efrroUploadDate?: string | null;
  daysRemaining: number | null;
  efrroDaysRemaining?: number | null;

  // Real-time Upload Eligibility States
  passportEligibility?: import("@/domain/compliance/services/upload-eligibility.service").DocumentUploadEligibilityResult;
  visaEligibility?: import("@/domain/compliance/services/upload-eligibility.service").DocumentUploadEligibilityResult;
  efrroEligibility?: import("@/domain/compliance/services/upload-eligibility.service").DocumentUploadEligibilityResult;

  lastUploadDate: string | null;
}

export interface StudentNotificationItem {
  id: string;
  title: string;
  message: string;
  type: "approval" | "rejection" | "reminder" | "alert" | "system";
  read: boolean;
  timestamp: string;
}

export interface StudentDocumentDownload {
  type: "passport" | "visa" | "efrro";
  title: string;
  filename: string;
  fileUrl: string;
  uploadDate: string;
  status: string;
}

export interface UploadToken {
  id: string;
  studentId: string;
  purpose: "UPLOAD" | "LOGIN" | "PASSWORDLESS_LOGIN";
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
}

export interface StudentActivityLog {
  id: string;
  studentId: string;
  action: string;
  timestamp: Date;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown>;
}

export interface UploadAuditLog {
  id: string;
  studentId: string;
  filename: string;
  fileSize: number;
  checksum: string;
  status: "success" | "failed_size" | "failed_type" | "failed_virus" | "failed_duplicate" | "blocked_locked";
  timestamp: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface StudentHistoryRow {
  versionId: string;
  documentType?: "passport" | "visa" | "efrro";
  filename: string;
  uploadDate: string;
  verificationStatus: string;
  reviewerComments: string | null;
  reviewedAt: string | null;
}

export interface StudentReminderHistoryRow {
  id: string;
  documentType?: "passport" | "visa" | "efrro";
  channel: string;
  sentAt: string;
  triggerSource: string;
  status: string;
  details?: Record<string, unknown>;
}
